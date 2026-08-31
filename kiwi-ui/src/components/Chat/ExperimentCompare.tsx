import RestartAltIcon from "@mui/icons-material/RestartAlt";
import {
  Box,
  Chip,
  CircularProgress,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import React, { useEffect, useRef, useState } from "react";
import type { Variant } from "../../utils/experimentApi.ts";
import ChatMessages from "./ChatMessages.tsx";
import type { ChatLane } from "./useChatLane.ts";

/**
 * Below this container width the two lanes stack vertically. Measured on the
 * container, not the viewport: the global chat also renders as a narrow side
 * panel on a wide screen, where a media query would wrongly say "go side-by-
 * side".
 */
const SIDE_BY_SIDE_MIN_WIDTH = 680;

interface LaneColumnProps {
  lane: ChatLane;
  variant: Variant | null;
  /** "A" / "B" — anchors each column to its picker in the controls above. */
  slot: string;
  importCode: (code: string) => void;
}

const LaneColumn: React.FC<LaneColumnProps> = ({
  lane,
  variant,
  slot,
  importCode,
}) => {
  const messageEndRef = useRef<HTMLDivElement>(null!);

  return (
    <Box
      sx={{
        flex: 1,
        minWidth: 0,
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Box
        sx={{
          px: 1.5,
          py: 0.75,
          borderBottom: 1,
          borderColor: "divider",
          bgcolor: "background.paper",
          display: "flex",
          alignItems: "center",
          gap: 1,
          flexShrink: 0,
        }}
      >
        <Chip
          size="small"
          label={slot}
          sx={{
            height: 20,
            fontWeight: 700,
            borderRadius: 999,
            bgcolor: "rgba(87, 6, 140, 0.08)",
            color: "primary.main",
          }}
        />
        <Box sx={{ minWidth: 0, flexGrow: 1 }}>
          <Typography variant="body2" fontWeight={700} noWrap>
            {variant?.label || "No variant selected"}
          </Typography>
          {variant && (
            <Typography variant="caption" color="text.secondary" noWrap>
              {variant.key}
            </Typography>
          )}
        </Box>
        {variant && (
          <Chip
            size="small"
            label={variant.config.engine}
            sx={{ height: 20, borderRadius: 999 }}
          />
        )}
        {lane.busy && <CircularProgress size={14} />}
        <Tooltip title="Clear this column">
          <span>
            <IconButton
              size="small"
              onClick={lane.reset}
              disabled={lane.messages.length === 0 && !lane.busy}
            >
              <RestartAltIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
      </Box>

      {lane.error && (
        <Typography
          variant="caption"
          color="error"
          sx={{ px: 1.5, py: 0.5, flexShrink: 0 }}
        >
          {lane.error}
        </Typography>
      )}

      <Box sx={{ flexGrow: 1, minHeight: 0, overflow: "auto" }}>
        <ChatMessages
          chatMessages={lane.messages}
          handleSendRetryMessage={() => {
            /* Retry would desync the columns — resend from the shared input. */
          }}
          messageEndRef={messageEndRef}
          importCode={importCode}
        />
      </Box>
    </Box>
  );
};

export interface ExperimentCompareProps {
  laneA: ChatLane;
  laneB: ChatLane;
  variantA: Variant | null;
  variantB: Variant | null;
  importCode: (code: string) => void;
}

/**
 * Side-by-side transcript of the same prompts answered by two experiment
 * variants. Each column is an independent conversation (see useChatLane); the
 * shared composer in ChatCore fans a single prompt out to both.
 */
export const ExperimentCompare: React.FC<ExperimentCompareProps> = ({
  laneA,
  laneB,
  variantA,
  variantB,
  importCode,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [sideBySide, setSideBySide] = useState(true);

  useEffect(() => {
    const node = containerRef.current;
    if (!node || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(([entry]) => {
      setSideBySide(entry.contentRect.width >= SIDE_BY_SIDE_MIN_WIDTH);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <Box ref={containerRef} sx={{ height: "100%", minHeight: 0 }}>
      <Stack
        direction={sideBySide ? "row" : "column"}
        divider={
          <Box
            sx={{
              flexShrink: 0,
              ...(sideBySide
                ? { width: "1px", alignSelf: "stretch" }
                : { height: "1px" }),
              bgcolor: "divider",
            }}
          />
        }
        sx={{ height: "100%", minHeight: 0 }}
      >
        <LaneColumn
          lane={laneA}
          variant={variantA}
          slot="A"
          importCode={importCode}
        />
        <LaneColumn
          lane={laneB}
          variant={variantB}
          slot="B"
          importCode={importCode}
        />
      </Stack>
    </Box>
  );
};

export default ExperimentCompare;
