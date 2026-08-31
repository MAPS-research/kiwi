import {
  AppBar,
  Box,
  IconButton,
  Skeleton,
  Toolbar,
  Tooltip,
  Typography,
} from "@mui/material";
import {
  AdminPanelSettingsOutlined as AdminViewIcon,
  Logout as LogoutIcon,
  Menu as MenuIcon,
  MenuBookOutlined as StudentViewIcon,
  SchoolOutlined as InstructorViewIcon,
} from "@mui/icons-material";
import { Link as RouterLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext.tsx";
import ClassSwitcher, {
  type ClassSwitcherOption,
} from "./ClassSwitcher.tsx";
import InstitutionLogo from "../Brand/InstitutionLogo.tsx";

export type { ClassSwitcherOption } from "./ClassSwitcher.tsx";

interface TopNavProps {
  onMenuToggle?: () => void;
  contextLabel?: string;
  contextLoading?: boolean;
  brandAreaWidth?: number;
  classOptions?: ClassSwitcherOption[];
  classOptionsLoading?: boolean;
  selectedClassId?: string;
  selectedClassKind?: ClassSwitcherOption["kind"];
  onClassChange?: (classId: string) => void;
  classEmptyLabel?: string;
}

export const TOP_NAV_HEIGHT = 52;
export const TOP_NAV_BRAND_AREA_WIDTH = 220;

const TopNav = ({
  onMenuToggle,
  contextLabel,
  contextLoading = false,
  brandAreaWidth,
  classOptions = [],
  classOptionsLoading = false,
  selectedClassId,
  selectedClassKind,
  onClassChange,
  classEmptyLabel,
}: TopNavProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdminRoute = location.pathname.startsWith("/admin");
  const isAdmin = user?.systemRole === "admin" || user?.isAdmin === true;
  const isInstructorOrAdmin = user?.systemRole === "instructor" || isAdmin;
  const showClassSwitcher = Boolean(onClassChange);

  const getViewLabel = () => {
    return isAdmin ? "Admin View" : "Instructor View";
  };

  const headerIconButtonSx = {
    width: 44,
    height: 44,
    borderRadius: "6px",
    color: "text.secondary",
    "&:hover": {
      backgroundColor: "action.hover",
      color: "primary.main",
    },
    "&:focus-visible": {
      outline: "2px solid",
      outlineColor: "primary.main",
      outlineOffset: "-2px",
    },
  };

  return (
    <AppBar
      position="static"
      elevation={0}
      color="inherit"
      sx={{
        zIndex: 1000,
        bgcolor: "background.paper",
        color: "text.secondary",
        borderBottom: 1,
        borderColor: "divider",
      }}
    >
      <Toolbar
        sx={{
          minHeight: TOP_NAV_HEIGHT,
          height: TOP_NAV_HEIGHT,
          pl: brandAreaWidth === undefined ? 2 : 0,
          pr: 2,
          "@media (min-width:600px)": {
            minHeight: TOP_NAV_HEIGHT,
            pl: brandAreaWidth === undefined ? 2 : 0,
            pr: 2,
          },
        }}
      >
        {/* Menu Button for Admin Routes */}
        {isAdminRoute && onMenuToggle && (
          <IconButton
            aria-label="Toggle navigation menu"
            color="inherit"
            edge="start"
            onClick={onMenuToggle}
            sx={{ ...headerIconButtonSx, mr: 1 }}
          >
            <MenuIcon />
          </IconButton>
        )}

        {/* Logo */}
        <Box
          component={RouterLink}
          to={location.pathname.startsWith("/admin") ? "/admin" : "/"}
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-start",
            width: brandAreaWidth,
            boxSizing: "border-box",
            pl: brandAreaWidth === undefined ? 0 : 2,
            flexShrink: 0,
            height: 44,
            textDecoration: "none",
            borderRadius: "8px",
            "&:focus-visible": {
              outline: "2px solid",
              outlineColor: "primary.main",
              outlineOffset: "-2px",
            },
          }}
        >
          <InstitutionLogo />
        </Box>

        {(contextLabel || contextLoading || showClassSwitcher) && (
          <>
            <Box
              component="span"
              aria-hidden="true"
              data-testid="top-nav-context-divider"
              sx={{
                width: "1px",
                height: 24,
                ml: brandAreaWidth === undefined ? 2 : 0,
                mr: 2,
                flexShrink: 0,
                bgcolor: "divider",
              }}
            />
            <Box
              sx={{
                minWidth: 0,
                maxWidth: { xs: 200, sm: 280, md: 360 },
                display: "flex",
                alignItems: "center",
              }}
            >
              {contextLoading && !contextLabel ? (
                <Skeleton
                  aria-label="Loading class name"
                  variant="text"
                  width={144}
                  sx={{ typography: "body2" }}
                />
              ) : showClassSwitcher ? (
                <ClassSwitcher
                  options={classOptions}
                  optionsLoading={classOptionsLoading}
                  selectedClassId={selectedClassId!}
                  selectedClassLabel={contextLabel}
                  selectedClassKind={selectedClassKind}
                  onClassChange={onClassChange!}
                  emptyLabel={classEmptyLabel}
                  onCreateClass={
                    isAdmin ? () => navigate("/admin/new-class") : undefined
                  }
                />
              ) : (
                <Typography
                  variant="h6"
                  color="text.primary"
                  fontWeight={600}
                  noWrap
                  title={contextLabel}
                >
                  {contextLabel}
                </Typography>
              )}
            </Box>
          </>
        )}

        {/* Spacer to push buttons to the right */}
        <Box sx={{ flexGrow: 1 }} />

        {/* Student View Button - only show on admin routes */}
        {isAdminRoute && isInstructorOrAdmin && (
          <Tooltip title="Switch to Student View">
            <IconButton
              aria-label="Switch to Student View"
              onClick={() => navigate("/")}
              sx={{ ...headerIconButtonSx, mr: 1 }}
            >
              <StudentViewIcon />
            </IconButton>
          </Tooltip>
        )}

        {/* Instructor/Admin View Button - only show on student routes for instructors/admins */}
        {!isAdminRoute && isInstructorOrAdmin && (
          <Tooltip title={`Switch to ${getViewLabel()}`}>
            <IconButton
              aria-label={`Switch to ${getViewLabel()}`}
              onClick={() => navigate("/admin")}
              sx={{ ...headerIconButtonSx, mr: 1 }}
            >
              {isAdmin ? <AdminViewIcon /> : <InstructorViewIcon />}
            </IconButton>
          </Tooltip>
        )}

        {/* Logout Button */}
        <Tooltip title="Logout">
          <IconButton
            component="a"
            href="/logout"
            aria-label="Logout"
            sx={headerIconButtonSx}
          >
            <LogoutIcon />
          </IconButton>
        </Tooltip>
      </Toolbar>
    </AppBar>
  );
};

export default TopNav;
