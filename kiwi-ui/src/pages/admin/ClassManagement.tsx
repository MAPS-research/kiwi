import {
  Box,
  Typography
} from "@mui/material";
import Grid from "@mui/material/Grid";
import {
  AppsOutlined as Blocks,
  DescriptionOutlined as FileText,
  EditOutlined as PenSquare,
  EmailOutlined as Mail,
  ExtensionOutlined as Puzzle,
  FlagOutlined as Flag,
  PersonAddOutlined as UserPlus,
  ScienceOutlined as FlaskConical,
} from "@mui/icons-material";
import StackedBarChartOutlinedIcon from '@mui/icons-material/StackedBarChartOutlined';
import React, { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import apiClient, { classAppsApiClient, kiwiAppsApiClient } from "../../utils/api.ts";
import { AdminPageHeader } from "../../components/AdminPage/index.ts";

interface ShortcutOption {
  label: string;
  icon: React.ReactNode;
  path: string;
}

const ClassManagement: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { classID } = useParams<{ classID: string }>();
  const [className, setClassName] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  // Class-scoped admin surfaces contributed by the apps this class has enabled.
  // The host names no app: it shows whatever each app registered with placement
  // 'class-admin-panel'.
  const [appShortcuts, setAppShortcuts] = useState<
    Array<{ label: string; icon: React.ReactNode; path: string; roles: string[] }>
  >([]);

  useEffect(() => {
    if (!classID) return;
    let cancelled = false;

    (async () => {
      try {
        const apps = await classAppsApiClient.classKiwiAppControllerGetClassApps({
          classId: classID,
        });
        const enabled = apps.filter((a) => a.isEnabled);

        const perApp = await Promise.all(
          enabled.map(async (app) => {
            try {
              const uis = await kiwiAppsApiClient.kiwiAppControllerGetAppUIs({
                slug: app.slug,
              });
              return uis
                .filter((ui) => ui.placement === 'class-admin-panel' && ui.isEnabled)
                .map((ui) => ({
                  label: ui.uiName || app.name,
                  icon: <Blocks sx={{ fontSize: 50, color: "text.primary" }} />,
                  path: `/admin/class/${classID}/app/${app.slug}`,
                  roles: ['admin', 'instructor'],
                }));
            } catch {
              // An app with no registered UIs contributes no card.
              return [];
            }
          }),
        );

        if (!cancelled) setAppShortcuts(perApp.flat());
      } catch (err) {
        // Stay empty so an app card hides rather than promising a panel we
        // can't confirm exists.
        console.warn('[ClassManagement] Could not load class apps:', err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [classID]);

  useEffect(() => {
    // Try to get className from navigation state first
    const stateClassName = (location.state as any)?.className;

    if (stateClassName) {
      setClassName(stateClassName);
      setLoading(false);
    } else {
      // Only fetch if className is not in state
      const fetchClassName = async () => {
        if (!classID) return;

        try {
          setLoading(true);
          const classData = await apiClient.classControllerGetById({ classID });
          setClassName(classData.className || "Class");
        } catch (error) {
          console.error("Error fetching class name:", error);
          setClassName("Class");
        } finally {
          setLoading(false);
        }
      };

      fetchClassName();
    }

    // Fetch user role
    const fetchUserRole = async () => {
      try {
        const response = await apiClient.authControllerGetUserRole();
        setUserRole(response.role || null);
      } catch (error) {
        console.error("Error fetching user role:", error);
        setUserRole(null);
      }
    };

    fetchUserRole();
  }, [classID, location.state]);

  const allShortcuts: (ShortcutOption & { roles: string[] })[] = [
    {
      label: "Edit Class",
      icon: <PenSquare sx={{ fontSize: 50, color: "text.primary" }} />,
      path: `/admin/class/${classID}/edit-metadata`,
      roles: ['admin', 'instructor']
    },
    {
      label: "Materials",
      icon: <FileText sx={{ fontSize: 50, color: "text.primary" }} />,
      path: `/admin/class/${classID}/manage-materials`,
      roles: ['admin', 'instructor']
    },
    {
      label: "Class Flags",
      icon: <Flag sx={{ fontSize: 50, color: "text.primary" }} />,
      path: `/admin/class/${classID}/feature-flags`,
      roles: ['admin']
    },
    {
      label: "Class MCP & Tools",
      icon: <Puzzle sx={{ fontSize: 50, color: "text.primary" }} />,
      path: `/admin/class/${classID}/mcp-settings`,
      roles: ['admin']
    },
    {
      label: "Class Apps",
      icon: <Blocks sx={{ fontSize: 50, color: "text.primary" }} />,
      path: `/admin/class/${classID}/kiwi-apps`,
      roles: ['admin']
    },
    {
      label: "Enroll Students",
      icon: <UserPlus sx={{ fontSize: 50, color: "text.primary" }} />,
      path: `/admin/class/${classID}/enroll-students`,
      roles: ['admin']
    },
    {
      label: "Class Email",
      icon: <Mail sx={{ fontSize: 50, color: "text.primary" }} />,
      path: `/admin/class/${classID}/send-emails`,
      roles: ['admin']
    },
    {
      label: "Class Analytics",
      icon: <StackedBarChartOutlinedIcon sx={{ fontSize: 50, color: "text.primary" }} />,
      path: `/admin/class/${classID}/professor-analytics`,
      roles: ['admin', 'instructor']
    },
    {
      label: "Experiments",
      icon: <FlaskConical sx={{ fontSize: 50, color: "text.primary" }} />,
      path: `/admin/class/${classID}/experiments`,
      roles: ['admin', 'instructor']
    }
  ];

  // Filter shortcuts based on user role. App-contributed cards are appended
  // rather than interleaved: they arrive asynchronously, and slotting them
  // mid-grid would make the built-in cards jump as they load.
  const shortcuts = [...allShortcuts, ...appShortcuts].filter(
    shortcut => userRole && shortcut.roles.includes(userRole)
  );

  const handleShortcutClick = (path: string) => {
    navigate(path, { state: { className } });
  };

  return (
    <Box sx={{ display: 'flex', height: 'calc(100vh - 120px)', overflow: 'hidden' }}>
      {/* Main Content */}
      <Box
        sx={{
          flexGrow: 1,
          backgroundColor: "#fff",
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          height: '100%',
        }}
      >
        {/* Header */}
        <Box sx={{ backgroundColor: '#fff', flexShrink: 0, px: 4, pt: 1 }}>
          <AdminPageHeader
            title={loading ? "Loading class…" : className}
            description="Choose an area to manage for this class."
            back={{ label: "Classes", onClick: () => navigate("/admin/classes") }}
          />
        </Box>

        {/* Shortcuts Grid */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'flex-start',
            flexGrow: 1,
            minHeight: 0,
            overflowY: 'auto',
            px: 3,
            pt: 6,
            pb: 2,
          }}
        >
          <Grid container spacing={4} sx={{ maxWidth: '1200px' }}>
            {shortcuts.map((shortcut) => (
              <Grid
                key={shortcut.label}
                size={{
                  xs: 12,
                  sm: 3,
                  md: 3,
                }}
              >
                <Box
                  onClick={() => handleShortcutClick(shortcut.path)}
                  sx={{
                    p: 2,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    minHeight: 128,
                    cursor: "pointer",
                    transition: "all 0.2s",
                    "&:hover": {
                      transform: "translateY(-4px)",
                    }
                  }}
                >
                  <Box sx={{ mb: 1 }}>
                    {shortcut.icon}
                  </Box>
                  <Typography
                    variant="body1"
                    align="center"
                    sx={{ fontWeight: 400 }}
                  >
                    {shortcut.label}
                  </Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Box>


      </Box>

    </Box>
  );
};

export default ClassManagement;
