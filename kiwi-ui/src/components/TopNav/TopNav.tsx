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
import DisplayMenu from "./DisplayMenu.tsx";

export type { ClassSwitcherOption } from "./ClassSwitcher.tsx";

interface TopNavProps {
  onMenuToggle?: () => void;
  contextLabel?: string;
  contextLoading?: boolean;
  /**
   * @deprecated The bar no longer reserves a fixed brand area: the logo, the
   * divider and the class switcher sit side by side (Stage 1 preview, SR-1).
   * Still accepted so existing callers compile; it has no effect.
   */
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

/**
 * The top bar (JOURNEY SR-1; the Stage 1 preview's `header.topbar`): a 52 px
 * sheet closed by a hairline, with the logo, the class context and a right-hand
 * group of 44 px icon buttons. Its geometry is fixed on both route areas; the
 * class switcher and the glyphs follow the area's density (compact on admin
 * routes), so the bar carries that density itself.
 */
const TopNav = ({
  onMenuToggle,
  contextLabel,
  contextLoading = false,
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
  const viewLabel = isAdmin ? "Admin view" : "Instructor view";

  return (
    <AppBar
      position="static"
      data-density={isAdminRoute ? "compact" : "comfortable"}
      sx={{
        zIndex: "var(--z-top-bar)",
        // The bar closes on the light hairline; the theme's AppBar edge is the panel edge.
        borderBottom: "1px solid var(--border-subtle)",
      }}
    >
      <Toolbar
        variant="dense"
        disableGutters
        sx={{
          minHeight: "var(--size-top-bar)",
          height: "var(--size-top-bar)",
          gap: "var(--space-2)",
          pl: { xs: "var(--space-3)", sm: "var(--space-4)" },
          pr: { xs: "var(--space-2)", sm: "var(--space-3)" },
          // Fixed geometry: every icon button in the bar is 44 px in both densities.
          "& .MuiIconButton-root": {
            width: "var(--size-top-bar-button)",
            height: "var(--size-top-bar-button)",
            flexShrink: 0,
          },
        }}
      >
        {/* Opens the admin sidebar's drawer (admin routes below md only) */}
        {isAdminRoute && onMenuToggle && (
          <Tooltip title="Open navigation menu">
            <IconButton aria-label="Open navigation menu" onClick={onMenuToggle}>
              <MenuIcon />
            </IconButton>
          </Tooltip>
        )}

        {/* Logo */}
        <Box
          component={RouterLink}
          to={isAdminRoute ? "/admin" : "/"}
          sx={{
            display: "inline-flex",
            alignItems: "center",
            minHeight: "var(--size-target-min)",
            flexShrink: 0,
            textDecoration: "none",
            color: "inherit",
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
                height: "var(--space-5)",
                mx: "var(--space-1)",
                flexShrink: 0,
                bgcolor: "var(--border-subtle)",
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
                  noWrap
                  title={contextLabel}
                  sx={{ color: "text.primary" }}
                >
                  {contextLabel}
                </Typography>
              )}
            </Box>
          </>
        )}

        {/* Spacer to push buttons to the right */}
        <Box sx={{ flexGrow: 1 }} />

        <Box sx={{ display: "inline-flex", alignItems: "center", flexShrink: 0 }}>
          {/* Student view: on admin routes, for instructors and admins */}
          {isAdminRoute && isInstructorOrAdmin && (
            <Tooltip title="Switch to student view">
              <IconButton aria-label="Switch to student view" onClick={() => navigate("/")}>
                <StudentViewIcon />
              </IconButton>
            </Tooltip>
          )}

          {/* Instructor or admin view: on student routes, for instructors and admins */}
          {!isAdminRoute && isInstructorOrAdmin && (
            <Tooltip title={`Switch to ${viewLabel}`}>
              <IconButton
                aria-label={`Switch to ${viewLabel}`}
                onClick={() => navigate("/admin")}
              >
                {isAdmin ? <AdminViewIcon /> : <InstructorViewIcon />}
              </IconButton>
            </Tooltip>
          )}

          {/* Display settings: theme and Kiwi animation (shown when the deployment offers either) */}
          <DisplayMenu />

          <Tooltip title="Sign out">
            <IconButton component="a" href="/logout" aria-label="Sign out">
              <LogoutIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default TopNav;
