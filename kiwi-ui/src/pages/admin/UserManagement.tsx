type UserEntry = {
  id: string;
  email: string;
  systemRole: string;
  oauth: boolean;
  consent: boolean;
  status?: "enabled" | "disabled";
  operationStatus?: 'pending' | 'success' | 'error';
  error?: string;
  isNew?: boolean;
  addedAt?: number;
  isPending?: boolean; // True if email is in whitelist but not a registered user yet
};

/**
 * SSO-domain emails are OAuth accounts (Google sign-in), not password users.
 * Exported so the optimistic add-user flow and its tests share one source of truth
 * for whether a freshly-added row should render as an OAuth user vs. a password user.
 */
export const isSsoDomainEmail = (email: string): boolean => isSsoEmail(email);


import {
  AlternateEmailOutlined as AccountFieldIcon,
  BadgeOutlined as RoleFieldIcon,
  CheckCircleOutlined as CheckCircle,
  ClearAllOutlined as ClearFiltersIcon,
  DownloadOutlined as DownloadIcon,
  GroupOutlined as GroupIcon,
  MoreHorizOutlined as ActionFieldIcon,
  PersonAddOutlined as PersonAddIcon,
  PlaylistAddOutlined as PlaylistAddIcon,
  RadioButtonCheckedOutlined as StatusFieldIcon,
  SearchOutlined as Search,
  TableRowsOutlined as TableViewIcon,
  ToggleOnOutlined as AccessFieldIcon,
  VpnKeyOutlined as VpnKeyIcon,
} from "@mui/icons-material";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputAdornment,
  InputLabel,
  LinearProgress,
  ListItemText,
  MenuItem,
  OutlinedInput,
  Paper,
  Select,
  Snackbar,
  Stack,
  Switch,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TableSortLabel,
  Tabs,
  TextField,
  Tooltip,
  Typography
} from "@mui/material";
import * as React from "react";
import { AssignInstructorToClassDto } from "../../services/models/AssignInstructorToClassDto.ts";
import { ChangeRoleDtoRoleEnum } from "../../services/models/ChangeRoleDto.ts";
import { InstructorPermissions } from "../../services/models/InstructorPermissions.ts";
import { InstructorClassAssignmentInfo } from "../../services/models/InstructorClassAssignmentInfo.ts";
import { UpdateInstructorPermissionsDto } from "../../services/models/UpdateInstructorPermissionsDto.ts";
import { ResetPasswordDto } from "../../services/models/ResetPasswordDto.ts";
import { ClassInfoResponse } from "../../services/models/ClassInfoResponse.ts";
import { AuthControllerGetAllUsers200ResponseUsersInner } from "../../services/models/AuthControllerGetAllUsers200ResponseUsersInner.ts";
import apiClient from "../../utils/api.ts";
import { isSsoEmail } from "../../config/branding";
import {
  AdminFormSurface,
  AdminPage,
  AdminPageHeader,
} from "../../components/AdminPage/index.ts";
import StatusChip from "../../components/StatusChip/StatusChip.tsx";
interface RegistrationResult {
  email: string;
  password: string;
  classId: string;
  status: 'pending' | 'success' | 'error';
  error?: string;
}


