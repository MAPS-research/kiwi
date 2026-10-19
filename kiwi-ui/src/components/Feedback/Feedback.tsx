import React, { useId, useState } from "react";
import { Box, IconButton, Tooltip } from "@mui/material";
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

/**
 * The answer's feedback toolbar (kiwi-ui/DESIGN.md, The tutor-message surface):
 * Regenerate, Flag, Thumbs up, Thumbs down and Share as 28 px toolbar buttons.
 * The thumbs are toggles: the chosen one is drawn filled in the selection colour,
 * the other stays an outline, so the choice is a change of shape, not only of
 * hue. Regenerate and Share are not available yet: they stay focusable and say
 * so. A saved choice is announced once, politely.
 */
export const Feedback: React.FC<{ index: string; videoID?: string }> = ({ index }) => {
  const { saveInteraction } = useSaveInteraction();
  const [status, setStatus] = useState<number>(0);
  const [replyStatus, setReplyStatus] = useState<boolean>(false);
  const [announcement, setAnnouncement] = useState("");
  const regenerateReasonId = useId();
  const shareReasonId = useId();

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
      role="toolbar"
      aria-label="Feedback"
      sx={{ display: "flex", alignItems: "center", gap: "calc(var(--tutor-message-toolbar-pitch) - var(--tutor-message-toolbar-button))" }}
    >
      <Tooltip title={REGENERATE_REASON}>
        <IconButton
          aria-label="Regenerate answer"
          aria-disabled="true"
          aria-describedby={regenerateReasonId}
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
          <IconButton aria-label="Flag this answer" onClick={handleResponse} disabled={replyStatus} sx={toolbarButtonSx}>
            <FlagOutlinedIcon />
          </IconButton>
        </span>
      </Tooltip>

      <Tooltip title="Thumbs up">
        <IconButton
          aria-label="Thumbs up"
          aria-pressed={status === 1}
          onClick={() => handleFeedback(1)}
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
          sx={{ ...toolbarButtonSx, ...chosen }}
        >
          {status === -1 ? <ThumbDownIcon /> : <ThumbDownOutlinedIcon />}
        </IconButton>
      </Tooltip>

      <Tooltip title={SHARE_REASON}>
        <IconButton aria-label="Share answer" aria-disabled="true" aria-describedby={shareReasonId} sx={toolbarButtonSx}>
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
        sx={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)", whiteSpace: "nowrap" }}
      >
        {announcement}
      </Box>
    </Box>
  );
};
