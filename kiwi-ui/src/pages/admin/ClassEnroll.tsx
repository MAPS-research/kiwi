import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  InputAdornment,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import {
  PersonAddOutlined as PersonAddIcon,
  DeleteOutlined as DeleteIcon,
  SearchOutlined as SearchIcon,
  EmailOutlined as EmailIcon
} from "@mui/icons-material";
import * as React from "react";
import { useLocation, useParams } from "react-router-dom";
import type { Student } from "../../services/models/Student.ts";
import apiClient from "../../utils/api.ts";
import { PendingUser } from "../../services/index.ts";
import { EmailSelectedUsersDialog } from "../../components/Email/EmailSelectedUsersDialog.tsx";
import {
  AdminPage,
  AdminPageHeader,
  AdminTablePagination,
  AdminToast,
  DisabledReason,
  TruncatedText,
  countNoun,
  formatCount,
  type AdminToastSeverity,
} from "../../components/AdminPage/index.ts";
import EmptyState from "../../components/EmptyState/EmptyState.tsx";
import StatusChip from "../../components/StatusChip/StatusChip.tsx";

const PAGE_TITLE = "Enroll students";
const PAGE_DESCRIPTION = "Add students, review pending enrollments, and manage the class roster.";

/** Rows per page of the roster. */
const PAGE_SIZE = 15;

/** The role column's width: the widest role chip ("Instructor") and its cell padding. */
const ROLE_COLUMN_WIDTH = 128;

interface EnrolledUser {
  id: string;
  email: string;
  role: 'admin' | 'student' | 'professor';
  status: 'active' | 'pending';
  userId?: string; // For active users
}

/** The neutral role chip's word; any other role reads as a student, as before. */
const roleLabel = (role: EnrolledUser["role"]) =>
  role === "admin" ? "Admin" : role === "professor" ? "Instructor" : "Student";

/** Text cells are one line; the email cell truncates with its full text on hover and focus. */
const textCellSx = {
  py: 0,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
} as const;

/** One row across the table that holds a frame (empty, no results, error) instead of rows. */
const FrameRow = ({ children }: { children: React.ReactNode }) => (
  <TableRow>
    <TableCell colSpan={4} sx={{ py: "var(--space-5)", px: "var(--table-cell-x)", whiteSpace: "normal" }}>
      {children}
    </TableCell>
  </TableRow>
);

export const ClassEnroll: React.FC = () => {
  const { classID } = useParams<{ classID: string }>();

  if (!classID) {
    return (
      <AdminPage maxWidth="md">
        <AdminPageHeader title={PAGE_TITLE} description={PAGE_DESCRIPTION} />
        <Alert severity="error">
          Couldn't open enrollment. The link has no class. Choose a class from the class switcher.
        </Alert>
      </AdminPage>
    );
  }

  // Keyed by class: switching class starts from the loading state, with no rows or
  // ticks carried over from the previous class.
  return <ClassEnrollRoster key={classID} classID={classID} />;
};

