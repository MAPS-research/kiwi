import * as React from "react";
import { toast } from "sonner";
import apiClient from "../../../utils/api.ts";
import { ChangeRoleDtoRoleEnum } from "../../../services/models/ChangeRoleDto.ts";
import { ClassInfoResponse } from "../../../services/models/ClassInfoResponse.ts";
import {
  apiErrorMessage,
  generatePassword,
  isSsoDomainEmail,
  type BulkResult,
  type RegistrationResult,
  type UserEntry,
} from "./lib.ts";

/**
 * Data layer for the user-management page: the merged user/whitelist
 * directory, the class list, and every mutation the UI can perform.
 * Mutations are optimistic where cheap and refetch where bulk.
 */
export const useUserDirectory = () => {
  const [users, setUsers] = React.useState<UserEntry[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = React.useState(true);
  const [usersError, setUsersError] = React.useState("");
  const [classes, setClasses] = React.useState<ClassInfoResponse[]>([]);
  const [isLoadingClasses, setIsLoadingClasses] = React.useState(true);
  const [classesError, setClassesError] = React.useState("");
  const [pendingActions, setPendingActions] = React.useState<Set<string>>(new Set());

  const startAction = React.useCallback((key: string) => {
    setPendingActions((current) => new Set(current).add(key));
  }, []);

  const finishAction = React.useCallback((key: string) => {
    setPendingActions((current) => {
      const next = new Set(current);
      next.delete(key);
      return next;
    });
  }, []);

  const isActionPending = React.useCallback(
    (action: "access" | "role" | "password", id: string) =>
      pendingActions.has(`${action}:${id}`),
    [pendingActions]
  );

  const fetchUsers = React.useCallback(async () => {
    setIsLoadingUsers(true);
    setUsersError("");
    try {
      const [userRes, whitelistRes] = await Promise.all([
        apiClient.authControllerGetAllUsers(),
        apiClient.whitelistControllerListWhitelistUsers(),
      ]);

      const whitelistStatus = new Map<string, "enabled" | "disabled">();
      (whitelistRes.entries || []).forEach((entry) => {
        whitelistStatus.set(entry.email, entry.status as "enabled" | "disabled");
      });

      const registered: UserEntry[] = (userRes.users || []).map((user) => ({
        id: user.id || user.email || `user-${Math.random()}`,
        email: user.email || "",
        systemRole: user.systemRole || "user",
        oauth: user.oauth || false,
        consent: user.consent || false,
        status: whitelistStatus.get(user.email || "") || "disabled",
        isPending: false,
      }));

      const registeredEmails = new Set(registered.map((u) => u.email));
      const invited: UserEntry[] = (whitelistRes.entries || [])
        .filter((entry) => !registeredEmails.has(entry.email))
        .map((entry) => ({
          id: `pending-${entry.email}`,
          email: entry.email,
          systemRole: "user",
          oauth: isSsoDomainEmail(entry.email),
          consent: false,
          status: entry.status as "enabled" | "disabled",
          isPending: true,
        }));

      setUsers([...registered, ...invited]);
    } catch (error) {
      const message = await apiErrorMessage(error, "Failed to load users and whitelist");
      setUsersError(message);
      toast.error(message);
    } finally {
      setIsLoadingUsers(false);
    }
  }, []);

  React.useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const fetchClasses = React.useCallback(async () => {
    setIsLoadingClasses(true);
    setClassesError("");
    try {
      const response = await apiClient.classControllerList();
      const details = await Promise.all(
        (response.classIds || []).map(async (classId) => {
          try {
            return await apiClient.classControllerGetById({ classID: classId });
          } catch {
            return null;
          }
        })
      );
      setClasses(details.filter((item): item is ClassInfoResponse => item !== null));
    } catch (error) {
      const message = await apiErrorMessage(error, "Failed to load classes");
      setClassesError(message);
      toast.error(message);
    } finally {
      setIsLoadingClasses(false);
    }
  }, []);

  React.useEffect(() => {
    fetchClasses();
  }, [fetchClasses]);

  /** Optimistically flip whitelist access for one user. */
  const setAccess = React.useCallback(
    async (
      entry: UserEntry,
      status: "enabled" | "disabled",
      options: { silent?: boolean } = {}
    ) => {
      const actionKey = `access:${entry.id}`;
      startAction(actionKey);
      const prev = entry.status;
      setUsers((list) =>
        list.map((u) => (u.id === entry.id ? { ...u, status } : u))
      );
      try {
        await apiClient.whitelistControllerUpdateUserWhitelist({
          updateWhitelistRequest: { email: entry.email, status },
        });
        if (!options.silent) {
          toast.success(`${status === "enabled" ? "Enabled" : "Disabled"} access for ${entry.email}`);
        }
        return true;
      } catch (error) {
        setUsers((list) =>
          list.map((u) => (u.id === entry.id ? { ...u, status: prev } : u))
        );
        if (!options.silent) {
          toast.error(await apiErrorMessage(error, `Failed to update ${entry.email}`));
        }
        return false;
      } finally {
        finishAction(actionKey);
      }
    },
    [finishAction, startAction]
  );

  /** Optimistically change a registered user's system role. */
  const changeRole = React.useCallback(
    async (entry: UserEntry, role: ChangeRoleDtoRoleEnum) => {
      const actionKey = `role:${entry.id}`;
      startAction(actionKey);
      const prev = entry.systemRole;
      setUsers((list) =>
        list.map((u) => (u.id === entry.id ? { ...u, systemRole: role } : u))
      );
      try {
        await apiClient.authControllerChangeRole({
          changeRoleDto: { email: entry.email, role },
        });
        toast.success(`${entry.email} is now ${role}`);
      } catch (error) {
        setUsers((list) =>
          list.map((u) => (u.id === entry.id ? { ...u, systemRole: prev } : u))
        );
        toast.error(await apiErrorMessage(error, `Failed to change role for ${entry.email}`));
      } finally {
        finishAction(actionKey);
      }
    },
    [finishAction, startAction]
  );

  /** Reset a password user's password to a fresh random one. */
  const resetPassword = React.useCallback(async (entry: UserEntry) => {
    const actionKey = `password:${entry.id}`;
    startAction(actionKey);
    const password = generatePassword();
    try {
      await apiClient.authControllerResetPassword({
        resetPasswordDto: { email: entry.email, password },
      });
      toast.success(`Password reset for ${entry.email}`, {
        description: `New password: ${password}`,
        duration: 15000,
        action: {
          label: "Copy",
          onClick: () => navigator.clipboard.writeText(password),
        },
      });
    } catch (error) {
      toast.error(await apiErrorMessage(error, `Failed to reset password for ${entry.email}`));
    } finally {
      finishAction(actionKey);
    }
  }, [finishAction, startAction]);

  /** Add emails to the whitelist one by one; returns per-email results. */
  const addToWhitelist = React.useCallback(
    async (emails: string[]): Promise<BulkResult[]> => {
      const results: BulkResult[] = [];
      for (const email of emails) {
        try {
          await apiClient.whitelistControllerAddUserToWhitelist({
            addWhitelistRequest: { email },
          });
          results.push({ email, status: "success" });
        } catch (error) {
          results.push({
            email,
            status: "error",
            error: await apiErrorMessage(error, "Failed to add to whitelist"),
          });
        }
      }
      await fetchUsers();
      return results;
    },
    [fetchUsers]
  );

  /** Register password accounts into a class; returns credentials per email. */
  const registerUsers = React.useCallback(
    async (emails: string[], classId: string): Promise<RegistrationResult[]> => {
      const results: RegistrationResult[] = [];
      for (const email of emails) {
        const password = generatePassword();
        try {
          await apiClient.authControllerRegister({
            registerDto: { email, password, classId },
          });
          results.push({ email, password, classId, status: "success" });
        } catch (error) {
          results.push({
            email,
            password,
            classId,
            status: "error",
            error: await apiErrorMessage(error, "Registration failed"),
          });
        }
      }
      await fetchUsers();
      return results;
    },
    [fetchUsers]
  );

  return {
    users,
    isLoadingUsers,
    usersError,
    classes,
    isLoadingClasses,
    classesError,
    refetchUsers: fetchUsers,
    refetchClasses: fetchClasses,
    isActionPending,
    setAccess,
    changeRole,
    resetPassword,
    addToWhitelist,
    registerUsers,
  };
};

export type UserDirectory = ReturnType<typeof useUserDirectory>;
