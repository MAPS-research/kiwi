import { useEffect, useLayoutEffect, useRef } from "react";
import { Box } from "@mui/material";
import { useColorMode } from "../../../theme/useColorMode.ts";
import walkLight from "./assets/walk.light.webp";
import hopLight from "./assets/hop.light.webp";
import standLight from "./assets/stand.light.webp";
import walkDark from "./assets/walk.dark.webp";
import hopDark from "./assets/hop.dark.webp";
import standDark from "./assets/stand.dark.webp";

/**
 * The status line's Kiwi, "the Runner" (the companion v2 decision of 2026-10-18).
 *
 * A small Kiwi runs in place beside the line's words from the send until the
 * answer is complete, flies once, then the line fades and leaves the row to the
 * answer's toolbar. The drawings are whole frames swapped on a 24 Hz clock,
 * nothing tweened. The clock starts at the send and never restarts for a step or
 * the first token. With motion off at any level (the deployment, the device's
 * reduced-motion setting, the Display menu's switch) Kiwi stands still, the words
 * stay, and at completion the line simply leaves. A hidden tab or a line scrolled
 * out of view pauses the run, and a flight whose moment passes there is never
 * played late. The drawing is decorative (aria-hidden); the words are the state.
 */

const ATLASES = {
  light: { walk: walkLight, hop: hopLight, stand: standLight },
  dark: { walk: walkDark, hop: hopDark, stand: standDark },
} as const;

/** One tick of the drawn-frame clock: 24 Hz. */
const TICK_MS = 1000 / 24;
/** The run: 24 drawings of full-walk, each held 2 ticks (a 2.0 s loop). */
const RUN_HOLD_TICKS = 2;
const RUN_DRAWINGS = 24;
/** The flight: 24 drawings of full-hop-flight at 1 tick each, the last held 4 more. */
const FLIGHT_DRAWINGS = 24;
const LANDING_HOLD_TICKS = 4;
/** The fade after the flight: --motion-exit (176 ms) on the exit curve. */
const EXIT_MS = 176;
/** A gap longer than this between frames means the tab was hidden. */
const LOST_FRAMES_MS = 250;

/**
 * The camera: the 72 px atlas cell drawn at 30.528 px, offset so the bird's feet
 * stand on the label's baseline (19 px down the 28 px row) in the 24 px stage
 * (`companion.line.kiwi`). Framing constants of the artwork, measured on the
 * sign-off preview; they hold only for that stage size, which a test checks.
 */
export const CAMERA = { size: 30.528, left: -5.042, top: -6.97, stage: 24 };

type Atlas = "walk" | "hop" | "stand";

const cellPosition = (cell: number) =>
  `${((cell % 6) / 5) * 100}% ${(Math.floor(cell / 6) / 3) * 100}%`;

export interface KiwiStatusLineProps {
  /** The line's words; empty once the answer is complete. */
  label: string;
  /** The answer finished: play the flight (motion on), then leave. */
  complete: boolean;
  /** The turn's clock origin, `performance.now()` at the send. */
  startedAt: number;
  /** Every motion level allows Kiwi to move. */
  motion: boolean;
  /** The line has gone (after the flight and the fade, or at once). */
  onGone: () => void;
}