const UserManagement: React.FC = () => {
  // Registration state
  const [registrationResults, setRegistrationResults] = React.useState<RegistrationResult[]>([]);
  const [isRegistering, setIsRegistering] = React.useState(false);
  const [registrationEmailsText, setRegistrationEmailsText] = React.useState<string>("");
  const [selectedClassId, setSelectedClassId] = React.useState<string>("");
  const [classes, setClasses] = React.useState<ClassInfoResponse[]>([]);
  const [isLoadingClasses, setIsLoadingClasses] = React.useState(true);

  // Load class IDs and details for registration
  React.useEffect(() => {
    const loadClasses = async () => {
      try {
        setIsLoadingClasses(true);
        const response = await apiClient.classControllerList();
        const classIds = response.classIds || [];
        
        // Fetch detailed info for each class
        const classDetails: ClassInfoResponse[] = [];
        for (const classId of classIds) {
          try {
            const classInfo = await apiClient.classControllerGetById({ classID: classId });
            classDetails.push(classInfo);
          } catch (error) {
            console.warn(`Failed to fetch details for class ${classId}:`, error);
          }
        }
        setClasses(classDetails);
        
        if (classIds.length > 0) {
          setSelectedClassId(classIds[0]);
        }
      } catch (error) {
        setSnackbarMessage("Failed to load classes");
        setSnackbarSeverity("error");
        setOpenSnackbar(true);
      } finally {
        setIsLoadingClasses(false);
      }
    };
    loadClasses();
  }, []);
  // Registration logic
  const handleRegisterUsers = async () => {
    if (!selectedClassId) {
      setSnackbarMessage("Please select a class");
      setSnackbarSeverity("error");
      setOpenSnackbar(true);
      return;
    }
    const emails = parseEmails(registrationEmailsText);
    if (emails.length === 0) {
      setSnackbarMessage("Please enter at least one email address");
      setSnackbarSeverity("error");
      setOpenSnackbar(true);
      return;
    }

    // Filter out SSO-domain emails
    const ssoEmails = emails.filter(email => isSsoDomainEmail(email));
    const validEmails = emails.filter(email => !isSsoDomainEmail(email));

    if (ssoEmails.length > 0) {
      setSnackbarMessage(`Cannot register SSO-domain emails: ${ssoEmails.join(', ')}. SSO users should use OAuth login.`);
      setSnackbarSeverity("error");
      setOpenSnackbar(true);
      if (validEmails.length === 0) {
        return;
      }
    }
    setIsRegistering(true);
    const results: RegistrationResult[] = validEmails.map(email => ({
      email,
      password: generatePassword(),
      classId: selectedClassId,
      status: 'pending'
    }));
    setRegistrationResults(results);
    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      try {
        const registerDto = {
          email: result.email,
          password: result.password,
          classId: result.classId
        };
        await apiClient.authControllerRegister({ registerDto });
        result.status = 'success';
        setRegistrationResults([...results]);

        // Initialize role as 'user' for successfully registered users
        setUserRoles(prev => ({ ...prev, [result.email]: 'user' }));
      } catch (error: any) {
        result.status = 'error';
        let errorMessage = 'Registration failed';
        if (error && typeof error === 'object' && 'response' in error && error.response) {
          try {
            const errorData = await error.response.json();
            if (errorData.error && errorData.error.message) {
              errorMessage = errorData.error.message;
            } else if (errorData.message) {
              errorMessage = errorData.message;
            } else if (typeof errorData === 'string') {
              errorMessage = errorData;
            } else {
              errorMessage = `HTTP ${error.response.status}: ${error.response.statusText}`;
            }
          } catch {
            errorMessage = `HTTP ${error.response.status}: ${error.response.statusText}`;
          }
        } else if (error && typeof error === 'object' && 'message' in error) {
          errorMessage = (error as any).message;
        }
        result.error = errorMessage;
        setRegistrationResults([...results]);
      }
    }
    setIsRegistering(false);
    const successCount = results.filter(r => r.status === 'success').length;
    const failureCount = results.filter(r => r.status === 'error').length;
    setSnackbarMessage(`Registration completed: ${successCount} successful, ${failureCount} failed`);
    setSnackbarSeverity(failureCount === 0 ? "success" : "error");
    setOpenSnackbar(true);
  };

  const exportRegistrationToCSV = () => {
    if (registrationResults.length === 0) {
      setSnackbarMessage("No registration results to export");
      setSnackbarSeverity("error");
      setOpenSnackbar(true);
      return;
    }
    const csvHeaders = "Email,Password,ClassId,Status,Error\n";
    const csvData = registrationResults.map(result =>
      `${result.email},${result.password},${result.classId},${result.status},${result.error || ''}`
    ).join('\n');
    const csvContent = csvHeaders + csvData;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `user_registrations_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const clearRegistrationResults = () => {
    setRegistrationResults([]);
    setRegistrationEmailsText("");
  };
  const [users, setUsers] = React.useState<UserEntry[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = React.useState(true);
  const [admins, setAdmins] = React.useState<string[]>([]);
  const [userRoles, setUserRoles] = React.useState<Record<string, string>>({});
  const [openSnackbar, setOpenSnackbar] = React.useState(false);
  const [snackbarMessage, setSnackbarMessage] = React.useState("");
  const [snackbarSeverity, setSnackbarSeverity] = React.useState<"success" | "error">("success");
  const [isResetting, setIsResetting] = React.useState(false);

  // User management state
  const [searchQuery, setSearchQuery] = React.useState("");
  const [roleFilter, setRoleFilter] = React.useState("all");
  const [accessFilter, setAccessFilter] = React.useState("all");
  const [accountStatusFilter, setAccountStatusFilter] = React.useState("all");
  const [filteredUsers, setFilteredUsers] = React.useState<UserEntry[]>([]);
  const [isProcessingBulk, setIsProcessingBulk] = React.useState(false);
  const [addUsersDialogOpen, setAddUsersDialogOpen] = React.useState(false);
  const [addUsersTab, setAddUsersTab] = React.useState<"whitelist" | "register">("whitelist");
  const [assignmentDialogOpen, setAssignmentDialogOpen] = React.useState(false);
  const [emailInput, setEmailInput] = React.useState("");
  const [inputError, setInputError] = React.useState("");

  // Table pagination state
  const [page, setPage] = React.useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(10);
  const [orderBy, setOrderBy] = React.useState<keyof UserEntry>('email');
  const [order, setOrder] = React.useState<'asc' | 'desc'>('asc');

  // Class-Instructor assignment state
  const [selectedAssignmentClass, setSelectedAssignmentClass] = React.useState<string>("");
  const [selectedInstructor, setSelectedInstructor] = React.useState<string>("");
  const [selectedPermissions, setSelectedPermissions] = React.useState<string[]>([]);
  const [isAssigning, setIsAssigning] = React.useState(false);
  const [classAssignments, setClassAssignments] = React.useState<InstructorClassAssignmentInfo[]>([]);
  const [isLoadingAssignments, setIsLoadingAssignments] = React.useState(false);

  // Email validation regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  // Table helper functions
  const handleRequestSort = (property: keyof UserEntry) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const sortData = (data: UserEntry[]) => {
    return [...data].sort((a, b) => {
      const aValue = a[orderBy];
      const bValue = b[orderBy];
      if (aValue != null && bValue != null) {
        if (aValue < bValue) {
          return order === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return order === 'asc' ? 1 : -1;
        }
      }
      return 0;
    });
  };

  // Filter logic
  React.useEffect(() => {
    let filtered = [...users];

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(entry =>
        entry.email.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (accessFilter !== "all") {
      filtered = filtered.filter(entry => entry.status === accessFilter);
    }

    if (roleFilter !== "all") {
      filtered = filtered.filter(entry => (userRoles[entry.email] || entry.systemRole) === roleFilter);
    }

    if (accountStatusFilter !== "all") {
      filtered = filtered.filter(entry =>
        accountStatusFilter === "pending" ? entry.isPending : !entry.isPending
      );
    }

    // Sort by addedAt (newest first) or by email if no addedAt
    filtered.sort((a, b) => {
      if (a.addedAt && b.addedAt) {
        return (b.addedAt || 0) - (a.addedAt || 0);
      }
      return a.email.localeCompare(b.email);
    });

    setFilteredUsers(filtered);
  }, [users, searchQuery, accessFilter, roleFilter, accountStatusFilter, userRoles]);

  React.useEffect(() => {
    setPage(0);
  }, [searchQuery, accessFilter, roleFilter, accountStatusFilter]);

  React.useEffect(() => {
    const fetchUsersAndWhitelist = async () => {
      setIsLoadingUsers(true);
      try {
        const [userRes, whitelistRes] = await Promise.all([
          apiClient.authControllerGetAllUsers(),
          apiClient.whitelistControllerListWhitelistUsers()
        ]);
        
        // Convert API users to UserEntry format
        const apiUsers = (userRes.users || []).map((user) => ({
          id: user.id || user.email || `user-${Math.random()}`,
          email: user.email || '',
          systemRole: user.systemRole || 'user',
          oauth: user.oauth || false,
          consent: user.consent || false,
          status: 'enabled' as "enabled" | "disabled", // Default to enabled
          operationStatus: 'success' as const,
        }));

        // Get whitelist status for each user
        const whitelistMap = new Map();
        (whitelistRes.entries || []).forEach(entry => {
          whitelistMap.set(entry.email, entry.status);
        });

        // Update users with whitelist status
        const usersWithWhitelistStatus = apiUsers.map(user => ({
          ...user,
          status: whitelistMap.get(user.email) || 'disabled' as "enabled" | "disabled",
        }));

        // Add pending entries for whitelisted emails that don't have user accounts yet
        const existingEmails = new Set(apiUsers.map(user => user.email));
        const pendingEntries = (whitelistRes.entries || [])
          .filter(entry => !existingEmails.has(entry.email))
          .map(entry => ({
            id: `pending-${entry.email}`,
            email: entry.email,
            systemRole: 'user',
            oauth: false,
            consent: false,
            status: entry.status as "enabled" | "disabled",
            operationStatus: 'success' as const,
            isPending: true,
          }));

        // Combine registered users and pending entries
        const allUsersWithStatus = [...usersWithWhitelistStatus, ...pendingEntries];
        setUsers(allUsersWithStatus);
        
        // Extract admin emails and user roles
        const adminEmails = apiUsers.filter(user => user.systemRole === 'admin').map(user => user.email);
        setAdmins(adminEmails);

        // Initialize user roles from systemRole
        const initialRoles: Record<string, string> = {};
        apiUsers.forEach(user => {
          initialRoles[user.email] = user.systemRole;
        });
        setUserRoles(initialRoles);
        
      } catch (e) {
        setSnackbarMessage("Failed to fetch users or whitelist");
        setSnackbarSeverity("error");
        setOpenSnackbar(true);
      } finally {
        setIsLoadingUsers(false);
      }
    };
    fetchUsersAndWhitelist();
  }, []);

  // Get paginated and sorted data
  const getPaginatedData = () => {
    const sorted = sortData(filteredUsers);
    const startIndex = page * rowsPerPage;
    return sorted.slice(startIndex, startIndex + rowsPerPage);
  };

  const handleWhitelistStatusToggle = async (id: string, newStatus: "enabled" | "disabled") => {
    const entry = users.find(e => e.id === id);
    if (!entry) return;

    // Update UI immediately with pending state
    const updatedUsers = users.map(item =>
      item.id === id
        ? { ...item, status: newStatus, operationStatus: 'pending' as const }
        : item
    );
    setUsers(updatedUsers);

    try {
      await apiClient.whitelistControllerUpdateUserWhitelist({
        updateWhitelistRequest: {
          email: entry.email,
          status: newStatus,
        },
      });

      // Update to success state
      const successUsers = updatedUsers.map(item =>
        item.id === id
          ? { ...item, status: newStatus, operationStatus: 'success' as const, error: undefined }
          : item
      );
      setUsers(successUsers);

      setSnackbarMessage(`Successfully ${newStatus === 'enabled' ? 'enabled' : 'disabled'} ${entry.email}`);
      setSnackbarSeverity("success");
      setOpenSnackbar(true);

    } catch (error: any) {
      // Revert on failure
      let errorMessage = 'Failed to update status';
      if (error.response) {
        try {
          const errorData = await error.response.json();
          if (errorData.error && errorData.error.message) {
            errorMessage = errorData.error.message;
          } else if (errorData.message) {
            errorMessage = errorData.message;
          }
        } catch (parseError) {
          errorMessage = `HTTP ${error.response.status}: ${error.response.statusText}`;
        }
      }

      // Revert to original status
      const revertedUsers = users.map(item =>
        item.id === id
          ? {
            ...item,
            status: entry.status,
            operationStatus: 'error' as const,
            error: errorMessage
          }
          : item
      );
      setUsers(revertedUsers);

      setSnackbarMessage(errorMessage);
      setSnackbarSeverity("error");
      setOpenSnackbar(true);
    }
  };

  const handleRoleChange = async (email: string, newRole: string) => {
    setIsResetting(true);
    const oldRole = userRoles[email] || 'user';

    // Optimistically update UI
    setUserRoles(prev => ({ ...prev, [email]: newRole }));
    setUsers(prev => prev.map(user => 
      user.email === email ? { ...user, systemRole: newRole } : user
    ));
    if (newRole === 'admin') {
      setAdmins(prev => [...prev.filter(e => e !== email), email]);
    } else {
      setAdmins(prev => prev.filter(e => e !== email));
    }

    try {
      await apiClient.authControllerChangeRole({
        changeRoleDto: {
          email,
          role: newRole as ChangeRoleDtoRoleEnum
        }
      });
      setSnackbarMessage(`Role changed to ${newRole} for ${email}`);
      setSnackbarSeverity("success");
    } catch (error: any) {
      // Revert on error
      setUserRoles(prev => ({ ...prev, [email]: oldRole }));
      setUsers(prev => prev.map(user => 
        user.email === email ? { ...user, systemRole: oldRole } : user
      ));
      if (oldRole === 'admin') {
        setAdmins(prev => [...prev.filter(e => e !== email), email]);
      } else {
        setAdmins(prev => prev.filter(e => e !== email));
      }

      let errorMessage = 'Failed to change user role';
      if (error.response) {
        try {
          const errorData = await error.response.json();
          errorMessage =
            errorData?.error?.message || errorData?.message || typeof errorData === 'string'
              ? errorData
              : `HTTP ${error.response.status}: ${error.response.statusText}`;
        } catch {
          errorMessage = `HTTP ${error.response.status}: ${error.response.statusText}`;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      setSnackbarMessage(`Failed to change role for ${email}: ${errorMessage}`);
      setSnackbarSeverity("error");
    } finally {
      setIsResetting(false);
      setOpenSnackbar(true);
    }
  };

  const handleResetPasswordForUser = async (email: string) => {
    const newPassword = generatePassword();
    setIsResetting(true);
    try {
      const resetPasswordDto: ResetPasswordDto = { email, password: newPassword };
      await apiClient.authControllerResetPassword({ resetPasswordDto });
      setSnackbarMessage(`Password reset for ${email}: ${newPassword}`);
      setSnackbarSeverity("success");
    } catch (error: any) {
      let errorMessage = 'Password reset failed';
      if (error.response) {
        try {
          const errorData = await error.response.json();
          errorMessage =
            errorData?.error?.message || errorData?.message || typeof errorData === 'string'
              ? errorData
              : `HTTP ${error.response.status}: ${error.response.statusText}`;
        } catch {
          errorMessage = `HTTP ${error.response.status}: ${error.response.statusText}`;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      setSnackbarMessage(`Failed to reset password for ${email}: ${errorMessage}`);
      setSnackbarSeverity("error");
    } finally {
      setIsResetting(false);
      setOpenSnackbar(true);
    }
  };

  const generatePassword = (): string => {
    const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
    return Array.from({ length: 8 }, () => charset.charAt(Math.floor(Math.random() * charset.length))).join('');
  };


  const parseEmails = (text: string): string[] =>
    text.split('\n').map(email => email.trim()).filter(Boolean);


  const handleAddEmails = async () => {
    const emails = parseEmails(emailInput);
    if (emails.length === 0) {
      setInputError("Please enter at least one email address");
      return;
    }

    // Check for existing emails
    const existingEmails = users.map(entry => entry.email.toLowerCase());
    const newEmails = emails.filter(email =>
      !existingEmails.includes(email.toLowerCase())
    );

    if (newEmails.length === 0) {
      setInputError("All emails are already in the whitelist");
      return;
    }

    setIsProcessingBulk(true);

    // Create entries with pending status and add to beginning
    const timestamp = Date.now();
    const newEntries: UserEntry[] = newEmails.map(email => ({
      id: `temp-${email}-${timestamp}`,
      email,
      systemRole: 'user',
      // SSO-domain emails are OAuth accounts; match the backend so the optimistic row
      // renders as "OAuth User" instead of a "Reset Password" (password) user.
      oauth: isSsoDomainEmail(email),
      consent: false,
      status: "enabled" as const,
      operationStatus: 'pending' as const,
      isNew: true,
      addedAt: timestamp,
    }));

    // Add to beginning of list
    const updatedUsers = [...newEntries, ...users];
    setUsers(updatedUsers);

    // Initialize roles for new entries as 'user'
    const newRoles: Record<string, string> = {};
    newEntries.forEach(entry => {
      newRoles[entry.email] = 'user';
    });
    setUserRoles(prev => ({ ...newRoles, ...prev }));

    // Process each email
    let successCount = 0;
    let failureCount = 0;

    for (let i = 0; i < newEntries.length; i++) {
      const entry = newEntries[i];
      try {
        await apiClient.whitelistControllerAddUserToWhitelist({
          addWhitelistRequest: {
            email: entry.email,
          },
        });
        entry.operationStatus = 'success';
        entry.error = undefined;
        successCount++;
      } catch (error: any) {
        entry.operationStatus = 'error';
        let errorMessage = 'Failed to add user to whitelist';

        if (error.response) {
          try {
            const errorData = await error.response.json();
            if (errorData.error && errorData.error.message) {
              errorMessage = errorData.error.message;
            } else if (errorData.message) {
              errorMessage = errorData.message;
            }
          } catch (parseError) {
            errorMessage = `HTTP ${error.response.status}: ${error.response.statusText}`;
          }
        }
        entry.error = errorMessage;
        failureCount++;
      }

      // Update the list with the result
      const currentUsers = [...newEntries, ...users];
      const updatedUsers = currentUsers.map(item => item.id === entry.id ? entry : item);
      setUsers(updatedUsers);
    }

    setIsProcessingBulk(false);
    setEmailInput("");
    setSnackbarMessage(`Added ${successCount} users to whitelist. ${failureCount > 0 ? `${failureCount} failed.` : ''}`);
    setSnackbarSeverity(failureCount === 0 ? "success" : "error");
    setOpenSnackbar(true);
  };

  const exportToCSV = () => {
    const csvHeaders = "Email,Status,Operation Status,Error\n";
    const csvData = filteredUsers.map(entry =>
      `${entry.email},${entry.status},${entry.operationStatus || 'N/A'},${entry.error || ''}`
    ).join('\n');

    const csvContent = csvHeaders + csvData;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');

    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `whitelist_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // When the selected class changes, fetch its current instructor assignments
  React.useEffect(() => {
    if (!selectedAssignmentClass) {
      setClassAssignments([]);
      return;
    }
    let cancelled = false;
    (async () => {
      setIsLoadingAssignments(true);
      try {
        const res = await apiClient.instructorClassControllerListInstructorsForClass({
          classId: selectedAssignmentClass,
        });
        if (!cancelled) {
          setClassAssignments(res.instructors || []);
        }
      } catch (err) {
        if (!cancelled) {
          setClassAssignments([]);
        }
      } finally {
        if (!cancelled) setIsLoadingAssignments(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedAssignmentClass]);

  // When the selected instructor changes, pre-fill permission checkboxes
  // from their existing assignment (if any) for the chosen class.
  React.useEffect(() => {
    if (!selectedInstructor) return;
    const existing = classAssignments.find(a => a.email === selectedInstructor);
    if (existing) {
      const prefill: string[] = [];
      if (existing.permissions?.canManageMaterials) prefill.push('Manage Materials');
      if (existing.permissions?.canViewAnalytics) prefill.push('View Analytics');
      setSelectedPermissions(prefill);
    }
  }, [selectedInstructor, classAssignments]);

  const existingAssignmentForSelection = React.useMemo(() => {
    if (!selectedInstructor) return undefined;
    return classAssignments.find(a => a.email === selectedInstructor);
  }, [selectedInstructor, classAssignments]);

  const handleUpdateInstructorPermissions = async () => {
    if (!selectedAssignmentClass || !selectedInstructor) {
      setSnackbarMessage("Please select both a class and an instructor");
      setSnackbarSeverity("error");
      setOpenSnackbar(true);
      return;
    }

    setIsAssigning(true);
    try {
      const permissions: InstructorPermissions = {
        canManageMaterials: selectedPermissions.includes('Manage Materials'),
        canViewAnalytics: selectedPermissions.includes('View Analytics'),
      };

      const updateDto: UpdateInstructorPermissionsDto = {
        classId: selectedAssignmentClass,
        userEmail: selectedInstructor,
        permissions,
      };

      await apiClient.instructorClassControllerUpdateInstructorPermissions({
        updateInstructorPermissionsDto: updateDto,
      });

      setSnackbarMessage(`Updated permissions for ${selectedInstructor}`);
      setSnackbarSeverity("success");

      // Refresh assignments list for the class
      const res = await apiClient.instructorClassControllerListInstructorsForClass({
        classId: selectedAssignmentClass,
      });
      setClassAssignments(res.instructors || []);
    } catch (error: any) {
      let errorMessage = 'Failed to update instructor permissions';
      if (error.response) {
        try {
          const errorData = await error.response.json();
          errorMessage = errorData?.error?.message || errorData?.message || errorMessage;
        } catch {
          errorMessage = `HTTP ${error.response.status}: ${error.response.statusText}`;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      setSnackbarMessage(errorMessage);
      setSnackbarSeverity("error");
    } finally {
      setIsAssigning(false);
      setOpenSnackbar(true);
    }
  };

  const handleAssignInstructorToClass = async () => {
    if (!selectedAssignmentClass || !selectedInstructor) {
      setSnackbarMessage("Please select both a class and an instructor");
      setSnackbarSeverity("error");
      setOpenSnackbar(true);
      return;
    }

    setIsAssigning(true);
    try {
      const permissions: InstructorPermissions = {
        canManageMaterials: selectedPermissions.includes('Manage Materials'),
        canViewAnalytics: selectedPermissions.includes('View Analytics'),
      };

      const assignDto: AssignInstructorToClassDto = {
        classId: selectedAssignmentClass,
        userEmail: selectedInstructor,
        permissions,
        role: 'instructor'
      };

      await apiClient.instructorClassControllerAssignInstructorToClass({
        assignInstructorToClassDto: assignDto
      });

      setSnackbarMessage(`Successfully assigned ${selectedInstructor} to class ${selectedAssignmentClass}`);
      setSnackbarSeverity("success");

      // Refresh assignments list so the new row appears immediately
      try {
        const res = await apiClient.instructorClassControllerListInstructorsForClass({
          classId: selectedAssignmentClass,
        });
        setClassAssignments(res.instructors || []);
      } catch { /* ignore refresh error */ }

      // Reset only the instructor + permission fields; keep the class selected
      // so the admin can review the updated assignments list.
      setSelectedInstructor("");
      setSelectedPermissions([]);

    } catch (error: any) {
      let errorMessage = 'Failed to assign instructor to class';
      if (error.response) {
        try {
          const errorData = await error.response.json();
          errorMessage = errorData?.error?.message || errorData?.message || errorMessage;
        } catch {
          errorMessage = `HTTP ${error.response.status}: ${error.response.statusText}`;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      setSnackbarMessage(errorMessage);
      setSnackbarSeverity("error");
    } finally {
      setIsAssigning(false);
      setOpenSnackbar(true);
    }
  };

  const getInstructorEmails = () => {
    return users
      .filter(user => userRoles[user.email] === 'instructor')
      .map(user => user.email);
  };

  const handlePermissionChange = (event: any) => {
    const value = event.target.value;
    setSelectedPermissions(typeof value === 'string' ? value.split(',') : value);
  };


  const paginatedUsers = getPaginatedData();
  const hasActiveFilters = Boolean(
    searchQuery || accessFilter !== "all" || roleFilter !== "all" || accountStatusFilter !== "all"
  );
  const accessFilterLabel = accessFilter === "all" ? "Access" : `Access: ${accessFilter === "enabled" ? "Enabled" : "Disabled"}`;
  const roleFilterLabel = roleFilter === "all" ? "Role" : `Role: ${roleFilter.charAt(0).toUpperCase()}${roleFilter.slice(1)}`;
  const accountStatusFilterLabel = accountStatusFilter === "all"
    ? "Account status"
    : `Account status: ${accountStatusFilter === "registered" ? "Registered" : "Pending signup"}`;

  const openAddUsersDialog = () => {
    setAddUsersTab("whitelist");
    setAddUsersDialogOpen(true);
  };

  const closeAddUsersDialog = () => {
    if (isProcessingBulk || isRegistering) return;
    setAddUsersDialogOpen(false);
    setEmailInput("");
    setInputError("");
    setRegistrationEmailsText("");
    setRegistrationResults([]);
  };

  const closeAssignmentDialog = () => {
    if (isAssigning) return;
    setAssignmentDialogOpen(false);
    setSelectedAssignmentClass("");
    setSelectedInstructor("");
    setSelectedPermissions([]);
  };

  return (
    <AdminPage maxWidth="xl">
      <AdminPageHeader
        title="User management"
        description="Control account access, system roles, registrations, and instructor assignments from one workspace."
        actions={
          <>
            <Button
              variant="outlined"
              startIcon={<GroupIcon />}
              onClick={() => setAssignmentDialogOpen(true)}
              disabled={isAssigning}
              sx={{ minHeight: 44 }}
            >
              Assign instructor
            </Button>
            <Button
              variant="contained"
              startIcon={<PersonAddIcon />}
              onClick={openAddUsersDialog}
              disabled={isProcessingBulk || isRegistering}
              sx={{ minHeight: 44 }}
            >
              Add users
            </Button>
          </>
        }
      />

      <Box sx={{ width: "100%", minWidth: 0 }}>
          <Dialog
            open={addUsersDialogOpen}
            onClose={closeAddUsersDialog}
            fullWidth
            maxWidth="md"
            aria-labelledby="add-users-dialog-title"
            slotProps={{ paper: { sx: { maxHeight: { xs: "calc(100% - 32px)", sm: "calc(100% - 64px)" } } } }}
          >
            <DialogTitle component="div" id="add-users-dialog-title" sx={{ pb: 1.5 }}>
              <Typography component="h2" variant="h6">Add users</Typography>
              <Typography
                variant="body2"
                sx={{
                  color: "text.secondary",
                  mt: 0.5
                }}>
                Choose whether to grant access or create password-based accounts.
              </Typography>
            </DialogTitle>

            <Tabs
              value={addUsersTab}
              onChange={(_event, value: "whitelist" | "register") => setAddUsersTab(value)}
              variant="fullWidth"
              aria-label="Add user method"
              sx={{ px: { xs: 2, sm: 3 }, borderBottom: 1, borderColor: "divider" }}
            >
              <Tab value="whitelist" label="Whitelist access" disabled={isProcessingBulk || isRegistering} />
              <Tab value="register" label="Password accounts" disabled={isProcessingBulk || isRegistering} />
            </Tabs>

            {(isProcessingBulk || isRegistering) && (
              <LinearProgress aria-label="Adding users in progress" />
            )}

            <DialogContent dividers={false} sx={{ px: { xs: 2, sm: 3 }, py: 3, "& .MuiOutlinedInput-root": { minHeight: 44 } }}>
              {addUsersTab === "whitelist" ? (
                <Box role="tabpanel" aria-label="Whitelist access">
                  <Stack
                    direction="row"
                    spacing={1.5}
                    sx={{
                      alignItems: "flex-start",
                      mb: 2.5
                    }}>
                    <PlaylistAddIcon sx={{ color: "var(--icon-accent)", mt: 0.25 }} aria-hidden="true" />
                    <Box>
                      <Typography component="h3" variant="subtitle1" sx={{ fontWeight: 600 }}>Grant product access</Typography>
                      <Typography variant="body2" sx={{
                        color: "text.secondary"
                      }}>
                        Existing accounts are enabled immediately. New email addresses remain pending until first sign-in.
                      </Typography>
                    </Box>
                  </Stack>
                  <TextField
                    autoFocus
                    fullWidth
                    multiline
                    minRows={4}
                    placeholder="student@example.edu"
                    value={emailInput}
                    onChange={(event) => {
                      setEmailInput(event.target.value);
                      setInputError("");
                    }}
                    error={Boolean(inputError)}
                    label="Email addresses"
                    helperText={inputError || "Enter one address per line. Existing whitelist entries are ignored."}
                    disabled={isProcessingBulk}
                  />
                </Box>
              ) : (
                <Box role="tabpanel" aria-label="Password accounts">
                  <Stack
                    direction="row"
                    spacing={1.5}
                    sx={{
                      alignItems: "flex-start",
                      mb: 2.5
                    }}>
                    <PersonAddIcon sx={{ color: "var(--icon-accent)", mt: 0.25 }} aria-hidden="true" />
                    <Box>
                      <Typography component="h3" variant="subtitle1" sx={{ fontWeight: 600 }}>Create password accounts</Typography>
                      <Typography variant="body2" sx={{
                        color: "text.secondary"
                      }}>
                        Use this only for non-SSO users. SSO users should sign in with OAuth.
                      </Typography>
                    </Box>
                  </Stack>

                  <Stack spacing={2.5}>
                    <FormControl fullWidth>
                      <InputLabel>Class</InputLabel>
                      <Select
                        value={selectedClassId}
                        onChange={(event) => setSelectedClassId(event.target.value)}
                        disabled={isLoadingClasses || isRegistering}
                        label="Class"
                      >
                        {isLoadingClasses ? (
                          <MenuItem disabled>
                            <CircularProgress size={20} sx={{ mr: 1 }} /> Loading classes…
                          </MenuItem>
                        ) : (
                          classes.map((classInfo) => (
                            <MenuItem key={classInfo.id} value={classInfo.id}>{classInfo.className}</MenuItem>
                          ))
                        )}
                      </Select>
                    </FormControl>
                    <TextField
                      fullWidth
                      multiline
                      minRows={4}
                      placeholder="person@example.com"
                      value={registrationEmailsText}
                      onChange={(event) => setRegistrationEmailsText(event.target.value)}
                      disabled={isRegistering}
                      label="Email addresses"
                      helperText="Enter one address per line. SSO-domain addresses will be skipped."
                    />

                    {registrationResults.length > 0 && (
                      <Box>
                        <Stack
                          direction="row"
                          spacing={1}
                          sx={{
                            alignItems: "center",
                            mb: 1.5
                          }}>
                          <CheckCircle color="success" fontSize="small" aria-hidden="true" />
                          <Typography component="h3" variant="subtitle2" sx={{ flex: 1 }}>
                            Registration results ({registrationResults.length})
                          </Typography>
                          <Button size="small" onClick={clearRegistrationResults} disabled={isRegistering}>
                            Clear
                          </Button>
                        </Stack>
                        <TableContainer component={Paper} elevation={0} variant="outlined" sx={{ maxHeight: 260, display: { xs: "none", md: "block" } }}>
                          <Table size="small" stickyHeader aria-label="Registration results">
                            <TableHead>
                              <TableRow>
                                <TableCell>Email</TableCell>
                                <TableCell>Password</TableCell>
                                <TableCell>Class</TableCell>
                                <TableCell>Status</TableCell>
                                <TableCell>Error</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {registrationResults.map((result) => (
                                <TableRow key={`${result.email}-${result.classId}`}>
                                  <TableCell>{result.email}</TableCell>
                                  <TableCell><Box component="span" sx={{ fontFamily: "var(--type-code-family)", fontSize: "var(--type-code-size)" }}>{result.password}</Box></TableCell>
                                  <TableCell>{result.classId}</TableCell>
                                  <TableCell><Chip label={result.status} color={result.status === "success" ? "success" : result.status === "error" ? "error" : "default"} size="small" /></TableCell>
                                  <TableCell>
                                    {result.error && (
                                      <Tooltip title={result.error}>
                                        <Typography
                                          variant="body2"
                                          noWrap
                                          sx={{
                                            color: "var(--status-error-text)",
                                            maxWidth: 160
                                          }}>{result.error}</Typography>
                                      </Tooltip>
                                    )}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </TableContainer>
                        <Stack spacing={1} sx={{ display: { xs: "flex", md: "none" } }}>
                          {registrationResults.map((result) => (
                            <Box key={`${result.email}-${result.classId}`} sx={{ p: 1.5, border: "1px solid var(--border)", borderRadius: "var(--radius-sheet)" }}>
                              <Stack
                                direction="row"
                                sx={{
                                  justifyContent: "space-between",
                                  gap: 1,
                                  alignItems: "flex-start"
                                }}>
                                <Typography variant="body2" sx={{ fontWeight: 600, overflowWrap: "anywhere" }}>{result.email}</Typography>
                                <Chip size="small" label={result.status} color={result.status === "success" ? "success" : result.status === "error" ? "error" : "default"} />
                              </Stack>
                              <Typography
                                variant="caption"
                                sx={{
                                  color: "text.secondary",
                                  display: "block",
                                  mt: 1
                                }}>
                                Class {result.classId} · Password <Box component="span" sx={{ fontFamily: "var(--type-code-family)" }}>{result.password}</Box>
                              </Typography>
                              {result.error && <Typography variant="caption" role="alert" sx={{
                                color: "var(--status-error-text)"
                              }}>{result.error}</Typography>}
                            </Box>
                          ))}
                        </Stack>
                      </Box>
                    )}
                  </Stack>
                </Box>
              )}
            </DialogContent>

            <DialogActions sx={{ px: { xs: 2, sm: 3 }, py: 2, gap: 1, flexWrap: "wrap", "& .MuiButton-root": { minHeight: 44 } }}>
              {addUsersTab === "register" && registrationResults.length > 0 && (
                <Button startIcon={<DownloadIcon />} onClick={exportRegistrationToCSV} disabled={isRegistering} sx={{ mr: { sm: "auto" } }}>
                  Export results
                </Button>
              )}
              <Button onClick={closeAddUsersDialog} disabled={isProcessingBulk || isRegistering}>
                {registrationResults.length > 0 ? "Close" : "Cancel"}
              </Button>
              {addUsersTab === "whitelist" ? (
                <Button
                  variant="contained"
                  onClick={handleAddEmails}
                  disabled={isProcessingBulk || !emailInput.trim()}
                  startIcon={isProcessingBulk ? <CircularProgress size={20} /> : <PlaylistAddIcon />}
                >
                  {isProcessingBulk ? "Adding users…" : "Grant access"}
                </Button>
              ) : (
                <Button
                  variant="contained"
                  onClick={handleRegisterUsers}
                  disabled={isRegistering || isLoadingClasses || !registrationEmailsText.trim()}
                  startIcon={isRegistering ? <CircularProgress size={20} /> : <PersonAddIcon />}
                >
                  {isRegistering ? "Registering users…" : "Create accounts"}
                </Button>
              )}
            </DialogActions>
          </Dialog>

          <Dialog
            open={assignmentDialogOpen}
            onClose={closeAssignmentDialog}
            fullWidth
            maxWidth="md"
            aria-labelledby="assignment-dialog-title"
          >
            <DialogTitle component="div" id="assignment-dialog-title">
              <Typography component="h2" variant="h6">Instructor assignments</Typography>
              <Typography
                variant="body2"
                sx={{
                  color: "text.secondary",
                  mt: 0.5
                }}>
                Assign an instructor to a class or update an existing assignment.
              </Typography>
            </DialogTitle>
            {isAssigning && <LinearProgress aria-label="Saving instructor assignment" />}
            <DialogContent dividers sx={{ px: { xs: 2, sm: 3 }, py: 3, "& .MuiOutlinedInput-root": { minHeight: 44 } }}>
              <Stack spacing={2.5}>
                <Stack direction={{ xs: "column", md: "row" }} spacing={2} sx={{
                  alignItems: "flex-start"
                }}>
                  <FormControl fullWidth>
                    <InputLabel>Class</InputLabel>
                    <Select
                      value={selectedAssignmentClass}
                      onChange={(event) => setSelectedAssignmentClass(event.target.value)}
                      disabled={isAssigning || isLoadingClasses}
                      label="Class"
                    >
                      {isLoadingClasses ? (
                        <MenuItem disabled><CircularProgress size={20} sx={{ mr: 1 }} /> Loading classes…</MenuItem>
                      ) : (
                        classes.map((classInfo) => <MenuItem key={classInfo.id} value={classInfo.id}>{classInfo.className}</MenuItem>)
                      )}
                    </Select>
                  </FormControl>
                  <FormControl fullWidth>
                    <InputLabel>Instructor</InputLabel>
                    <Select
                      value={selectedInstructor}
                      onChange={(event) => setSelectedInstructor(event.target.value)}
                      disabled={isAssigning}
                      label="Instructor"
                    >
                      {getInstructorEmails().map((email) => <MenuItem key={email} value={email}>{email}</MenuItem>)}
                    </Select>
                  </FormControl>
                </Stack>

                <FormControl fullWidth>
                  <InputLabel>Permissions</InputLabel>
                  <Select
                    multiple
                    value={selectedPermissions}
                    onChange={handlePermissionChange}
                    input={<OutlinedInput label="Permissions" />}
                    disabled={isAssigning}
                    renderValue={(selected) => selected.join(", ")}
                  >
                    {['Manage Materials', 'View Analytics'].map((permission) => (
                      <MenuItem key={permission} value={permission}>
                        <Checkbox checked={selectedPermissions.includes(permission)} />
                        <ListItemText primary={permission} />
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                {existingAssignmentForSelection && (
                  <Alert severity="info">
                    {selectedInstructor} is already assigned to this class. Saving will update their permissions.
                  </Alert>
                )}

                {selectedAssignmentClass && (
                  <Box>
                    <Typography component="h3" variant="subtitle2" sx={{ mb: 1 }}>Current assignments</Typography>
                    {isLoadingAssignments ? (
                      <Stack direction="row" spacing={1} sx={{
                        alignItems: "center"
                      }}>
                        <CircularProgress size={16} />
                        <Typography variant="body2" sx={{
                          color: "text.secondary"
                        }}>Loading assignments…</Typography>
                      </Stack>
                    ) : classAssignments.length === 0 ? (
                      <Typography variant="body2" sx={{
                        color: "text.secondary"
                      }}>No instructors assigned to this class yet.</Typography>
                    ) : (
                      <Stack spacing={1}>
                        {classAssignments.map((assignment) => (
                          <Box key={assignment.userId} sx={{ p: 1.5, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 1, border: "1px solid var(--border)", borderRadius: "var(--radius-sheet)" }}>
                            <Typography variant="body2" sx={{ flexGrow: 1, overflowWrap: "anywhere" }}>{assignment.email}</Typography>
                            {assignment.permissions?.canManageMaterials && <Chip label="Manage Materials" size="small" />}
                            {assignment.permissions?.canViewAnalytics && <Chip label="View Analytics" size="small" />}
                            <Button
                              size="small"
                              onClick={() => {
                                setSelectedInstructor(assignment.email);
                                const prefill: string[] = [];
                                if (assignment.permissions?.canManageMaterials) prefill.push("Manage Materials");
                                if (assignment.permissions?.canViewAnalytics) prefill.push("View Analytics");
                                setSelectedPermissions(prefill);
                              }}
                            >
                              Edit
                            </Button>
                          </Box>
                        ))}
                      </Stack>
                    )}
                  </Box>
                )}
              </Stack>
            </DialogContent>
            <DialogActions sx={{ px: { xs: 2, sm: 3 }, py: 2, gap: 1, "& .MuiButton-root": { minHeight: 44 } }}>
              <Button onClick={closeAssignmentDialog} disabled={isAssigning}>Cancel</Button>
              <Button
                variant="contained"
                onClick={existingAssignmentForSelection ? handleUpdateInstructorPermissions : handleAssignInstructorToClass}
                disabled={isAssigning || !selectedAssignmentClass || !selectedInstructor}
                startIcon={isAssigning ? <CircularProgress size={20} /> : <GroupIcon />}
                color="secondary"
              >
                {isAssigning
                  ? (existingAssignmentForSelection ? "Updating…" : "Assigning…")
                  : (existingAssignmentForSelection ? "Update permissions" : "Assign instructor")}
              </Button>
            </DialogActions>
          </Dialog>

          <AdminFormSurface sx={{ overflow: "hidden" }}>
            <Box
              sx={{
                px: { xs: 1.5, sm: 2 },
                py: 1.25,
                display: "grid",
                gridTemplateAreas: {
                  xs: '"view export" "search search"',
                  sm: '"view search export"',
                },
                gridTemplateColumns: {
                  xs: "minmax(0, 1fr) auto",
                  sm: "auto minmax(220px, 280px) auto",
                },
                alignItems: "center",
                justifyContent: "space-between",
                gap: 1,
                borderBottom: 1,
                borderColor: "divider",
                bgcolor: "background.paper",
              }}
            >
              <Stack
                direction="row"
                spacing={0.75}
                aria-label="Current view: Table"
                sx={{
                  alignItems: "center",
                  gridArea: "view",
                  justifySelf: "start",
                  minHeight: 36,
                  px: 1.25,
                  color: "var(--selection-text)",
                  bgcolor: "var(--selection-bg)",
                  borderRadius: "var(--radius-control)"
                }}>
                <TableViewIcon aria-hidden="true" fontSize="small" />
                <Typography variant="body2" sx={{ fontWeight: 600 }}>Table</Typography>
              </Stack>
              <TextField
                hiddenLabel
                size="small"
                placeholder="Search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search fontSize="small" />
                      </InputAdornment>
                    ),
                  },

                  htmlInput: { "aria-label": "Search accounts" }
                }}
                sx={{
                  gridArea: "search",
                  width: "100%",
                  "& .MuiOutlinedInput-root": { minHeight: 36 },
                }} />
              <Button
                variant="outlined"
                startIcon={<DownloadIcon />}
                onClick={exportToCSV}
                disabled={filteredUsers.length === 0}
                sx={{ gridArea: "export", minHeight: 36, flexShrink: 0, justifySelf: "end" }}
              >
                Export CSV
              </Button>
            </Box>
            <Box
              aria-label="Account filters"
              sx={{
                px: { xs: 1.5, sm: 2 },
                py: 1.25,
                display: "flex",
                flexWrap: "wrap",
                gap: 1,
                alignItems: "center",
                borderBottom: 1,
                borderColor: "divider",
                bgcolor: "background.paper",
              }}
            >
              <FormControl size="small" sx={{ minWidth: { xs: "100%", sm: 164 } }}>
                <Select
                  value={accessFilter}
                  onChange={(event) => setAccessFilter(event.target.value)}
                  inputProps={{ "aria-label": "Filter by access" }}
                  renderValue={() => (
                    <Stack direction="row" spacing={0.75} sx={{
                      alignItems: "center"
                    }}>
                      <AccessFieldIcon aria-hidden="true" sx={{ fontSize: 17, color: "var(--icon-default)" }} />
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{accessFilterLabel}</Typography>
                    </Stack>
                  )}
                  sx={{ minHeight: { xs: 44, sm: 36 }, "& .MuiSelect-select": { py: 0.75 } }}
                >
                <MenuItem value="all">All access</MenuItem>
                <MenuItem value="enabled">Enabled</MenuItem>
                <MenuItem value="disabled">Disabled</MenuItem>
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: { xs: "100%", sm: 148 } }}>
                <Select
                  value={roleFilter}
                  onChange={(event) => setRoleFilter(event.target.value)}
                  inputProps={{ "aria-label": "Filter by role" }}
                  renderValue={() => (
                    <Stack direction="row" spacing={0.75} sx={{
                      alignItems: "center"
                    }}>
                      <RoleFieldIcon aria-hidden="true" sx={{ fontSize: 17, color: "var(--icon-default)" }} />
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{roleFilterLabel}</Typography>
                    </Stack>
                  )}
                  sx={{ minHeight: { xs: 44, sm: 36 }, "& .MuiSelect-select": { py: 0.75 } }}
                >
                <MenuItem value="all">All roles</MenuItem>
                <MenuItem value="user">User</MenuItem>
                <MenuItem value="instructor">Instructor</MenuItem>
                <MenuItem value="admin">Admin</MenuItem>
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: { xs: "100%", sm: 176 } }}>
                <Select
                  value={accountStatusFilter}
                  onChange={(event) => setAccountStatusFilter(event.target.value)}
                  inputProps={{ "aria-label": "Filter by account status" }}
                  renderValue={() => (
                    <Stack direction="row" spacing={0.75} sx={{
                      alignItems: "center"
                    }}>
                      <StatusFieldIcon aria-hidden="true" sx={{ fontSize: 17, color: "var(--icon-default)" }} />
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{accountStatusFilterLabel}</Typography>
                    </Stack>
                  )}
                  sx={{ minHeight: { xs: 44, sm: 36 }, "& .MuiSelect-select": { py: 0.75 } }}
                >
                <MenuItem value="all">All statuses</MenuItem>
                <MenuItem value="registered">Registered</MenuItem>
                <MenuItem value="pending">Pending signup</MenuItem>
                </Select>
              </FormControl>
              {hasActiveFilters && (
                <Button
                  variant="text"
                  startIcon={<ClearFiltersIcon />}
                  onClick={() => {
                    setSearchQuery("");
                    setAccessFilter("all");
                    setRoleFilter("all");
                    setAccountStatusFilter("all");
                  }}
                  sx={{ minHeight: { xs: 44, sm: 36 } }}
                >
                  Clear filters
                </Button>
              )}
            </Box>
            {isLoadingUsers ? (
              <Box sx={{ p: 4, textAlign: "center" }} aria-live="polite">
                <CircularProgress size={28} />
                <Typography
                  variant="body2"
                  sx={{
                    color: "text.secondary",
                    mt: 1.5
                  }}>Loading accounts…</Typography>
              </Box>
            ) : paginatedUsers.length === 0 ? (
              <Box sx={{ px: 2, py: 6, textAlign: "center" }}>
                <GroupIcon sx={{ color: "var(--icon-default)", fontSize: 36 }} aria-hidden="true" />
                <Typography component="p" variant="h6" sx={{ mt: 1 }}>No accounts found</Typography>
                <Typography
                  variant="body2"
                  sx={{
                    color: "text.secondary",
                    mt: 0.5
                  }}>
                  {hasActiveFilters ? "Try clearing or changing the current filters." : "Add an email to the whitelist to get started."}
                </Typography>
                {hasActiveFilters && <Button sx={{ mt: 2 }} onClick={() => { setSearchQuery(""); setAccessFilter("all"); setRoleFilter("all"); setAccountStatusFilter("all"); }}>Clear filters</Button>}
              </Box>
            ) : (
              <>
            <TableContainer sx={{ display: { xs: "none", lg: "block" } }}>
              <Table
                size="small"
                aria-label="User accounts"
                sx={{
                  tableLayout: "fixed",
                  "& .MuiTableCell-root": {
                    borderRight: 1,
                    borderColor: "divider",
                  },
                  "& .MuiTableCell-root:last-of-type": { borderRight: 0 },
                  "& .MuiTableRow-root:last-of-type .MuiTableCell-root": { borderBottom: 0 },
                }}
              >
                <TableHead sx={{ backgroundColor: 'background.paper' }}>
                  <TableRow>
                    <TableCell sx={{ pl: 2, py: 1.25, width: "32%", whiteSpace: "nowrap" }}>
                      <TableSortLabel
                        active={orderBy === 'email'}
                        direction={orderBy === 'email' ? order : 'asc'}
                        onClick={() => handleRequestSort('email')}
                        sx={{ fontWeight: 600, color: "text.secondary", "&.Mui-active": { color: "text.primary" } }}
                      >
                        <Stack direction="row" spacing={0.75} sx={{
                          alignItems: "center"
                        }}>
                          <AccountFieldIcon aria-hidden="true" sx={{ fontSize: 17, color: "var(--icon-default)" }} />
                          <span>Account</span>
                        </Stack>
                      </TableSortLabel>
                    </TableCell>
                    <TableCell sx={{ py: 1.25, width: 160, whiteSpace: "nowrap" }}>
                      <TableSortLabel
                        active={orderBy === 'status'}
                        direction={orderBy === 'status' ? order : 'asc'}
                        onClick={() => handleRequestSort('status')}
                        sx={{ fontWeight: 600, color: "text.secondary", "&.Mui-active": { color: "text.primary" } }}
                      >
                        <Stack direction="row" spacing={0.75} sx={{
                          alignItems: "center"
                        }}>
                          <AccessFieldIcon aria-hidden="true" sx={{ fontSize: 17, color: "var(--icon-default)" }} />
                          <span>Access</span>
                        </Stack>
                      </TableSortLabel>
                    </TableCell>
                    <TableCell sx={{ py: 1.25, width: 160, whiteSpace: "nowrap" }}>
                      <Stack
                        direction="row"
                        spacing={0.75}
                        sx={{
                          alignItems: "center",
                          color: "text.secondary"
                        }}>
                        <RoleFieldIcon aria-hidden="true" sx={{ fontSize: 17, color: "var(--icon-default)" }} />
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>Role</Typography>
                      </Stack>
                    </TableCell>
                    <TableCell sx={{ py: 1.25, width: 150, whiteSpace: "nowrap" }}>
                      <Stack
                        direction="row"
                        spacing={0.75}
                        sx={{
                          alignItems: "center",
                          color: "text.secondary"
                        }}>
                        <StatusFieldIcon aria-hidden="true" sx={{ fontSize: 17, color: "var(--icon-default)" }} />
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>Account status</Typography>
                      </Stack>
                    </TableCell>
                    <TableCell align="right" sx={{ py: 1.25, pr: 2, width: 170, whiteSpace: "nowrap" }}>
                      <Stack
                        direction="row"
                        spacing={0.75}
                        sx={{
                          alignItems: "center",
                          justifyContent: "flex-end",
                          color: "text.secondary"
                        }}>
                        <ActionFieldIcon aria-hidden="true" sx={{ fontSize: 17, color: "var(--icon-default)" }} />
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>Account action</Typography>
                      </Stack>
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paginatedUsers.map((user) => {
                    const isProcessing = user.operationStatus === 'pending';
                    const isEnabled = user.status === 'enabled';

                    return (
                      <TableRow key={user.id} hover sx={{ "&:hover": { bgcolor: "action.hover" } }}>
                        <TableCell sx={{ pl: 2, py: 1 }}>
                          <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary', overflowWrap: "anywhere" }}>
                            {user.email}
                          </Typography>
                          <Typography
                            variant="caption"
                            sx={{
                              color: "text.secondary",
                              whiteSpace: "nowrap"
                            }}>
                            {user.oauth ? "OAuth" : "Password"}
                          </Typography>
                        </TableCell>

                        <TableCell sx={{ py: 1 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Switch
                              size="small"
                              checked={isEnabled}
                              onChange={(e) => {
                                const newStatus = e.target.checked ? 'enabled' : 'disabled';
                                handleWhitelistStatusToggle(user.id, newStatus);
                              }}
                              disabled={isProcessing}
                              slotProps={{
                                input: { "aria-label": `${isEnabled ? "Disable" : "Enable"} access for ${user.email}` }
                              }}
                            />
                            <Typography
                              variant="body2"
                              color={isEnabled ? 'text.primary' : 'text.secondary'}
                              sx={{ fontWeight: isEnabled ? 600 : 400 }}
                            >
                              {isEnabled ? 'Enabled' : 'Disabled'}
                            </Typography>
                          </Box>
                        </TableCell>

                        <TableCell sx={{ py: 0.5 }}>
                          <FormControl size="small" fullWidth>
                            <Select
                              value={userRoles[user.email] || 'user'}
                              onChange={(e) => handleRoleChange(user.email, e.target.value)}
                              disabled={isResetting || user.isPending}
                              variant="standard"
                              disableUnderline
                              inputProps={{ "aria-label": `Role for ${user.email}` }}
                              sx={{
                                minHeight: 34,
                                borderRadius: "var(--radius-control)",
                                "&:hover": { bgcolor: "action.hover" },
                                // A role is a category: the text colour, never a status hue.
                                '& .MuiSelect-select': {
                                  py: 0.75,
                                  px: 1,
                                  fontSize: '0.875rem',
                                  fontWeight: 600,
                                  color: 'text.primary'
                                }
                              }}
                            >
                              <MenuItem value="user">User</MenuItem>
                              <MenuItem value="admin">Admin</MenuItem>
                              <MenuItem value="instructor">Instructor</MenuItem>
                            </Select>
                          </FormControl>
                        </TableCell>

                        <TableCell sx={{ py: 1 }}>
                          {/* A status is the status chip with its shape icon, never a bare dot. */}
                          <StatusChip
                            size="small"
                            kind={user.isPending ? "warning" : "success"}
                            label={user.isPending ? "Pending" : "Registered"}
                          />
                        </TableCell>

                        <TableCell align="right" sx={{ py: 1, pr: 2, whiteSpace: "nowrap" }}>
                          {user.isPending ? (
                            <Typography
                              variant="body2"
                              sx={{
                                color: "text.secondary",
                                fontStyle: 'italic',
                                whiteSpace: "nowrap"
                              }}>
                              Awaiting Registration
                            </Typography>
                          ) : !user.oauth ? (
                            <Button
                              variant="outlined"
                              size="small"
                              startIcon={<VpnKeyIcon />}
                              disabled={isResetting}
                              onClick={() => handleResetPasswordForUser(user.email)}
                              sx={{ whiteSpace: "nowrap", color: "text.secondary", bgcolor: "action.hover" }}
                            >
                              Reset password
                            </Button>
                          ) : (
                            <Typography
                              variant="body2"
                              sx={{
                                color: "text.secondary",
                                fontStyle: 'italic',
                                whiteSpace: "nowrap"
                              }}>
                              Managed by OAuth
                            </Typography>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>

            <Stack divider={<Box sx={{ borderTop: 1, borderColor: "divider" }} />} sx={{ display: { xs: "flex", lg: "none" } }}>
              {paginatedUsers.map((user) => {
                const isProcessing = user.operationStatus === "pending";
                const isEnabled = user.status === "enabled";
                return (
                  <Box key={user.id} sx={{ p: { xs: 1.5, sm: 2 } }}>
                    <Stack
                      direction="row"
                      sx={{
                        justifyContent: "space-between",
                        gap: 1.5,
                        alignItems: "flex-start"
                      }}>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600, overflowWrap: "anywhere" }}>{user.email}</Typography>
                        <Stack
                          direction="row"
                          spacing={0.75}
                          useFlexGap
                          sx={{
                            flexWrap: "wrap",
                            mt: 0.75
                          }}>
                          <Chip size="small" label={user.oauth ? "OAuth" : "Password"} />
                          <StatusChip size="small" kind={user.isPending ? "warning" : "success"} label={user.isPending ? "Pending" : "Registered"} />
                        </Stack>
                      </Box>
                      <Stack
                        direction="row"
                        spacing={0.25}
                        sx={{
                          alignItems: "center",
                          flexShrink: 0
                        }}>
                        <Box
                          component="label"
                          sx={{
                            width: 44,
                            height: 44,
                            display: "grid",
                            placeItems: "center",
                            flexShrink: 0,
                            cursor: isProcessing ? "default" : "pointer",
                          }}
                        >
                          <Switch
                            size="small"
                            checked={isEnabled}
                            onChange={(event) => handleWhitelistStatusToggle(user.id, event.target.checked ? "enabled" : "disabled")}
                            disabled={isProcessing}
                            slotProps={{
                              input: { "aria-label": `${isEnabled ? "Disable" : "Enable"} access for ${user.email}` }
                            }}
                          />
                        </Box>
                        <Typography variant="caption" color={isEnabled ? "text.primary" : "text.secondary"}>{isEnabled ? "Enabled" : "Disabled"}</Typography>
                      </Stack>
                    </Stack>

                    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "minmax(150px, .7fr) minmax(180px, 1fr)" }, gap: 1.5, mt: 1.5, alignItems: "end" }}>
                      <FormControl size="small" fullWidth>
                        <InputLabel>Role</InputLabel>
                        <Select
                          value={userRoles[user.email] || "user"}
                          label="Role"
                          onChange={(event) => handleRoleChange(user.email, event.target.value)}
                          disabled={isResetting || user.isPending}
                          inputProps={{ "aria-label": `Role for ${user.email}` }}
                          sx={{ minHeight: 44 }}
                        >
                          <MenuItem value="user">User</MenuItem>
                          <MenuItem value="admin">Admin</MenuItem>
                          <MenuItem value="instructor">Instructor</MenuItem>
                        </Select>
                      </FormControl>
                      {user.isPending ? (
                        <Typography
                          variant="caption"
                          sx={{
                            color: "text.secondary",
                            minHeight: 44,
                            display: "flex",
                            alignItems: "center"
                          }}>Awaiting registration</Typography>
                      ) : !user.oauth ? (
                        <Button variant="outlined" startIcon={<VpnKeyIcon />} disabled={isResetting} onClick={() => handleResetPasswordForUser(user.email)} sx={{ minHeight: 44 }}>
                          Reset password
                        </Button>
                      ) : (
                        <Typography
                          variant="caption"
                          sx={{
                            color: "text.secondary",
                            minHeight: 44,
                            display: "flex",
                            alignItems: "center"
                          }}>Password managed by OAuth</Typography>
                      )}
                    </Box>
                  </Box>
                );
              })}
            </Stack>

            <TablePagination
              rowsPerPageOptions={[5, 10, 25, 50]}
              component="div"
              count={filteredUsers.length}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
              sx={{
                borderTop: 1,
                borderColor: 'divider',
                backgroundColor: 'background.paper',
                minHeight: 56,
                ".MuiTablePagination-toolbar": { px: { xs: 1, sm: 2 } },
                ".MuiTablePagination-selectLabel": { display: { xs: "none", sm: "block" } },
              }}
            />
              </>
            )}
          </AdminFormSurface>
        </Box>
      <Snackbar open={openSnackbar} autoHideDuration={5000} onClose={() => setOpenSnackbar(false)}>
        <Alert onClose={() => setOpenSnackbar(false)} severity={snackbarSeverity} sx={{ width: "100%" }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </AdminPage>
  );
};

export default UserManagement;
