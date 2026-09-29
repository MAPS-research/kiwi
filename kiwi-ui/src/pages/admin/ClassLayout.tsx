import {
  AppsOutlined as Blocks,
  DescriptionOutlined as FileText,
  EditOutlined as PenSquare,
  EmailOutlined as Mail,
  ExtensionOutlined as Puzzle,
  FlagOutlined as Flag,
  PersonAddOutlined as UserPlus,
  ScienceOutlined as ExperimentIcon,
} from "@mui/icons-material";
import StackedBarChartOutlinedIcon from '@mui/icons-material/StackedBarChartOutlined';
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useState } from "react";
import { Outlet, useLocation, useNavigate, useParams } from "react-router-dom";
import { useAdminNavigation } from "../../context/AdminNavigationContext.tsx";
import { useGlobalChat } from "../../context/GlobalChatContext.tsx";
import apiClient from "../../utils/api.ts";

interface ClassInfo {
  className?: string;
}

// Menu configuration with icons.
// `requiresInstructorPermission` names the permission key on InstructorClass
// that must be true for an instructor to see this item. Admins and professors
// always see it.
// App-provided entries live at the top level of AdminLayout. Their class scope
// comes from the TopNav selector, so they are not duplicated in this class
// submenu.
const allMenuItems: Array<{
  label: string;
  path: string;
  icon: any;
  hideForInstructor?: boolean;
  requiresInstructorPermission?: 'canManageMaterials' | 'canViewAnalytics';
}> = [
  { label: "Edit Class", path: "edit-metadata", icon: PenSquare },
  { label: "Materials", path: "manage-materials", icon: FileText, requiresInstructorPermission: 'canManageMaterials' },
  { label: "Class Flags", path: "feature-flags", hideForInstructor: true, icon: Flag },
  { label: "Class MCP & Tools", path: "mcp-settings", hideForInstructor: true, icon: Puzzle },
  { label: "Class Apps", path: "kiwi-apps", hideForInstructor: true, icon: Blocks },
  { label: "Enroll Students", path: "enroll-students", hideForInstructor: true, icon: UserPlus },
  { label: "Class Email", path: "send-emails", hideForInstructor: true, icon: Mail },
  { label: "Class Analytics", path: "professor-analytics", icon: StackedBarChartOutlinedIcon, requiresInstructorPermission: 'canViewAnalytics' },
  { label: "Experiments", path: "experiments", icon: ExperimentIcon },
];

export const ClassLayout: React.FC = () => {
  const { classID } = useParams();
  const { setCurrentClassId } = useGlobalChat();
  const navigate = useNavigate();
  const location = useLocation();
  const { setClassNavigation } = useAdminNavigation();
  const navigationClassName = (location.state as { className?: string } | null)?.className;
  const [classInfo, setClassInfo] = useState<ClassInfo | null>(
    navigationClassName ? { className: navigationClassName } : null,
  );
  const [userRole, setUserRole] = useState<string | null>(null);
  const [roleLoading, setRoleLoading] = useState(true);
  const [classLoading, setClassLoading] = useState(!navigationClassName);
  const [instructorPermissions, setInstructorPermissions] = useState<{
    classID: string;
    canManageMaterials: boolean;
    canViewAnalytics: boolean;
  } | null>(null);
  const classBasePath = `/admin/class/${classID}/`;
  const relativePath = location.pathname.startsWith(classBasePath)
    ? location.pathname.slice(classBasePath.length)
    : "";

  // Give the global chat this class's context so class-scoped tools (e.g.
  // the instructor-only class-analytics tool) load on admin class pages too.
  useEffect(() => {
    if (classID) {
      setCurrentClassId(classID);
    }
    return () => setCurrentClassId(undefined);
  }, [classID, setCurrentClassId]);

  // Fetch user role
  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        const response = await apiClient.authControllerGetUserRole();
        setUserRole(response.role || null);
      } catch (error) {
        console.error('Error fetching user role:', error);
        setUserRole(null);
      } finally {
        setRoleLoading(false);
      }
    };

    fetchUserRole();
  }, []);

  // For instructors, fetch their per-class permissions so we can hide
  // sidebar items they don't have access to.
  useEffect(() => {
    if (userRole !== 'instructor' || !classID) {
      setInstructorPermissions(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const data = await apiClient.instructorClassControllerGetMyInstructorPermissions({
          classId: classID,
        });
        if (cancelled) return;
        if (data.isAssigned && data.permissions) {
          setInstructorPermissions({
            classID,
            canManageMaterials: !!data.permissions.canManageMaterials,
            canViewAnalytics: !!data.permissions.canViewAnalytics,
          });
        } else {
          setInstructorPermissions({ classID, canManageMaterials: false, canViewAnalytics: false });
        }
      } catch {
        if (!cancelled) setInstructorPermissions({ classID, canManageMaterials: false, canViewAnalytics: false });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userRole, classID]);

  useEffect(() => {
    const fetchClassInfo = async () => {
      if (!classID) return;

      try {
        setClassLoading(true);
        const response = await apiClient.classControllerGetById({ classID });
        setClassInfo({
          className: response.className,
        });
      } catch (err) {
        console.error('Error fetching class info:', err);
      } finally {
        setClassLoading(false);
      }
    };

    fetchClassInfo();
  }, [classID]);

  // Filter built-in class menu items based on role and per-class permissions.
  const menuReady =
    !roleLoading &&
    userRole !== null &&
    (userRole !== 'instructor' || instructorPermissions?.classID === classID);
  const menuItems = useMemo(() => menuReady
    ? allMenuItems.filter(item => {
        if (item.hideForInstructor && userRole === 'instructor') return false;
        if (
          item.requiresInstructorPermission &&
          userRole === 'instructor' &&
          instructorPermissions !== null &&
          !instructorPermissions[item.requiresInstructorPermission]
        ) {
          return false;
        }
        return true;
      })
    : [], [instructorPermissions, menuReady, userRole]);

  const handleMenuItemClick = useCallback((path: string) => {
    navigate(`/admin/class/${classID}/${path}`);
  }, [classID, navigate]);

  const activeMenuPath = menuItems.find(
    (item) => relativePath === item.path || relativePath.startsWith(`${item.path}/`),
  )?.path ?? (relativePath === '' ? 'edit-metadata' : false);
  const classSidebarItems = useMemo(() => menuItems.map((item) => {
    const IconComponent = item.icon;
    return {
      key: item.path,
      label: item.label,
      icon: <IconComponent />,
      selected: activeMenuPath === item.path,
      onClick: () => handleMenuItemClick(item.path),
    };
  }), [activeMenuPath, handleMenuItemClick, menuItems]);
  const classNavigation = useMemo(() => ({
    items: classSidebarItems,
    className: classInfo?.className,
    classNameLoading: classLoading && !classInfo?.className,
  }), [classInfo?.className, classLoading, classSidebarItems]);

  useLayoutEffect(() => {
    setClassNavigation(classNavigation);
  }, [classNavigation, setClassNavigation]);

  return <Outlet />;
};
