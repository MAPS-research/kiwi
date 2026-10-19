import { useId, useRef, useState } from "react";
import { IconButton, ListSubheader, Menu, MenuItem, Switch, Tooltip, Typography } from "@mui/material";
import { useColorScheme } from "@mui/material/styles";
import CheckIcon from "@mui/icons-material/Check";
import TuneOutlined from "@mui/icons-material/TuneOutlined";
import { useDisplayPreferences } from "../../theme/displayPreferences.tsx";

/**
 * The Display menu (kiwi-ui/DESIGN.md, The Display menu): the top bar's
 * "Display settings" button and its small popup. Theme appears when the
 * deployment ships dark mode, Kiwi animation when it ships mascot motion, and
 * the button is hidden when neither does. Choices apply at once and are kept
 * per device.
 */

type Mode = "system" | "light" | "dark";

const THEME_CHOICES: { mode: Mode; label: string }[] = [
  { mode: "system", label: "Match device" },
  { mode: "light", label: "Light" },
  { mode: "dark", label: "Dark" },
];

const groupLabelSx = {
  fontFamily: "var(--type-popup-supporting-family)",
  fontSize: "var(--type-popup-supporting-size)",
  lineHeight: "var(--type-popup-supporting-leading)",
  fontWeight: "var(--weight-semibold)",
  color: "var(--display-menu-group-label)",
  backgroundColor: "transparent",
  padding: "var(--space-2) var(--display-menu-item-x) var(--space-1)",
};

const captionSx = {
  display: "block",
  maxWidth: "var(--display-menu-max-width)",
  padding: "var(--space-1) var(--display-menu-item-x) var(--space-2)",
  fontFamily: "var(--type-popup-supporting-family)",
  fontSize: "var(--type-popup-supporting-size)",
  lineHeight: "var(--type-popup-supporting-leading)",
  color: "var(--text-secondary)",
};

const DisplayMenu = () => {
  const { themeChoice, animationChoice, animation, setAnimation, reducedMotion, saved } =
    useDisplayPreferences();
  const { mode, setMode } = useColorScheme();
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();
  const reducedMotionId = useId();

  if (!themeChoice && !animationChoice) return null;

  const currentMode: Mode = (mode as Mode | undefined) ?? "system";
  const close = () => setOpen(false);

  return (
    <>
      <Tooltip title="Display settings">
        <IconButton
          ref={buttonRef}
          aria-label="Display settings"
          aria-haspopup="menu"
          aria-expanded={open}
          aria-controls={open ? menuId : undefined}
          onClick={() => setOpen((value) => !value)}
        >
          <TuneOutlined />
        </IconButton>
      </Tooltip>
      <Menu
        id={menuId}
        anchorEl={buttonRef.current}
        open={open}
        onClose={close}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        slotProps={{
          paper: { sx: { minWidth: "var(--display-menu-min-width)", maxWidth: "var(--display-menu-max-width)" } },
          list: { "aria-label": "Display settings", dense: false },
        }}
      >
        {themeChoice && <ListSubheader sx={groupLabelSx}>Theme</ListSubheader>}
        {themeChoice &&
          THEME_CHOICES.map(({ mode: choice, label }) => {
            const checked = currentMode === choice;
            return (
              <MenuItem
                key={choice}
                role="menuitemradio"
                aria-checked={checked}
                selected={false}
                autoFocus={checked}
                onClick={() => setMode(choice)}
                sx={{ justifyContent: "space-between", gap: "var(--space-4)" }}
              >
                {label}
                {checked ? (
                  <CheckIcon aria-hidden sx={{ fontSize: "var(--size-icon-sm)", color: "var(--display-menu-check)" }} />
                ) : null}
              </MenuItem>
            );
          })}

        {animationChoice && <ListSubheader sx={groupLabelSx}>Kiwi animation</ListSubheader>}
        {animationChoice && (
          <MenuItem
            role="menuitemcheckbox"
            aria-checked={animation && !reducedMotion}
            aria-disabled={reducedMotion || undefined}
            aria-describedby={reducedMotion ? reducedMotionId : undefined}
            autoFocus={!themeChoice}
            onClick={() => {
              if (!reducedMotion) setAnimation(!animation);
            }}
            sx={{
              justifyContent: "space-between",
              gap: "var(--space-4)",
              ...(reducedMotion && { color: "var(--display-menu-disabled-text)" }),
            }}
          >
            Kiwi animation
            <Switch
              size="small"
              checked={animation && !reducedMotion}
              disabled={reducedMotion}
              tabIndex={-1}
              slotProps={{ input: { "aria-hidden": true, tabIndex: -1 } }}
              sx={{ pointerEvents: "none" }}
            />
          </MenuItem>
        )}
        {animationChoice && reducedMotion && (
          <Typography id={reducedMotionId} component="span" sx={captionSx}>
            Your device is set to reduce motion, so Kiwi stays still.
          </Typography>
        )}

        {!saved && (
          <Typography component="span" role="status" sx={captionSx}>
            Your browser won't save this setting, so it resets when you reload the page.
          </Typography>
        )}
      </Menu>
    </>
  );
};

export default DisplayMenu;
