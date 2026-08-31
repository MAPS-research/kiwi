import React, { useState } from "react";
import {
  IconButton,
  Stack,
  Tooltip,
} from "@mui/material";
import {
  Cached as CachedIcon,
  Flag as FlagIcon,
  ThumbUp as ThumbUpIcon,
  ThumbDown as ThumbDownIcon,
  Share as ShareIcon,
} from "@mui/icons-material";
import { useSaveInteraction } from "../../utils/useSaveInteraction.ts";

export const Feedback: React.FC<{ index: string; videoID?: string }> = ({
  index,
  videoID,
}) => {
  const { saveInteraction } = useSaveInteraction();
  const [status, setStatus] = useState<number>(0);
  const [replyStatus, setReplyStatus] = useState<boolean>(false);

  const handleFeedback = async (status: number) => {
    setStatus(status);
    saveInteraction({
      type: "frontend-interaction-thumbs",
      context: {
        chatMessage: { uniqueID: index },
        thumbsValue: status,
      },
    });
  };

  const handleResponse = async () => {
    const reply = prompt("Please enter your feedback:", "") || "";
    saveInteraction({
      type: "frontend-interaction-feedback-flag",
      context: {
        messages: { uniqueID: index, reply },
      },
    });
    setReplyStatus(true);
  };

  return (
    <Stack direction="row" spacing={1} mt={1}>
      <Tooltip title="Regenerate response">
        <IconButton size="small" disabled>
          <CachedIcon fontSize="small" />
        </IconButton>
      </Tooltip>

      <Tooltip title="Flag this answer">
        <span>
          <IconButton
            color={replyStatus ? "warning" : "default"}
            onClick={handleResponse}
            disabled={replyStatus}
            size="small"
          >
            <FlagIcon fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>

      <Tooltip title="Thumbs up">
        <span>
          <IconButton
            color={status === 1 ? "success" : "default"}
            onClick={() => handleFeedback(1)}
            disabled={status !== 0}
            size="small"
          >
            <ThumbUpIcon fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>

      <Tooltip title="Thumbs down">
        <span>
          <IconButton
            color={status === -1 ? "error" : "default"}
            onClick={() => handleFeedback(-1)}
            disabled={status !== 0}
            size="small"
          >
            <ThumbDownIcon fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>

      <Tooltip title="Share answer">
        <IconButton size="small" disabled>
          <ShareIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    </Stack>
  );
};
