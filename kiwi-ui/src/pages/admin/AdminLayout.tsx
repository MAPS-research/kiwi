import {
  AppsOutlined as AppsIcon,
  ApprovalOutlined as ApprovalIcon,
  DnsOutlined as McpServersIcon,
  EmailOutlined as EmailIcon,
  FlagOutlined as FlagIcon,
  MarkEmailReadOutlined as EmailAuditIcon,
  MenuOpenOutlined as CollapseSidebarIcon,
  MenuOutlined as ExpandSidebarIcon,
  SchoolOutlined as SchoolIcon,
  SupervisorAccountOutlined as UserManagementIcon,
  WebhookOutlined as WebhookIcon,
} from "@mui/icons-material";
import StackedBarChartOutlinedIcon from "@mui/icons-material/StackedBarChartOutlined";
import {
  Box,
  Drawer,
  IconButton,
  Skeleton,
  useMediaQuery,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import React, { useEffect, useMemo, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import NavigationSidebar from "../../components/NavigationSidebar/NavigationSidebar.tsx";
import TopNav, {
  TOP_NAV_BRAND_AREA_WIDTH,
  TOP_NAV_HEIGHT,
  type ClassSwitcherOption,
} from "../../components/TopNav/TopNav.tsx";
import {
  AdminNavigationContext,
  type AdminAppNavigation,
  type AdminClassNavigation,
} from "../../context/AdminNavigationContext.tsx";
import apiClient, { kiwiAppsApiClient } from "../../utils/api.ts";
import type { AppResponseDto, AppUIResponseDto } from "../../services/models/index.ts";
import { useContentResize } from "../../hooks/useContentResize.ts";
import {
  ALL_CLASSES_ADMIN_LABEL,
  ALL_CLASSES_SCOPE_ID,
  canRoleSeeAdminUI,
  getActiveAdminAppSlug,
  getAdminAppPath,
  getAdminClassScopeRoute,
  getVisibleClassScopeOptions,
} from "../../apps/adminNavigation.ts";

const allSidebarItems = [
  {
    label: "Classes",
    path: "/admin/classes",
    icon: <SchoolIcon />,
    roles: ["admin", "instructor"],
  },
  {
    label: "Users",
    path: "/admin/user-management",
    icon: <UserManagementIcon />,
    roles: ["admin"],
  },
  {
    label: "System analytics",
    path: "/admin/analytics",
    icon: <StackedBarChartOutlinedIcon />,
    roles: ["admin"],
  },
  {
    label: "System email",
    path: "/admin/email",
    icon: <EmailIcon />,
    roles: ["admin"],
  },
  {
    label: "Email audit",
    path: "/admin/email-audit",
    icon: <EmailAuditIcon />,
    roles: ["admin"],
  },
  {
    label: "System flags",
    path: "/admin/feature-flags",
    icon: <FlagIcon />,
    roles: ["admin"],
  },
  {
    label: "MCP servers",
    path: "/admin/mcp-servers",
    icon: <McpServersIcon />,
    roles: ["admin"],
  },
  {
    label: "App registry",
    path: "/admin/kiwi-apps",
    icon: <AppsIcon />,
    roles: ["admin"],
  },
  {
    label: "Webhooks",
    path: "/admin/webhooks",
    icon: <WebhookIcon />,
    roles: ["admin"],
  },
  {
    label: "Webhook approvals",
    path: "/admin/webhooks/approvals",
    icon: <ApprovalIcon />,
    roles: ["admin"],
  },
];

interface AdminAppItem {
  slug: string;
  name: string;
  uiUrl: string;
  uiSlug?: string;
}

// The top bar's brand area lines up with the open rail (--size-sidebar, 220 px).
const ADMIN_SIDEBAR_WIDTH = TOP_NAV_BRAND_AREA_WIDTH;

/** The rail while the role loads: one skeleton row per entry, on the sidebar-item geometry. */
const AdminSidebarSkeleton = () => (
  <Box
    component="aside"
    aria-label="Loading admin navigation"
    aria-busy="true"
    sx={{
      width: "var(--size-sidebar)",
      flexShrink: 0,
      bgcolor: "background.paper",
      borderRight: "1px solid var(--border)",
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
    }}
  >
    <Box sx={{ flexGrow: 1, py: "var(--space-2)" }}>
      {Array.from({ length: allSidebarItems.length }).map((_, index) => (
        <Box
          key={index}
          sx={{
            minHeight: "var(--sidebar-item-height)",
            mx: "var(--sidebar-item-margin-x)",
            px: "var(--sidebar-item-padding-x)",
            display: "flex",
            alignItems: "center",
            gap: "var(--sidebar-item-gap)",
          }}
        >
          <Skeleton
            variant="rounded"
            sx={{
              flexShrink: 0,
              width: "var(--sidebar-item-icon-size)",
              height: "var(--sidebar-item-icon-size)",
              borderRadius: "var(--radius-small)",
            }}
          />
          {/* A text line is square: a radius would round it into a pill. */}
          <Skeleton
            variant="text"
            width={index % 3 === 0 ? 112 : index % 3 === 1 ? 136 : 96}
            sx={{ fontSize: "var(--type-label-size)" }}
          />
        </Box>
      ))}
    </Box>

    <Box
      sx={{
        flexShrink: 0,
        display: "flex",
        justifyContent: "flex-end",
        borderTop: "1px solid var(--border-subtle)",
        p: "var(--space-2)",
      }}
    >
      <Skeleton
        variant="rounded"
        sx={{
          width: "var(--icon-button-size)",
          height: "var(--icon-button-size)",
          borderRadius: "var(--icon-button-radius)",
        }}
      />
    </Box>
  </Box>
);

const AdminLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const [drawerOpen, setDrawerOpen] = useState(true);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [adminApps, setAdminApps] = useState<AdminAppItem[]>([]);
  const [classOptions, setClassOptions] = useState<ClassSwitcherOption[]>([]);
  const [classOptionsLoading, setClassOptionsLoading] = useState(false);
  const [classOptionsLoaded, setClassOptionsLoaded] = useState(false);
  const [classNavigation, setClassNavigation] =
    useState<AdminClassNavigation | null>(null);
  const [appNavigation, setAppNavigation] =
    useState<AdminAppNavigation | null>(null);
  const contentResizeStyles = useContentResize();
  const adminNavigationContextValue = useMemo(
    () => ({ setClassNavigation, setAppNavigation }),
    [],
  );

  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        const response = await apiClient.authControllerGetUserRole();
        setUserRole(response.role || null);
      } catch (error) {
        console.error("Error fetching user role:", error);
        setUserRole(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserRole();
  }, []);

  // Fetch apps with admin-panel UIs
  useEffect(() => {
    const fetchAdminApps = async () => {
      try {
        // Get all registered apps
        const apps = await kiwiAppsApiClient.kiwiAppControllerListApps({});

        // For each app, check if it has an admin-panel UI
        const appsWithAdminUI: AdminAppItem[] = [];

        for (const app of apps) {
          try {
            const uis = await kiwiAppsApiClient.kiwiAppControllerGetAppUIs({
              slug: app.slug,
            });

            const adminUI = uis.find(
              (ui) => ui.placement === "admin-panel" && ui.isEnabled,
            );

            const roleCanSeeUI = canRoleSeeAdminUI(
              userRole,
              adminUI?.allowedRoles,
            );

            if (adminUI && roleCanSeeUI) {
              appsWithAdminUI.push({
                slug: app.slug,
                name: adminUI.uiName || app.name,
                uiUrl: adminUI.uiUrl,
                uiSlug: adminUI.uiSlug,
              });
            }
          } catch (err) {
            // App might not have UIs registered yet
            console.debug(`No UIs found for app ${app.slug}`);
          }
        }

        setAdminApps(appsWithAdminUI);
      } catch (error) {
        console.error("Error fetching admin apps:", error);
      }
    };

    if (userRole === "admin" || userRole === "instructor") {
      fetchAdminApps();
    }
  }, [userRole]);

  const toggleDrawer = () => {
    setDrawerOpen((open) => !open);
  };

  useEffect(() => {
    setMobileDrawerOpen(false);
  }, [location.pathname]);

  // Filter sidebar items based on user role
  const sidebarItems = allSidebarItems.filter(
    (item) => userRole && item.roles.includes(userRole),
  );

  const shouldShowSidebar =
    !isLoading && (userRole === "admin" || userRole === "instructor");
  const navigateFromSidebar = (path: string) => {
    navigate(path);
    if (isMobile) setMobileDrawerOpen(false);
  };
  const classNavigationExpanded = location.pathname.startsWith("/admin/class/");
  const classScopeRoute = getAdminClassScopeRoute(location.pathname);
  const selectedClassId = classScopeRoute.classId
    ? classScopeRoute.classId
    : userRole === "admin"
      ? ALL_CLASSES_SCOPE_ID
      : undefined;
  const classRouteSuffix = classScopeRoute.legacyClassSuffix;
  const activeAdminAppSlug = getActiveAdminAppSlug(location.pathname);
  const canSelectClassScope =
    userRole === "admin" || userRole === "instructor";

  useEffect(() => {
    if (!userRole || (userRole !== "admin" && userRole !== "instructor")) {
      setClassOptionsLoading(false);
      setClassOptionsLoaded(false);
      setClassOptions([]);
      return;
    }

    let cancelled = false;

    const fetchClassOptions = async () => {
      setClassOptionsLoading(true);
      setClassOptionsLoaded(false);

      try {
        let classIds: string[] = [];

        if (userRole === "instructor") {
          const response =
            await apiClient.instructorClassControllerGetInstructorClasses();
          classIds = (response.classes as unknown[])
            .map((entry) => {
              if (typeof entry === "string") return entry;
              if (entry && typeof entry === "object") {
                const classEntry = entry as { classID?: string; id?: string };
                return classEntry.classID ?? classEntry.id;
              }
              return undefined;
            })
            .filter((id): id is string => Boolean(id));
        } else {
          const response = await apiClient.classControllerList();
          classIds = response.classIds;
        }

        const options = await Promise.all(
          classIds.map(async (classId) => {
            try {
              const classInfo = await apiClient.classControllerGetById({
                classID: classId,
              });
              return {
                id: classInfo.id,
                label: classInfo.className || "Untitled class",
              };
            } catch (error) {
              console.warn(
                `[AdminLayout] Could not load class ${classId}:`,
                error,
              );
              return null;
            }
          }),
        );

        if (!cancelled) {
          const sortedClasses = options
            .filter((option): option is ClassSwitcherOption => option !== null)
            .sort((a, b) => a.label.localeCompare(b.label));
          setClassOptions(getVisibleClassScopeOptions(userRole, sortedClasses));
        }
      } catch (error) {
        console.error("[AdminLayout] Could not load class switcher:", error);
        if (!cancelled) setClassOptions([]);
      } finally {
        if (!cancelled) {
          setClassOptionsLoading(false);
          setClassOptionsLoaded(true);
        }
      }
    };

    fetchClassOptions();

    return () => {
      cancelled = true;
    };
  }, [userRole]);

  // The classless app route is the admin-wide scope. If an instructor reaches
  // it through a bookmark or browser history, keep the UI inside the scopes
  // offered by the selector instead of loading an admin-only global panel.
  useEffect(() => {
    if (
      userRole !== "instructor" ||
      !activeAdminAppSlug ||
      classScopeRoute.classId ||
      !classOptionsLoaded
    ) {
      return;
    }

    const firstAssignedClass = classOptions[0];
    navigate(
      firstAssignedClass
        ? getAdminAppPath(activeAdminAppSlug, firstAssignedClass.id)
        : "/admin/classes",
      { replace: true },
    );
  }, [
    activeAdminAppSlug,
    classOptions,
    classOptionsLoaded,
    classScopeRoute.classId,
    navigate,
    userRole,
  ]);

  const handleClassChange = (classId: string) => {
    const selectedOption = classOptions.find((option) => option.id === classId);

    if (classId === ALL_CLASSES_SCOPE_ID) {
      navigate({
        pathname: activeAdminAppSlug
          ? getAdminAppPath(activeAdminAppSlug)
          : "/admin/classes",
        search: location.search,
        hash: location.hash,
      });
      return;
    }

    const encodedClassId = encodeURIComponent(classId);
    const pathname = activeAdminAppSlug
      ? getAdminAppPath(activeAdminAppSlug, classId)
      : classNavigationExpanded
        ? `/admin/class/${encodedClassId}${classRouteSuffix}`
        : `/admin/class/${encodedClassId}`;

    navigate(
      {
        pathname,
        search: location.search,
        hash: location.hash,
      },
      { state: { className: selectedOption?.label } },
    );
  };

  // If the rail/drawer is already hidden there is no visible exit animation to
  // wait for, so release the retained class menu immediately. When it is
  // visible, NavigationSidebar clears it from Collapse.onExited instead.
  useEffect(() => {
    const navigationIsHidden = isMobile ? !mobileDrawerOpen : !drawerOpen;
    if (classNavigation && !classNavigationExpanded && navigationIsHidden) {
      setClassNavigation(null);
    }
  }, [
    classNavigation,
    classNavigationExpanded,
    drawerOpen,
    isMobile,
    mobileDrawerOpen,
  ]);

  const sidebarSections = [
    {
      items: [
        ...sidebarItems.map((item) => {
          const isClassesItem = item.path === "/admin/classes";
          return {
            key: item.path,
            label: isClassesItem && userRole === "instructor" ? "Your classes" : item.label,
            icon: item.icon,
            selected: location.pathname === item.path,
            active: isClassesItem && classNavigationExpanded,
            expanded: isClassesItem ? classNavigationExpanded : undefined,
            children: isClassesItem ? classNavigation?.items : undefined,
            onChildrenExited: isClassesItem
              ? () => setClassNavigation(null)
              : undefined,
            onClick: () => navigateFromSidebar(item.path),
          };
        }),
        ...adminApps.map((app) => {
          const appPath = `/admin/app/${app.slug}`;
          const appNavigationExpanded =
            activeAdminAppSlug === app.slug && appNavigation?.appSlug === app.slug;
          return {
            key: appPath,
            label: app.name,
            icon: <AppsIcon />,
            selected: activeAdminAppSlug === app.slug,
            active: appNavigationExpanded,
            expanded: appNavigationExpanded ? true : undefined,
            children: appNavigationExpanded ? appNavigation.items : undefined,
            onClick: () => {
              if (selectedClassId && selectedClassId !== ALL_CLASSES_SCOPE_ID) {
                navigateFromSidebar(
                  getAdminAppPath(app.slug, selectedClassId),
                );
                return;
              }

              if (userRole === "instructor") {
                const firstAssignedClass = classOptions[0];
                navigateFromSidebar(
                  firstAssignedClass
                    ? getAdminAppPath(app.slug, firstAssignedClass.id)
                    : "/admin/classes",
                );
                return;
              }

              navigateFromSidebar(appPath);
            },
          };
        }),
      ],
    },
  ];

  return (
    <AdminNavigationContext.Provider value={adminNavigationContextValue}>
      {/* The whole admin area is compact; reading regions inside set their own density. */}
      <Box
        data-density="compact"
        sx={{
          display: "flex",
          flexDirection: "column",
          minHeight: "100vh",
          ...contentResizeStyles,
        }}
      >
        {/* Top Navigation - spans full width */}
        <TopNav
          brandAreaWidth={!isMobile ? ADMIN_SIDEBAR_WIDTH : undefined}
          onMenuToggle={
            isMobile && shouldShowSidebar
              ? () => setMobileDrawerOpen((open) => !open)
              : undefined
          }
          contextLabel={
            !canSelectClassScope
              ? undefined
              : selectedClassId === ALL_CLASSES_SCOPE_ID
              ? ALL_CLASSES_ADMIN_LABEL
              : classNavigationExpanded
              ? classNavigation?.className ||
                (classNavigation && !classNavigation.classNameLoading
                  ? "Untitled class"
                  : undefined)
              : selectedClassId
                ? classOptions.find((option) => option.id === selectedClassId)
                    ?.label
                : "Select a class"
          }
          contextLoading={
            canSelectClassScope &&
            (!classOptionsLoaded ||
              classOptionsLoading ||
              // Only wait on a class navigation that exists and says it is
              // loading. `?? true` treated "no navigation at all" as "still
              // loading", which never resolves on a /admin/class/ route that
              // ClassLayout does not own — the document annotation page —
              // leaving a skeleton pill in the top bar forever.
              (classNavigationExpanded &&
                classNavigation !== null &&
                Boolean(classNavigation.classNameLoading)))
          }
          classOptions={classOptions}
          classOptionsLoading={classOptionsLoading}
          selectedClassId={selectedClassId}
          selectedClassKind={
            selectedClassId === ALL_CLASSES_SCOPE_ID
              ? "admin-all-classes"
              : undefined
          }
          onClassChange={canSelectClassScope ? handleClassChange : undefined}
          classEmptyLabel={
            userRole === "instructor"
              ? "No classes assigned to you yet. An administrator assigns them."
              : "No classes yet"
          }
        />

        {/* Content area with sidebar */}
        <Box
          sx={{
            display: "flex",
            flexGrow: 1,
            minHeight: 0,
            height: `calc(100vh - ${TOP_NAV_HEIGHT}px)`,
            overflow: "hidden",
          }}
        >
          {/* Primary admin navigation */}
          {isLoading && !isMobile && <AdminSidebarSkeleton />}

          {shouldShowSidebar && !isMobile && (
            <NavigationSidebar
              ariaLabel="Admin navigation"
              open={drawerOpen}
              footer={
                <Box
                  sx={{ display: "flex", justifyContent: "flex-end", p: "var(--space-2)" }}
                >
                  <IconButton
                    onClick={toggleDrawer}
                    aria-label={
                      drawerOpen
                        ? "Collapse admin navigation"
                        : "Expand admin navigation"
                    }
                  >
                    {drawerOpen ? (
                      <CollapseSidebarIcon />
                    ) : (
                      <ExpandSidebarIcon />
                    )}
                  </IconButton>
                </Box>
              }
              sections={sidebarSections}
            />
          )}

          {shouldShowSidebar && isMobile && (
            <Drawer
              variant="temporary"
              open={mobileDrawerOpen}
              onClose={() => setMobileDrawerOpen(false)}
              ModalProps={{ keepMounted: true }}
              slotProps={{
                paper: {
                  sx: {
                    top: TOP_NAV_HEIGHT,
                    width: "var(--size-sidebar-drawer)",
                    height: `calc(100% - ${TOP_NAV_HEIGHT}px)`,
                  },
                },
              }}
            >
              {/* The drawer renders in a portal, outside the compact root: restate the density. */}
              <Box data-density="compact" sx={{ display: "flex", height: "100%", minHeight: 0 }}>
                <NavigationSidebar
                  ariaLabel="Admin navigation"
                  open
                  width="var(--size-sidebar-drawer)"
                  sections={sidebarSections}
                />
              </Box>
            </Drawer>
          )}

          {/* Main content */}
          <Box
            component="main"
            sx={{
              flexGrow: 1,
              minWidth: 0,
              width: isMobile ? "100%" : "auto",
              p: 0,
              ml: shouldShowSidebar ? 0 : 0,
              overflow: "auto",
              height: `calc(100vh - ${TOP_NAV_HEIGHT}px)`,
              // The canvas: pages are rules and sections on it, panels are sheets on it.
              bgcolor: "background.default",
            }}
          >
            <Outlet />
          </Box>
        </Box>
      </Box>
    </AdminNavigationContext.Provider>
  );
};

export default AdminLayout;
