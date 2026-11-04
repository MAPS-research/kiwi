import RestartAltIcon from "@mui/icons-material/RestartAlt";
import {
  Box,
  Chip,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useDisplayPreferences } from "../../theme/displayPreferences.tsx";
import type { Variant } from "../../utils/experimentApi.ts";
import ChatMessages, { type StatusLineState } from "./ChatMessages.tsx";
import type { ChatLane } from "./useChatLane.ts";

/** The model names people see; the raw engine id never shows. */
const ENGINE_NAMES: Record<string, string> = { openai: "ChatGPT", qwen: "Qwen" };

type Slot = "A" | "B";

interface CompareLine extends StatusLineState {
  /** When the column's first token arrived (`performance.now()`), or null while it waits. */
  firstTokenAt: number | null;
}

/** The answer has text: the waiting placeholder has turned into the answer. */
const hasFirstToken = (lane: ChatLane) => {
  const last = lane.messages[lane.messages.length - 1];
  return Boolean(last?.isAi && !last.typing && !last.error && last.content && last.content !== "...");
};

/**
 * The two columns' status lines and their one mover (kiwi-ui/DESIGN.md,
 * Companion, compare mode): only the line of the most recently started answer
 * plays, the column whose first token arrived last; a tie, as when one send
 * starts both, goes to column A. The other column's line shows the standing
 * Kiwi and its words, and leaves with no flight when its answer completes.
 * Stop and an error cut a column's line with no flight.
 */
export function useCompareLines(laneA: ChatLane, laneB: ChatLane) {
  const [lines, setLines] = useState<Record<Slot, CompareLine | null>>({ A: null, B: null });
  const busyRef = useRef<Record<Slot, boolean>>({ A: false, B: false });
  const turnRef = useRef<Record<Slot, number>>({ A: 0, B: 0 });

  // A send starts a column's line; the answer's end completes or cuts it. One
  // clock reading per render, so one send that starts both columns is a tie.
  useEffect(() => {
    const now = performance.now();
    for (const [slot, lane] of [["A", laneA], ["B", laneB]] as const) {
      const was = busyRef.current[slot];
      busyRef.current[slot] = lane.busy;
      if (lane.busy && !was) {
        turnRef.current[slot] += 1;
        const line: CompareLine = {
          turn: turnRef.current[slot],
          startedAt: now,
          answerNumber: lane.messages.filter((message) => !message.isAi).length,
          complete: false,
          firstTokenAt: null,
        };
        setLines((prev) => ({ ...prev, [slot]: line }));
      } else if (!lane.busy && was) {
        const last = lane.messages[lane.messages.length - 1];
        const finished = !lane.stopped && !lane.error && Boolean(last?.isAi) && !last?.error;
        setLines((prev) => {
          const current = prev[slot];
          return { ...prev, [slot]: finished && current ? { ...current, complete: true } : null };
        });
      }
    }
    // The busy flags drive this; the lanes' other fields are read as of the same render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [laneA.busy, laneB.busy]);

  // The first token: the column that gets one last becomes the mover.
  useEffect(() => {
    const now = performance.now();
    for (const [slot, lane] of [["A", laneA], ["B", laneB]] as const) {
      if (!hasFirstToken(lane)) continue;
      setLines((prev) => {
        const current = prev[slot];
        if (!current || current.complete || current.firstTokenAt !== null) return prev;
        return { ...prev, [slot]: { ...current, firstTokenAt: now } };
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [laneA.messages, laneB.messages]);

  const gone = useCallback((slot: Slot, turn: number) => {
    setLines((prev) => (prev[slot]?.turn === turn ? { ...prev, [slot]: null } : prev));
  }, []);

  const startOf = (line: CompareLine | null) => (line ? line.firstTokenAt ?? line.startedAt : -Infinity);
  const mover: Slot | null = lines.A || lines.B ? (startOf(lines.B) > startOf(lines.A) ? "B" : "A") : null;

  return { lines, mover, gone };
}

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
  slot: Slot;
  importCode: (code: string) => void;
  /** This column's status line, if its answer is on its way or just completed. */
  statusLine: StatusLineState | null;
  /** This column's line is the one mover, and every motion level allows Kiwi to move. */
  motion: boolean;
  onStatusLineGone: (turn: number) => void;
}

const LaneColumn: React.FC<LaneColumnProps> = ({
  lane,
  variant,
  slot,
  importCode,
  statusLine,
  motion,
  onStatusLineGone,
}) => {
  const messageEndRef = useRef<HTMLDivElement>(null!);

  return (
    <Box
      data-slot={slot}
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
          borderBottom: "1px solid var(--border-subtle)",
          bgcolor: "var(--surface)",
          display: "flex",
          alignItems: "center",
          gap: 1,
          flexShrink: 0,
        }}
      >
        <Chip size="small" label={slot} />
        <Box sx={{ minWidth: 0, flexGrow: 1 }}>
          <Typography variant="body2" noWrap sx={{
            fontWeight: "var(--weight-semibold)"
          }}>
            {variant?.label || "No variant selected"}
          </Typography>
          {variant && (
            <Typography variant="caption" noWrap sx={{
              display: "block",
              color: "var(--text-secondary)"
            }}>
              {variant.key}
            </Typography>
          )}
        </Box>
        {variant && (
          <Chip size="small" label={ENGINE_NAMES[variant.config.engine] ?? variant.config.engine} />
        )}
        <Tooltip title="Clear this column">
          <span>
            <IconButton
              aria-label="Clear this column"
              onClick={lane.reset}
              disabled={lane.messages.length === 0 && !lane.busy}
            >
              <RestartAltIcon />
            </IconButton>
          </span>
        </Tooltip>
      </Box>

      {lane.error && (
        <Typography
          variant="caption"
          role="alert"
          sx={{ px: 1.5, py: 0.5, flexShrink: 0, color: "var(--status-error-text)" }}
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
          statusLine={statusLine}
          motion={motion}
          onStatusLineGone={onStatusLineGone}
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
  const { motionAllowed } = useDisplayPreferences();
  const { lines, mover, gone } = useCompareLines(laneA, laneB);

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
              bgcolor: "var(--border)",
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
          statusLine={lines.A}
          motion={motionAllowed && mover === "A"}
          onStatusLineGone={(turn) => gone("A", turn)}
        />
        <LaneColumn
          lane={laneB}
          variant={variantB}
          slot="B"
          importCode={importCode}
          statusLine={lines.B}
          motion={motionAllowed && mover === "B"}
          onStatusLineGone={(turn) => gone("B", turn)}
        />
      </Stack>
    </Box>
  );
};

export default ExperimentCompare;
