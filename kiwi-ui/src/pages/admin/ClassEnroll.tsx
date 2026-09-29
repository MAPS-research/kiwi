import {
  Button,
  Checkbox,
  Snackbar,
  TextField,
  Typography,
  Pagination,
  Box,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Stack
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
import { AdminPage, AdminPageHeader } from "../../components/AdminPage/index.ts";

export const ClassEnroll: React.FC = () => {
  const location = useLocation();
  const { classID: classIdFromParams } = useParams<{ classID: string }>();
  const classNameFromNav = location.state?.className;

  // Use classID from URL params
  const classID = classIdFromParams || "";

  // State for fetched class name
  const [className, setClassName] = React.useState<string>(classNameFromNav || "");

  if (!classID) {
    return (
      <AdminPage>
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="h5" color="error">
            Error: Class ID not found
          </Typography>
        </Box>
      </AdminPage>
    );
  }

  const [enrollEmails, setEnrollEmails] = React.useState("");
  const [openSnackbar, setOpenSnackbar] = React.useState(false);
  const [snackbarMessage, setSnackbarMessage] = React.useState("");
  const [snackbarSeverity, setSnackbarSeverity] = React.useState<"success" | "error">("success");
  const [emailDialogOpen, setEmailDialogOpen] = React.useState(false);

  // Combined user state
  interface EnrolledUser {
    id: string;
    email: string;
    role: 'admin' | 'student' | 'professor';
    status: 'active' | 'pending';
    userId?: string; // For active users
  }

  const [allUsers, setAllUsers] = React.useState<EnrolledUser[]>([]);
  const [selectedUsers, setSelectedUsers] = React.useState<string[]>([]);
  const [selectAll, setSelectAll] = React.useState(false);

  // Search and pagination
  const [searchQuery, setSearchQuery] = React.useState("");
  const [currentPage, setCurrentPage] = React.useState(1);
  const pageSize = 15;

  // Filter and paginate combined users
  const filteredUsers = allUsers
    .filter((user) => user.email.toLowerCase().includes(searchQuery.toLowerCase()))
    .slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const totalFilteredUsers = allUsers.filter((user) =>
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  ).length;


  const handleSelectUser = (userId: string) => {
    setSelectedUsers((prevSelected) =>
      prevSelected.includes(userId) ? prevSelected.filter((id) => id !== userId) : [...prevSelected, userId]
    );
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(filteredUsers.map((user) => user.id));
    }
    setSelectAll(!selectAll);
  };

  const handleDeleteSelected = async () => {
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

      setSnackbarSeverity("success");
      setSnackbarMessage("Selected users removed successfully!");
      setOpenSnackbar(true);

      // Remove deleted users from state
      setAllUsers(allUsers.filter(user => !selectedUsers.includes(user.id)));
      setSelectedUsers([]);
      setSelectAll(false);
    } catch (error) {
      setSnackbarSeverity("error");
      setSnackbarMessage("Failed to remove users. Please try again.");
      setOpenSnackbar(true);
    }
  };

  const handleEnroll = async () => {
    const validEmails = enrollEmails.split("\n").map(email => email.trim()).filter(email => email !== "");

    if (validEmails.length === 0) {
      setSnackbarSeverity("error");
      setSnackbarMessage("Please enter at least one email address");
      setOpenSnackbar(true);
      return;
    }

    try {
      const res = await apiClient.classControllerEnroll({
        classEnrollRequest: { classId: classID, studentEmails: validEmails }
      });

      if (res) {
        setSnackbarSeverity("success");
        setSnackbarMessage("Users enrolled successfully!");
        setOpenSnackbar(true);
        setEnrollEmails("");

        // Refresh the user list and auto-select newly added users
        await fetchAllUsers(validEmails);
      }
    } catch (error: any) {
      console.error("Error enrolling users:", error);
      if (error.message.includes("ConflictException")) {
        setSnackbarSeverity("error");
        setSnackbarMessage(error.message);
      } else {
        setSnackbarSeverity("error");
        setSnackbarMessage("Unexpected error occurred. Please try again.");
      }
      setOpenSnackbar(true);
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
      setSnackbarSeverity("error");
      setSnackbarMessage("Failed to load users");
      setOpenSnackbar(true);
    }
  };

  const fetchClassInfo = async () => {
    if (!classID) return;

    try {
      const classEntry = await apiClient.classControllerGetById({ classID });
      setClassName(classEntry.className || classID);
    } catch (error) {
      console.error("Error fetching class info:", error);
      // Fallback to navigation state or classID if fetch fails
      setClassName(classNameFromNav || classID);
    }
  };

  React.useEffect(() => {
    fetchClassInfo();
    fetchAllUsers();
  }, [classID]);

  return (
    <AdminPage maxWidth="md">
      <AdminPageHeader
        title="Enroll Students"
        description="Add students, review pending enrollments, and manage the class roster."
      />

      {classID && (
        <Alert severity="info" sx={{ mt: 2, mb: 2, width: '100%' }}>
          Managing enrollment for class: <strong>{className || classID}</strong>
        </Alert>
      )}

      <Box sx={{ mt: 3 }}>
        {/* Enrollment Section */}
        <Paper elevation={0} sx={{ p: 3, mb: 4, backgroundColor: '#f5f5f5' }}>
          <TextField
            label="Email Addresses (one per line) *"
            variant="outlined"
            fullWidth
            value={enrollEmails}
            onChange={(e) => setEnrollEmails(e.target.value)}
            multiline
            rows={6}
            helperText="Enter email addresses, one per line"
            sx={{ mb: 3, backgroundColor: 'white' }}
          />
          <Button
            variant="contained"
            color="primary"
            size="large"
            fullWidth
            onClick={handleEnroll}
            startIcon={<PersonAddIcon />}
            sx={{ py: 1.5 }}
          >
            ENROLL USERS
          </Button>
        </Paper>
        {/* Enrolled Users Section */}
        <Box sx={{ mb: 4 }}>
          <Typography
            variant="h5"
            gutterBottom
            sx={{
              fontWeight: 600,
              mb: 3
            }}>
            Enrolled Users
          </Typography>

          <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Stack direction="row" spacing={2} sx={{
              alignItems: "center"
            }}>
              <Typography variant="body1" sx={{
                color: "text.secondary"
              }}>
                Total: {allUsers.length} users ({allUsers.filter(u => u.status === 'active').length} active, {allUsers.filter(u => u.status === 'pending').length} pending)
              </Typography>
              <Button
                variant="contained"
                color="primary"
                onClick={() => setEmailDialogOpen(true)}
                disabled={selectedUsers.length === 0}
                startIcon={<EmailIcon />}
              >
                Email Selected ({selectedUsers.length})
              </Button>
              <Button
                variant="outlined"
                color="error"
                onClick={handleDeleteSelected}
                disabled={selectedUsers.length === 0}
                startIcon={<DeleteIcon />}
              >
                Remove Selected ({selectedUsers.length})
              </Button>
            </Stack>

            <TextField
              placeholder="Search users..."
              variant="outlined"
              size="small"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              slotProps={{
                input: {
                  startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
                }
              }}
              sx={{ width: 300 }}
            />
          </Box>

          <TableContainer component={Paper} elevation={1}>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={selectAll}
                      onChange={handleSelectAll}
                      indeterminate={selectedUsers.length > 0 && selectedUsers.length < filteredUsers.length}
                    />
                  </TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Role</TableCell>
                  <TableCell align="center">Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} align="center" sx={{ py: 3 }}>
                      <Typography sx={{
                        color: "text.secondary"
                      }}>
                        {searchQuery ? 'No users found matching your search' : 'No users enrolled yet'}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user) => (
                    <TableRow key={user.id} hover>
                      <TableCell padding="checkbox">
                        <Checkbox
                          checked={selectedUsers.includes(user.id)}
                          onChange={() => handleSelectUser(user.id)}
                        />
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        {user.role === "admin" ? (
                          <Chip label="Admin" color="warning" size="small" />
                        ) : user.role === "professor" ? (
                          <Chip label="Professor" color="secondary" size="small" />
                        ) : (
                          <Chip label="Student" color="primary" size="small" />
                        )}
                      </TableCell>
                      <TableCell align="center">
                        {user.status === 'active' ? (
                          <Chip label="Active" color="success" size="small" />
                        ) : (
                          <Chip label="Pending" color="info" size="small" />
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {Math.ceil(totalFilteredUsers / pageSize) > 1 && (
            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
              <Pagination
                count={Math.ceil(totalFilteredUsers / pageSize)}
                page={currentPage}
                onChange={(_, value) => setCurrentPage(value)}
              />
            </Box>
          )}
        </Box>
        {/* Snackbar for success notifications */}
        <Snackbar
          open={openSnackbar}
          autoHideDuration={3000}
          onClose={() => setOpenSnackbar(false)}
        >
          <Alert onClose={() => setOpenSnackbar(false)} severity={snackbarSeverity} sx={{ width: '100%' }}>
            {snackbarMessage}
          </Alert>
        </Snackbar>

        {/* Email Dialog */}
        <EmailSelectedUsersDialog
          open={emailDialogOpen}
          onClose={() => setEmailDialogOpen(false)}
          selectedUsers={allUsers.filter(user => selectedUsers.includes(user.id))}
          classId={classID}
          className={className}
          onSuccess={() => {
            setSnackbarSeverity("success");
            setSnackbarMessage("Emails sent successfully!");
            setOpenSnackbar(true);
            setSelectedUsers([]);
            setSelectAll(false);
            setEmailDialogOpen(false);
          }}
        />
      </Box>
    </AdminPage>
  );
};
