import { useId, useRef, useState, type KeyboardEvent } from "react";
import {
  Box,
  ButtonBase,
  CircularProgress,
  Fade,
  InputAdornment,
  MenuItem,
  MenuList,
  Popover,
  TextField,
  Typography,
  useMediaQuery,
} from "@mui/material";
import {
  AddRounded as AddIcon,
  AdminPanelSettingsOutlined as AdminScopeIcon,
  CheckRounded as CheckIcon,
  SearchRounded as SearchIcon,
  SchoolOutlined as ClassIcon,
  UnfoldMoreRounded as SwitcherIcon,
} from "@mui/icons-material";
import { CREATE_NEW_CLASS_LABEL } from "../../constants/classCopy.ts";
import { POPUP_FADE_DURATION_MS } from "../../theme/motion.ts";

export interface ClassSwitcherOption {
  id: string;
  label: string;
  kind?: "admin-all-classes";
}

export interface ClassSwitcherProps {
  options: ClassSwitcherOption[];
  optionsLoading?: boolean;
  selectedClassId?: string;
  selectedClassLabel?: string;
  selectedClassKind?: ClassSwitcherOption["kind"];
  onClassChange: (classId: string) => void;
  onCreateClass?: () => void;
  emptyLabel?: string;
}

/** The 16 px glyphs of the switcher, in the neutral icon colour. */
const smallIconSx = {
  fontSize: "var(--size-icon-sm)",
  color: "var(--icon-default)",
  flexShrink: 0,
};

/**
 * The class switcher in the top bar (JOURNEY SR-1, block 4; the Stage 1
 * preview's `button.class-switch`): one button with the class icon, the current
 * class and the unfold icon, opening a popover sheet with a search field, the
 * "Classes" listbox and, for admins, the create action.
 */