export default function KiwiStatusLine({ label, complete, startedAt, motion, onGone }: KiwiStatusLineProps) {
  const atlases = ATLASES[useColorMode()];
  const lineRef = useRef<HTMLSpanElement>(null);
  const cameraRef = useRef<HTMLSpanElement>(null);
  const inViewRef = useRef(true);
  const goneRef = useRef(false);
  const onGoneRef = useRef(onGone);
  onGoneRef.current = onGone;

  const draw = (atlas: Atlas, cell = 0) => {
    const camera = cameraRef.current;
    if (!camera) return;
    camera.dataset.atlas = atlas;
    camera.dataset.cell = atlas === "stand" ? "stand" : String(cell);
    camera.style.backgroundImage = `url("${atlases[atlas]}")`;
    camera.style.backgroundSize = atlas === "stand" ? "100% 100%" : "600% 400%";
    camera.style.backgroundPosition = atlas === "stand" ? "0 0" : cellPosition(cell);
  };

  const runCell = (now: number) =>
    Math.floor(Math.floor((now - startedAt) / TICK_MS) / RUN_HOLD_TICKS) % RUN_DRAWINGS;

  const leave = () => {
    if (goneRef.current) return;
    goneRef.current = true;
    onGoneRef.current();
  };

  // A line scrolled out of view pauses, and misses its flight rather than playing it late.
  useEffect(() => {
    const line = lineRef.current;
    if (!line || typeof IntersectionObserver === "undefined") return undefined;
    const observer = new IntersectionObserver(([entry]) => {
      inViewRef.current = entry?.isIntersecting ?? true;
    });
    observer.observe(line);
    return () => observer.disconnect();
  }, []);

  // Fetch the flight while the run plays, so the first answer of a page load can fly.
  useEffect(() => {
    if (!motion || typeof Image === "undefined") return;
    const image = new Image();
    image.src = atlases.hop;
  }, [motion, atlases.hop]);

  // The run, from the send until the answer completes.
  useLayoutEffect(() => {
    if (complete) return undefined;
    if (!motion) {
      draw("stand");
      return undefined;
    }
    let frame = 0;
    const step = () => {
      const now = performance.now();
      if (!document.hidden && inViewRef.current) draw("walk", runCell(now));
      frame = requestAnimationFrame(step);
    };
    draw("walk", runCell(performance.now()));
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
    // draw and runCell read only refs, the atlases and startedAt.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [complete, motion, startedAt, atlases]);

  // The flight at the next tick of the run's clock, the landing hold, the fade, then gone.
  useLayoutEffect(() => {
    if (!complete) return undefined;
    if (!motion || document.hidden || !inViewRef.current) {
      leave();
      return undefined;
    }
    const begun = performance.now();
    const flightStart = startedAt + Math.ceil((begun - startedAt) / TICK_MS) * TICK_MS;
    const flightEnd = flightStart + (FLIGHT_DRAWINGS + LANDING_HOLD_TICKS) * TICK_MS;
    let frame = 0;
    let timer = 0;
    let lastFrame = begun;

    const step = () => {
      const now = performance.now();
      const missedFrames = now - lastFrame > LOST_FRAMES_MS;
      lastFrame = now;
      if (missedFrames && now >= flightStart) {
        // The tab was hidden through the flight's moment: never play it late.
        leave();
        return;
      }
      if (now < flightStart) {
        draw("walk", runCell(now));
      } else if (now < flightEnd) {
        draw("hop", Math.min(Math.floor((now - flightStart) / TICK_MS), FLIGHT_DRAWINGS - 1));
      } else {
        draw("hop", FLIGHT_DRAWINGS - 1);
        const line = lineRef.current;
        if (line) {
          line.style.transition = "opacity var(--motion-exit) var(--motion-ease-exit)";
          line.style.opacity = "0";
        }
        timer = window.setTimeout(leave, EXIT_MS);
        return;
      }
      frame = requestAnimationFrame(step);
    };
    // Keep a drawn frame on screen before paint, including a row mounted at
    // completion (for example after the final tool narration becomes text).
    step();
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [complete]);

  return (
    <Box
      ref={lineRef}
      component="span"
      className="kiwi-status-line"
      data-motion={motion ? "on" : "off"}
      data-phase={complete ? "done" : "run"}
      sx={{
        position: "relative",
        display: "inline-flex",
        alignItems: "flex-start",
        gap: "var(--companion-line-gap)",
        height: "var(--companion-line-height)",
        maxWidth: "100%",
        // The one in-progress string that is not neutral (DESIGN.md, The status line).
        color: "var(--companion-line-ink)",
        verticalAlign: "top",
      }}
    >
      <Box
        component="span"
        aria-hidden="true"
        sx={{ position: "relative", flex: "none", width: "var(--companion-line-kiwi)", height: "100%" }}
      >
        <Box
          ref={cameraRef}
          component="span"
          data-testid="kiwi-status-line-camera"
          sx={{
            position: "absolute",
            left: `${CAMERA.left}px`,
            top: `${CAMERA.top}px`,
            width: `${CAMERA.size}px`,
            height: `${CAMERA.size}px`,
            backgroundRepeat: "no-repeat",
          }}
        />
      </Box>
      {label ? (
        <Box
          component="span"
          sx={{
            minWidth: 0,
            pt: "4px",
            fontFamily: "var(--font-ui)",
            fontSize: "var(--text-sm)",
            lineHeight: "var(--leading-sm)",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {label}
        </Box>
      ) : null}
    </Box>
  );
}