const ClassEnrollRoster = ({ classID }: { classID: string }) => {
  const location = useLocation();
  const classNameFromNav = (location.state as { className?: string } | null)?.className?.trim();

  // The class's name: the alert waits for it rather than showing the class id.
  const [className, setClassName] = React.useState<string | null>(classNameFromNav || null);
  const [classNameLoading, setClassNameLoading] = React.useState(!classNameFromNav);

  const [enrollEmails, setEnrollEmails] = React.useState("");
  const [toastOpen, setToastOpen] = React.useState(false);
  const [toast, setToast] = React.useState<{ severity: AdminToastSeverity; message: string }>({
    severity: "success",
    message: "",
  });
  const [emailDialogOpen, setEmailDialogOpen] = React.useState(false);

  const [allUsers, setAllUsers] = React.useState<EnrolledUser[]>([]);
  const [rosterStatus, setRosterStatus] = React.useState<"loading" | "ready" | "error">("loading");
  const [selectedUsers, setSelectedUsers] = React.useState<string[]>([]);

  // Search and pagination
  const [searchQuery, setSearchQuery] = React.useState("");
  const [currentPage, setCurrentPage] = React.useState(1);
  const rosterHeadingId = React.useId();

  const showToast = (severity: AdminToastSeverity, message: string) => {
    setToast({ severity, message });
    setToastOpen(true);
  };

  // Filter and paginate combined users
  const matchingUsers = allUsers.filter((user) =>
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const pageCount = Math.max(1, Math.ceil(matchingUsers.length / PAGE_SIZE));
  const page = Math.min(currentPage, pageCount);
  const pageUsers = matchingUsers.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const activeCount = allUsers.filter((user) => user.status === 'active').length;
  const pendingCount = allUsers.filter((user) => user.status === 'pending').length;
  const selectedCount = selectedUsers.length;
  const nothingSelected = selectedCount === 0;

  // The header checkbox follows the rows on this page: none, some (mixed) or all.
  const visibleIds = pageUsers.map((user) => user.id);
  const selectedVisibleCount = visibleIds.filter((id) => selectedUsers.includes(id)).length;
  const allVisibleSelected = visibleIds.length > 0 && selectedVisibleCount === visibleIds.length;
  const someVisibleSelected = selectedVisibleCount > 0 && !allVisibleSelected;

  const handleSelectUser = (userId: string) => {
    setSelectedUsers((prevSelected) =>
      prevSelected.includes(userId) ? prevSelected.filter((id) => id !== userId) : [...prevSelected, userId]
    );
  };

  const handleSelectAll = () => {
    setSelectedUsers(allVisibleSelected ? [] : visibleIds);
  };

  const handleDeleteSelected = async () => {
    // Unavailable while nothing is selected; the button says why.
    if (nothingSelected) return;

    // Separate active and pending users
    const selectedActiveUsers = selectedUsers.filter(id => {
      const user = allUsers.find(u => u.id === id);
      return user?.status === 'active';
    });

    const selectedPendingUsers = selectedUsers.filter(id => {
      const user = allUsers.find(u => u.id === id);
      return user?.status === 'pending';
    });

    try {
      // Delete active users if any selected
      if (selectedActiveUsers.length > 0) {
        await apiClient.classControllerDelete({
          classEnrollDeleteRequest: { classId: classID, studentIds: selectedActiveUsers }
        });
      }

      // Delete pending users if any selected
      if (selectedPendingUsers.length > 0) {
        await apiClient.classControllerDeletePendingUsers({
          classDeletePendingEnrollmentRequest: { classId: classID, pendingUserIds: selectedPendingUsers }
        });
      }

      showToast("success", `${countNoun(selectedUsers.length, "user")} removed from the roster`);

      // Remove deleted users from state
      setAllUsers(allUsers.filter(user => !selectedUsers.includes(user.id)));
      setSelectedUsers([]);
    } catch (error) {
      showToast(
        "error",
        "Couldn't remove everyone you selected. The server didn't respond as expected, and some may already be removed. Refresh the roster, then try again."
      );
    }
  };

  const handleEnroll = async () => {
    const validEmails = enrollEmails.split("\n").map(email => email.trim()).filter(email => email !== "");

    if (validEmails.length === 0) {
      showToast("error", "No email addresses entered. Enter at least one, one per line.");
      return;
    }

    try {
      const res = await apiClient.classControllerEnroll({
        classEnrollRequest: { classId: classID, studentEmails: validEmails }
      });

      if (res) {
        showToast("success", "Added to the roster");
        setEnrollEmails("");

        // Refresh the user list and auto-select newly added users
        await fetchAllUsers(validEmails);
      }
    } catch (error: any) {
      console.error("Error enrolling users:", error);
      if (String(error?.message ?? "").includes("ConflictException")) {
        showToast(
          "error",
          "Couldn't enroll some addresses. Some are already on the roster. Your changes are still in the form. Remove them from the list and try again."
        );
      } else {
        showToast(
          "error",
          "Couldn't enroll the addresses. The server didn't respond as expected. Your changes are still in the form. Check the addresses and try again."
        );
      }
    }
  };
  // Fetch all users (active and pending) and combine them
  const fetchAllUsers = async (emailsToAutoSelect?: string[]) => {
    try {
      // Fetch active users
      const rosterRes = await apiClient.classControllerRoster({
        classRosterRequest: { classId: classID }
      });

      // Fetch pending users
      const pendingRes = await apiClient.classControllerGetPendingEnrollment({
        classPendingEnrollmentRequest: { classId: classID }
      });

      // Combine all users into a single array
      const combinedUsers: EnrolledUser[] = [
        // Add active users
        ...rosterRes.users.map((user: Student) => ({
          id: user.userId,
          email: user.email,
          role: user.role as 'admin' | 'student' | 'professor',
          status: 'active' as const,
          userId: user.userId
        })),
        // Add pending users
        ...pendingRes.pendingUsers.map((user: PendingUser) => ({
          id: user.id,
          email: user.userEmail,
          role: user.role as 'admin' | 'student' | 'professor',
          status: 'pending' as const
        }))
      ];

      setAllUsers(combinedUsers);
      setRosterStatus("ready");

      // Auto-select newly added users if emails were provided
      if (emailsToAutoSelect && emailsToAutoSelect.length > 0) {
        const newUserIds = combinedUsers
          .filter(user => emailsToAutoSelect.includes(user.email))
          .map(user => user.id);

        if (newUserIds.length > 0) {
          setSelectedUsers(newUserIds);
        }
      }
    } catch (error) {
      console.error("Error fetching users:", error);
      // The table's body slot states the failure (DESIGN.md, Tables: error).
      setRosterStatus("error");
    }
  };

  const fetchClassInfo = async () => {
    try {
      const classEntry = await apiClient.classControllerGetById({ classID });
      setClassName(classEntry.className?.trim() || "Untitled class");
    } catch (error) {
      console.error("Error fetching class info:", error);
      // Keep the name from navigation, if any; never fall back to the class id.
    } finally {
      setClassNameLoading(false);
    }
  };

  React.useEffect(() => {
    fetchClassInfo();
    fetchAllUsers();
  }, [classID]);

  const trimmedQuery = searchQuery.trim();

  const renderRosterBody = () => {
    if (rosterStatus === "loading") {
      // Skeleton rows hold the slot until the roster settles; the empty frame never flashes.
      return Array.from({ length: 3 }, (_, index) => (
        <TableRow key={`loading-${index}`}>
          <TableCell padding="checkbox" sx={{ py: 0 }}>
            <Skeleton
              variant="rounded"
              sx={{ width: "var(--checkbox-size)", height: "var(--checkbox-size)", borderRadius: "var(--checkbox-radius)" }}
            />
          </TableCell>
          <TableCell sx={textCellSx}>
            <Skeleton variant="text" width="60%" />
          </TableCell>
          <TableCell sx={textCellSx}>
            <Skeleton
              variant="rounded"
              sx={{ width: 64, height: "var(--chip-height)", borderRadius: "var(--chip-radius)" }}
            />
          </TableCell>
          <TableCell sx={textCellSx}>
            <Skeleton
              variant="rounded"
              sx={{ width: 80, height: "var(--chip-height)", borderRadius: "var(--chip-radius)" }}
            />
          </TableCell>
        </TableRow>
      ));
    }

    if (rosterStatus === "error") {
      return (
        <FrameRow>
          <EmptyState
            headingComponent="h3"
            title="Couldn't load the roster"
            description="The server didn't respond as expected. Reload the page to try again."
            error={{}}
          />
        </FrameRow>
      );
    }

    if (allUsers.length === 0) {
      return (
        <FrameRow>
          <EmptyState
            headingComponent="h3"
            title="The roster is empty."
            description="Enter email addresses above to enroll students."
          />
        </FrameRow>
      );
    }

    if (pageUsers.length === 0) {
      return (
        <FrameRow>
          <EmptyState
            headingComponent="h3"
            title={`No one on the roster matches "${trimmedQuery}"`}
          />
        </FrameRow>
      );
    }

    return pageUsers.map((user) => {
      const isSelected = selectedUsers.includes(user.id);
      return (
        <TableRow key={user.id} hover selected={isSelected} aria-selected={isSelected}>
          <TableCell padding="checkbox" sx={{ py: 0 }}>
            <Checkbox
              checked={isSelected}
              onChange={() => handleSelectUser(user.id)}
              slotProps={{ input: { "aria-label": `Select ${user.email}` } }}
            />
          </TableCell>
          <TableCell sx={textCellSx}>
            <TruncatedText text={user.email} />
          </TableCell>
          <TableCell sx={textCellSx}>
            <Chip label={roleLabel(user.role)} />
          </TableCell>
          <TableCell sx={textCellSx}>
            {user.status === 'active' ? (
              <StatusChip kind="success" label="Active" />
            ) : (
              <StatusChip kind="info" label="Pending" />
            )}
          </TableCell>
        </TableRow>
      );
    });
  };

  return (
    <AdminPage maxWidth="md">
      <AdminPageHeader title={PAGE_TITLE} description={PAGE_DESCRIPTION} />

      {(className || classNameLoading) && (
        // A standing note about the page, not an announcement: no alert role.
        <Alert severity="info" role="note" sx={{ mb: "var(--space-5)" }}>
          Managing enrollment for class:{" "}
          {className ? (
            <Box component="strong" sx={{ fontWeight: "var(--weight-semibold)" }}>
              {className}
            </Box>
          ) : (
            <Skeleton variant="text" width={160} sx={{ display: "inline-block", verticalAlign: "middle" }} />
          )}
        </Alert>
      )}

      {/* Enrolment: the addresses and the page's one filled button */}
      <Box
        component="section"
        aria-label="Enroll students"
        sx={{ display: "grid", gap: "var(--space-3)", mb: "var(--space-section)" }}
      >
        <TextField
          label="Email addresses"
          fullWidth
          value={enrollEmails}
          onChange={(e) => setEnrollEmails(e.target.value)}
          multiline
          rows={4}
          helperText="One address per line. Anyone without an account is added as pending."
        />
        <Box sx={{ display: "flex" }}>
          <Button variant="contained" onClick={handleEnroll} startIcon={<PersonAddIcon />}>
            Enroll students
          </Button>
        </Box>
      </Box>

      {/* The roster: a table on the canvas, rules and no fills */}
      <Box component="section" aria-labelledby={rosterHeadingId}>
        <Box
          sx={{
            display: "flex",
            alignItems: "baseline",
            flexWrap: "wrap",
            columnGap: "var(--space-4)",
            rowGap: "var(--space-1)",
            mb: "var(--space-3)",
          }}
        >
          <Typography id={rosterHeadingId} component="h2" variant="h3">
            Class roster
          </Typography>
          <Typography variant="body2" sx={{ color: "text.secondary", fontVariantNumeric: "tabular-nums" }}>
            Roster: {countNoun(allUsers.length, "user")} ({formatCount(activeCount)} active,{" "}
            {formatCount(pendingCount)} pending)
          </Typography>
        </Box>

        {/* The toolbar: the destructive action alone at the start, a flexible spacer, then the rest */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "var(--space-inline)",
            mb: "var(--space-3)",
          }}
        >
          <DisabledReason reason={nothingSelected ? "Select users to remove." : null}>
            <Button
              variant="outlined"
              color="error"
              onClick={handleDeleteSelected}
              aria-disabled={nothingSelected || undefined}
              startIcon={<DeleteIcon />}
              sx={{ fontVariantNumeric: "tabular-nums" }}
            >
              Remove selected ({formatCount(selectedCount)})
            </Button>
          </DisabledReason>
          <Box aria-hidden sx={{ flex: "1 1 auto", minWidth: "var(--space-4)" }} />
          <DisabledReason reason={nothingSelected ? "Select users to email." : null}>
            <Button
              variant="outlined"
              onClick={() => {
                if (!nothingSelected) setEmailDialogOpen(true);
              }}
              aria-disabled={nothingSelected || undefined}
              startIcon={<EmailIcon />}
              sx={{ fontVariantNumeric: "tabular-nums" }}
            >
              Email selected ({formatCount(selectedCount)})
            </Button>
          </DisabledReason>
          <TextField
            placeholder="Search by email"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              // A new query starts from its first page of matches.
              setCurrentPage(1);
            }}
            slotProps={{
              htmlInput: { "aria-label": "Search by email" },
              input: {
                startAdornment: (
                  <InputAdornment position="start" sx={{ mr: 0 }}>
                    <SearchIcon sx={{ fontSize: "var(--size-icon)", color: "var(--icon-default)" }} />
                  </InputAdornment>
                ),
              },
            }}
            sx={{ width: 260, maxWidth: "100%" }}
          />
        </Box>

        {/* Below the columns' minimum widths the table scrolls inside its own box, never the page. */}
        <Box sx={{ width: "100%", overflowX: "auto" }}>
          <Table
            aria-labelledby={rosterHeadingId}
            aria-busy={rosterStatus === "loading" || undefined}
            sx={{
              tableLayout: "fixed",
              minWidth: `calc(var(--table-col-min-check) + var(--table-col-min-text) + ${ROLE_COLUMN_WIDTH}px + var(--table-col-min-status))`,
              borderTop: "1px solid var(--table-variant-header-rule)",
              borderBottom: "1px solid var(--table-variant-header-rule)",
              // The table's own rule closes it, so its last row draws none.
              "& .MuiTableBody-root > .MuiTableRow-root:last-of-type > .MuiTableCell-root": { borderBottom: 0 },
              // A selected row's 2 px marker runs down its first cell.
              "& .MuiTableRow-root.Mui-selected > .MuiTableCell-root:first-of-type": {
                boxShadow: "inset var(--size-marker) 0 0 var(--table-variant-selected-marker)",
              },
            }}
          >
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox" sx={{ py: 0 }}>
                  <Checkbox
                    checked={allVisibleSelected}
                    indeterminate={someVisibleSelected}
                    onChange={handleSelectAll}
                    slotProps={{ input: { "aria-label": "Select all rows" } }}
                  />
                </TableCell>
                <TableCell sx={textCellSx}>Email</TableCell>
                <TableCell sx={{ ...textCellSx, width: ROLE_COLUMN_WIDTH }}>Role</TableCell>
                <TableCell sx={{ ...textCellSx, width: "var(--table-col-min-status)" }}>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>{renderRosterBody()}</TableBody>
          </Table>
        </Box>

        {rosterStatus === "ready" && pageCount > 1 && (
          <AdminTablePagination
            page={page}
            pageSize={PAGE_SIZE}
            total={matchingUsers.length}
            onPageChange={setCurrentPage}
          />
        )}
      </Box>

      <AdminToast
        open={toastOpen}
        severity={toast.severity}
        message={toast.message}
        onClose={() => setToastOpen(false)}
      />

      {/* Email Dialog */}
      <EmailSelectedUsersDialog
        open={emailDialogOpen}
        onClose={() => setEmailDialogOpen(false)}
        selectedUsers={allUsers.filter(user => selectedUsers.includes(user.id))}
        classId={classID}
        className={className ?? undefined}
        onSuccess={() => {
          showToast("success", "Emails sent");
          setSelectedUsers([]);
          setEmailDialogOpen(false);
        }}
      />
    </AdminPage>
  );
};
