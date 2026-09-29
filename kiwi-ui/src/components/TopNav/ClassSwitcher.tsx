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
import { alpha } from "@mui/material/styles";
import { CREATE_NEW_CLASS_LABEL } from "../../constants/classCopy.ts";
import { COMPACT_POPUP_TYPOGRAPHY } from "../../theme/compactPopup.ts";
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

const ClassSwitcher = ({
  options,
  optionsLoading = false,
  selectedClassId,
  selectedClassLabel,
  selectedClassKind,
  onClassChange,
  onCreateClass,
  emptyLabel = "No classes found",
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
  const normalizedQuery = query.trim().toLowerCase();
  const filteredOptions = switcherOptions.filter((option) =>
    `${option.label} ${option.id}`.toLowerCase().includes(normalizedQuery),
  );
  const currentLabel =
    selectedOption?.label ?? selectedClassLabel ?? "Select a class";

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
      <Box
        sx={{
          minWidth: 0,
          maxWidth: "100%",
          height: 44,
          px: 0.5,
          gap: 1,
          display: "flex",
          alignItems: "center",
          color: "text.primary",
        }}
      >
        {selectedOption?.kind === "admin-all-classes" ? (
          <AdminScopeIcon
            aria-hidden="true"
            sx={{ flexShrink: 0, color: "primary.main" }}
          />
        ) : (
          <ClassIcon
            aria-hidden="true"
            sx={{
              flexShrink: 0,
              color: "text.secondary",
            }}
          />
        )}
        <Typography
          component="span"
          variant="subtitle2"
          noWrap
          title={currentLabel}
          sx={{
            minWidth: 0,
            maxWidth: { xs: 96, sm: 200, md: 280 },
            fontWeight: 600,
            ...COMPACT_POPUP_TYPOGRAPHY.primary,
          }}
        >
          {currentLabel}
        </Typography>
        <ButtonBase
          aria-label={`Switch class scope. Current selection: ${currentLabel}`}
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
            width: 36,
            height: 36,
            minWidth: 36,
            flexShrink: 0,
            display: "grid",
            placeItems: "center",
            borderRadius: 1.5,
            color: open ? "primary.main" : "text.secondary",
            bgcolor: open ? "action.selected" : "transparent",
            "&:hover": {
              color: open ? "primary.main" : "text.primary",
            },
            "&:focus-visible": {
              outline: "2px solid",
              outlineColor: "primary.main",
              outlineOffset: 2,
            },
          }}
        >
          <SwitcherIcon aria-hidden="true" fontSize="small" />
        </ButtonBase>
      </Box>

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
            elevation: 0,
            sx: {
              mt: 0.75,
              width: { xs: "calc(100vw - 24px)", sm: 360 },
              maxWidth: 360,
              maxHeight: "min(480px, calc(100dvh - 24px))",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 2.5,
              bgcolor: "background.paper",
              backgroundImage: "none",
              boxShadow: (theme) =>
                `0 18px 46px ${alpha(theme.palette.common.black, 0.14)}, 0 3px 10px ${alpha(theme.palette.common.black, 0.06)}`,
            },
          },
        }}
      >
        <Box
          sx={{
            px: 1.5,
            py: 0.5,
            flexShrink: 0,
            borderBottom: "1px solid",
            borderColor: "divider",
          }}
        >
          <TextField
            fullWidth
            autoFocus
            variant="standard"
            inputRef={searchInputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Find class…"
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
                disableUnderline: true,
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon
                      fontSize="small"
                      sx={{ color: "text.secondary" }}
                    />
                  </InputAdornment>
                ),
              },
            }}
            sx={{
              "& .MuiInputBase-root": { minHeight: 36 },
              "& .MuiInputBase-input": {
                py: 0.5,
                color: "text.primary",
                typography: "body2",
                ...COMPACT_POPUP_TYPOGRAPHY.primary,
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
            p: 1,
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
                gap: 1,
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
                  sx={{
                    minHeight: 44,
                    px: 1.5,
                    py: 0.75,
                    gap: 1.5,
                    borderRadius: 1.5,
                    color: "text.primary",
                    "& + &": { mt: 0.25 },
                    "&.Mui-selected": { bgcolor: "transparent" },
                    "&.Mui-selected:hover, &:hover, &.Mui-focusVisible": {
                      bgcolor: "action.hover",
                    },
                  }}
                >
                  {option.kind === "admin-all-classes" && (
                    <AdminScopeIcon
                      aria-hidden="true"
                      fontSize="small"
                      sx={{ flexShrink: 0, color: "primary.main" }}
                    />
                  )}
                  <Typography
                    component="span"
                    variant="body2"
                    noWrap
                    sx={{
                      flex: 1,
                      minWidth: 0,
                      fontWeight: selected ? 600 : "fontWeightRegular",
                      ...COMPACT_POPUP_TYPOGRAPHY.primary,
                    }}
                  >
                    {option.label}
                  </Typography>
                  <CheckIcon
                    aria-hidden="true"
                    fontSize="small"
                    sx={{
                      color: "text.primary",
                      opacity: selected ? 1 : 0,
                    }}
                  />
                </MenuItem>
              );
            })
          ) : (
            <Box sx={{ px: 1.5, py: 4, textAlign: "center" }}>
              <Typography variant="body2" sx={{
                color: "text.secondary"
              }}>
                {emptyLabel}
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
              minHeight: 50,
              px: 2,
              gap: 1.5,
              flexShrink: 0,
              justifyContent: "flex-start",
              borderTop: "1px solid",
              borderColor: "divider",
              color: "text.primary",
              "&:hover": { bgcolor: "action.hover" },
              "&:focus-visible": {
                outline: "2px solid",
                outlineColor: "primary.main",
                outlineOffset: -3,
              },
            }}
          >
            <AddIcon />
            <Typography
              component="span"
              variant="body2"
              sx={{
                fontWeight: "fontWeightMedium",
                ...COMPACT_POPUP_TYPOGRAPHY.primary,
              }}
            >
              {CREATE_NEW_CLASS_LABEL}
            </Typography>
          </ButtonBase>
        )}
      </Popover>
    </>
  );
};

export default ClassSwitcher;
