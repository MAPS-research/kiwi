import React, { useId, useRef, useState } from "react";
import { Box, IconButton, Tooltip } from "@mui/material";
import { visuallyHidden } from "../../theme/visuallyHidden.ts";
import CachedIcon from "@mui/icons-material/Cached";
import FlagOutlinedIcon from "@mui/icons-material/FlagOutlined";
import ShareOutlinedIcon from "@mui/icons-material/ShareOutlined";
import ThumbDownIcon from "@mui/icons-material/ThumbDown";
import ThumbDownOutlinedIcon from "@mui/icons-material/ThumbDownOutlined";
import ThumbUpIcon from "@mui/icons-material/ThumbUp";
import ThumbUpOutlinedIcon from "@mui/icons-material/ThumbUpOutlined";
import { useSaveInteraction } from "../../utils/useSaveInteraction.ts";
import { toolbarButtonSx } from "../Chat/toolbarButton.ts";

const REGENERATE_REASON = "Regenerating answers isn't available yet.";
const SHARE_REASON = "Sharing answers isn't available yet.";

type ToolbarButton = "regenerate" | "flag" | "up" | "down" | "share";
const ROVING_KEYS = ["ArrowLeft", "ArrowRight", "Home", "End"];

/**
 * The answer's feedback toolbar (kiwi-ui/DESIGN.md, The tutor-message surface):
 * Regenerate, Flag, Thumbs up, Thumbs down and Share as 28 px toolbar buttons.
 * The thumbs are toggles: the chosen one is drawn filled in the selection colour,
 * the other stays an outline, so the choice is a change of shape, not only of
 * hue. Regenerate and Share are not available yet: they stay focusable and say
 * so. A saved choice is announced once, politely. The toolbar is one tab stop
 * with a roving tabindex: Left and Right move between its buttons (Home and End
 * to the ends), and Tab leaves it from the button last focused.
 */
export const Feedback: React.FC<{ index: string; videoID?: string }> = ({ index }) => {
  const { saveInteraction } = useSaveInteraction();
  const [status, setStatus] = useState<number>(0);
  const [replyStatus, setReplyStatus] = useState<boolean>(false);
  const [announcement, setAnnouncement] = useState("");
  const regenerateReasonId = useId();
  const shareReasonId = useId();
  const toolbarRef = useRef<HTMLDivElement>(null);
  const [tabStop, setTabStop] = useState<ToolbarButton>("regenerate");
  // The tab stop never rests on a button that has been disabled (Flag, once used).
  const stop: ToolbarButton = tabStop === "flag" && replyStatus ? "up" : tabStop;
  const roving = (name: ToolbarButton) => ({
    tabIndex: stop === name ? 0 : -1,
    onFocus: () => setTabStop(name),
  });

  const handleToolbarKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!ROVING_KEYS.includes(event.key)) return;
    const buttons = Array.from(toolbarRef.current?.querySelectorAll<HTMLButtonElement>("button:not([disabled])") ?? []);
    const current = buttons.indexOf(document.activeElement as HTMLButtonElement);
    if (current < 0) return;
    event.preventDefault();
    const last = buttons.length - 1;
    const next =
      event.key === "Home" ? 0
        : event.key === "End" ? last
          : event.key === "ArrowRight" ? (current === last ? 0 : current + 1)
            : current === 0 ? last : current - 1;
    buttons[next].focus();
  };

  const handleFeedback = async (value: number) => {
    if (status === value) return;
    setStatus(value);
    setAnnouncement("");
    const saved = await saveInteraction({
      type: "frontend-interaction-thumbs",
      context: {
        chatMessage: { uniqueID: index },
        thumbsValue: value,
      },
    });
    if (saved) setAnnouncement("Feedback saved.");
  };

  const handleResponse = async () => {
    const reply = prompt("What's wrong with this answer?", "") || "";
    saveInteraction({
      type: "frontend-interaction-feedback-flag",
      context: {
        messages: { uniqueID: index, reply },
      },
    });
    setReplyStatus(true);
  };

  const chosen = { "&[aria-pressed='true']": { color: "var(--tutor-message-variant-thumb-chosen-glyph)", boxShadow: "none", backgroundColor: "transparent" } };

  return (
    <Box
      ref={toolbarRef}
      role="toolbar"
      aria-label="Feedback"
      onKeyDown={handleToolbarKeyDown}
      sx={{ display: "flex", alignItems: "center", gap: "calc(var(--tutor-message-toolbar-pitch) - var(--tutor-message-toolbar-button))" }}
    >
      <Tooltip title={REGENERATE_REASON}>
        <IconButton
          aria-label="Regenerate answer"
          aria-disabled="true"
          aria-describedby={regenerateReasonId}
          {...roving("regenerate")}
          sx={toolbarButtonSx}
        >
          <CachedIcon />
        </IconButton>
      </Tooltip>
      <Box component="span" id={regenerateReasonId} hidden>
        {REGENERATE_REASON}
      </Box>

      <Tooltip title="Flag this answer">
        <span>
          <IconButton
            aria-label="Flag this answer"
            onClick={handleResponse}
            disabled={replyStatus}
            {...roving("flag")}
            sx={toolbarButtonSx}
          >
            <FlagOutlinedIcon />
          </IconButton>
        </span>
      </Tooltip>

      <Tooltip title="Thumbs up">
        <IconButton
          aria-label="Thumbs up"
          aria-pressed={status === 1}
          onClick={() => handleFeedback(1)}
          {...roving("up")}
          sx={{ ...toolbarButtonSx, ...chosen }}
        >
          {status === 1 ? <ThumbUpIcon /> : <ThumbUpOutlinedIcon />}
        </IconButton>
      </Tooltip>

      <Tooltip title="Thumbs down">
        <IconButton
          aria-label="Thumbs down"
          aria-pressed={status === -1}
          onClick={() => handleFeedback(-1)}
          {...roving("down")}
          sx={{ ...toolbarButtonSx, ...chosen }}
        >
          {status === -1 ? <ThumbDownIcon /> : <ThumbDownOutlinedIcon />}
        </IconButton>
      </Tooltip>

      <Tooltip title={SHARE_REASON}>
        <IconButton
          aria-label="Share answer"
          aria-disabled="true"
          aria-describedby={shareReasonId}
          {...roving("share")}
          sx={toolbarButtonSx}
        >
          <ShareOutlinedIcon />
        </IconButton>
      </Tooltip>
      <Box component="span" id={shareReasonId} hidden>
        {SHARE_REASON}
      </Box>

      <Box
        component="span"
        role="status"
        aria-live="polite"
        sx={visuallyHidden}
      >
        {announcement}
      </Box>
    </Box>
  );
};