const ClassSwitcher = ({
  options,
  optionsLoading = false,
  selectedClassId,
  selectedClassLabel,
  selectedClassKind,
  onClassChange,
  onCreateClass,
  emptyLabel = "No classes yet",
}: ClassSwitcherProps) => {
  const reduceMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const [anchorElement, setAnchorElement] = useState<HTMLElement | null>(null);
  const [query, setQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const firstOptionRef = useRef<HTMLLIElement>(null);
  const listId = useId();
  const open = Boolean(anchorElement);

  const selectedOption =
    (selectedClassId
      ? options.find((option) => option.id === selectedClassId)
      : undefined) ??
    (selectedClassId && selectedClassLabel
      ? { id: selectedClassId, label: selectedClassLabel, kind: selectedClassKind }
      : null);
  const switcherOptions =
    selectedOption && !options.some((option) => option.id === selectedOption.id)
      ? [selectedOption, ...options]
      : options;
  const trimmedQuery = query.trim();
  const normalizedQuery = trimmedQuery.toLowerCase();
  const filteredOptions = switcherOptions.filter((option) =>
    `${option.label} ${option.id}`.toLowerCase().includes(normalizedQuery),
  );
  const currentLabel =
    selectedOption?.label ?? selectedClassLabel ?? "Select a class";
  // First use (nothing to list) or no results (a search that matches nothing).
  const noOptionsLabel =
    switcherOptions.length > 0 && trimmedQuery
      ? `No classes match "${trimmedQuery}"`
      : emptyLabel;
  const ScopeIcon =
    selectedOption?.kind === "admin-all-classes" ? AdminScopeIcon : ClassIcon;

  const close = () => {
    setAnchorElement(null);
    setQuery("");
  };

  const selectClass = (classId: string) => {
    if (classId !== selectedClassId) {
      onClassChange(classId);
    }
    close();
  };

  return (
    <>
      <ButtonBase
        aria-label={`Switch class. Current: ${currentLabel}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        onClick={(event) => {
          if (open) {
            close();
          } else {
            setAnchorElement(event.currentTarget);
            setQuery("");
          }
        }}
        sx={{
          minWidth: 0,
          maxWidth: "100%",
          height: "var(--size-control)",
          px: "var(--space-2)",
          gap: "var(--space-2)",
          justifyContent: "flex-start",
          borderRadius: "var(--radius-control)",
          color: "var(--text)",
          // The hit area grows to the control's hit size without changing the drawn button.
          "&::before": {
            content: '""',
            position: "absolute",
            left: 0,
            top: "50%",
            width: "100%",
            height: "max(100%, var(--size-hit-control))",
            transform: "translateY(-50%)",
          },
          "&:hover, &[aria-expanded='true']": { backgroundColor: "var(--surface-hover)" },
        }}
      >
        <ScopeIcon aria-hidden="true" sx={smallIconSx} />
        <Typography
          component="span"
          variant="subtitle2"
          noWrap
          title={currentLabel}
          sx={{ minWidth: 0 }}
        >
          {currentLabel}
        </Typography>
        <SwitcherIcon aria-hidden="true" sx={smallIconSx} />
      </ButtonBase>

      <Popover
        open={open}
        anchorEl={anchorElement}
        onClose={close}
        slots={{ transition: Fade }}
        transitionDuration={reduceMotion ? 0 : POPUP_FADE_DURATION_MS}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
        marginThreshold={12}
        slotProps={{
          paper: {
            sx: {
              mt: "var(--space-1)",
              width: { xs: "calc(100vw - 24px)", sm: 360 },
              maxWidth: 360,
              maxHeight: "min(480px, calc(100dvh - 24px))",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            },
          },
        }}
      >
        <Box
          data-density="compact"
          sx={{
            p: "var(--space-2)",
            flexShrink: 0,
            borderBottom: "1px solid var(--border-subtle)",
          }}
        >
          <TextField
            fullWidth
            autoFocus
            inputRef={searchInputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search classes"
            slotProps={{
              htmlInput: {
                "aria-label": "Search classes",
                onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => {
                  if (event.key === "ArrowDown") {
                    event.preventDefault();
                    firstOptionRef.current?.focus();
                  }
                },
              },
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon aria-hidden="true" sx={smallIconSx} />
                  </InputAdornment>
                ),
              },
            }}
          />
        </Box>

        <MenuList
          id={listId}
          role="listbox"
          aria-label="Classes"
          disablePadding
          sx={{
            flex: "1 1 auto",
            minHeight: 0,
            maxHeight: 360,
            overflowY: "auto",
            py: "var(--space-2)",
          }}
        >
          {optionsLoading ? (
            <Box
              role="status"
              sx={{
                minHeight: 88,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "var(--space-2)",
                color: "text.secondary",
              }}
            >
              <CircularProgress size={18} color="inherit" />
              <Typography variant="body2">Loading classes…</Typography>
            </Box>
          ) : filteredOptions.length > 0 ? (
            filteredOptions.map((option, index) => {
              const selected = option.id === selectedClassId;

              return (
                <MenuItem
                  key={option.id}
                  ref={index === 0 ? firstOptionRef : undefined}
                  role="option"
                  aria-label={
                    option.kind === "admin-all-classes"
                      ? `${option.label}, admin scope`
                      : option.label
                  }
                  aria-selected={selected}
                  selected={selected}
                  onClick={() => selectClass(option.id)}
                  sx={{ gap: "var(--space-2)" }}
                >
                  {option.kind === "admin-all-classes" && (
                    <AdminScopeIcon aria-hidden="true" sx={smallIconSx} />
                  )}
                  <Typography
                    component="span"
                    variant="body2"
                    noWrap
                    sx={{
                      flex: 1,
                      minWidth: 0,
                      fontWeight: selected ? "var(--weight-semibold)" : "var(--weight-regular)",
                    }}
                  >
                    {option.label}
                  </Typography>
                  <CheckIcon
                    aria-hidden="true"
                    sx={{
                      fontSize: "var(--size-icon-sm)",
                      color: "inherit",
                      flexShrink: 0,
                      opacity: selected ? 1 : 0,
                    }}
                  />
                </MenuItem>
              );
            })
          ) : (
            <Box sx={{ px: "var(--space-3)", py: "var(--space-6)", textAlign: "center" }}>
              <Typography variant="body2" sx={{ color: "text.secondary" }}>
                {noOptionsLabel}
              </Typography>
            </Box>
          )}
        </MenuList>

        {onCreateClass && (
          <ButtonBase
            onClick={() => {
              close();
              onCreateClass();
            }}
            sx={{
              width: "100%",
              minHeight: "var(--size-target-min)",
              px: "var(--space-menu-item-x)",
              gap: "var(--space-2)",
              flexShrink: 0,
              justifyContent: "flex-start",
              borderTop: "1px solid var(--border-subtle)",
              color: "var(--text)",
              "&:hover": { backgroundColor: "var(--surface-hover)" },
              // The sheet clips its overflow, so the theme's ring sits inside the row, as on menu items.
              "&:focus-visible": { outlineOffset: "calc(-1 * var(--size-focus-ring))" },
            }}
          >
            <AddIcon aria-hidden="true" sx={smallIconSx} />
            <Typography component="span" variant="subtitle2">
              {CREATE_NEW_CLASS_LABEL}
            </Typography>
          </ButtonBase>
        )}
      </Popover>
    </>
  );
};

export default ClassSwitcher;
