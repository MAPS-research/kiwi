import {
  ChatBubbleOutlineOutlined as ChatGlyph,
  CloseOutlined as CloseIcon,
  SendOutlined as Send,
} from "@mui/icons-material";
import {
  Avatar,
  Box,
  Button,
  Collapse,
  IconButton,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { keyframes } from "@mui/material/styles";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  AssistantMsg,
  ExperimentConfig,
  experimentApi,
} from "../../../utils/experimentApi.ts";
// Motion inside the locked budget (kiwi-ui/DESIGN.md § Motion): opacity and
// transform only, the standard 220 ms entry and a 20 % shorter exit, no spring.
const ENTER = { duration: 0.22, ease: [0.16, 1, 0.3, 1] as const };
const EXIT = { duration: 0.176, ease: [0.7, 0, 0.84, 0] as const };

const dotPulse = keyframes`
  0%, 100% { opacity: 0.4; }
  50% { opacity: 1; }
`;

/** Three pulsing dots for the "assistant is thinking" state (opacity only; still under reduced motion). */
const TypingDots: React.FC = () => (
  <Box sx={{ display: "flex", gap: 0.6, px: 1, py: 1.5 }}>
    {[0, 1, 2].map((i) => (
      <Box
        key={i}
        component="span"
        sx={{
          width: 7,
          height: 7,
          borderRadius: "50%",
          bgcolor: "var(--in-progress-text)",
          opacity: 0.4,
          animation: `${dotPulse} 900ms var(--motion-ease-toggle) infinite`,
          animationDelay: `${i * 150}ms`,
          "@media (prefers-reduced-motion: reduce)": { animation: "none", opacity: 1 },
        }}
      />
    ))}
  </Box>
);

// Survives the navigate-to-form remount so the destination page's assistant can
// still show the JSON of the draft it just produced.
let lastDraftConfig: ExperimentConfig | null = null;

type PanelRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

const EDGE_GAP = 16;
const DEFAULT_PANEL_WIDTH = 390;
const DEFAULT_PANEL_HEIGHT = 560;
const MIN_PANEL_WIDTH = 320;
const MIN_PANEL_HEIGHT = 360;
const FAB_SIZE = 56;
// The admin ClassLayout has a right sidebar (240px when open) separated by a
// vertical divider, and the universal chat launcher lives in the viewport's
// bottom-right corner. Dock the assistant just LEFT of that divider so it
// never overlaps the universal chat. (Still draggable anywhere afterwards.)
const RIGHT_DOCK_OFFSET = 240 + EDGE_GAP;

type FabPos = { x: number; y: number };

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const getViewport = () => ({
  width: typeof window === "undefined" ? 1200 : window.innerWidth,
  height: typeof window === "undefined" ? 800 : window.innerHeight,
});

const clampPanelRect = (rect: PanelRect): PanelRect => {
  const viewport = getViewport();
  const usableWidth = Math.max(240, viewport.width - EDGE_GAP * 2);
  const usableHeight = Math.max(260, viewport.height - EDGE_GAP * 2);
  const minWidth = Math.min(MIN_PANEL_WIDTH, usableWidth);
  const minHeight = Math.min(MIN_PANEL_HEIGHT, usableHeight);
  const width = clamp(rect.width, minWidth, usableWidth);
  const height = clamp(rect.height, minHeight, usableHeight);
  return {
    width,
    height,
    x: clamp(rect.x, EDGE_GAP, viewport.width - width - EDGE_GAP),
    y: clamp(rect.y, EDGE_GAP, viewport.height - height - EDGE_GAP),
  };
};

// Both the launcher and the panel dock just left of the sidebar divider.
const initialPanelRect = (): PanelRect => {
  const viewport = getViewport();
  const usableWidth = Math.max(240, viewport.width - EDGE_GAP * 2);
  const usableHeight = Math.max(260, viewport.height - EDGE_GAP * 2);
  const width = Math.min(DEFAULT_PANEL_WIDTH, usableWidth);
  const height = Math.min(DEFAULT_PANEL_HEIGHT, usableHeight);
  return clampPanelRect({
    width,
    height,
    x: viewport.width - width - RIGHT_DOCK_OFFSET,
    y: viewport.height - height - 24,
  });
};

const clampFabPos = (pos: FabPos): FabPos => {
  const viewport = getViewport();
  return {
    x: clamp(pos.x, EDGE_GAP, viewport.width - FAB_SIZE - EDGE_GAP),
    y: clamp(pos.y, EDGE_GAP, viewport.height - FAB_SIZE - EDGE_GAP),
  };
};

const initialFabPos = (): FabPos =>
  clampFabPos({
    x: getViewport().width - FAB_SIZE - RIGHT_DOCK_OFFSET,
    y: getViewport().height - FAB_SIZE - 40,
  });

// --- Cross-page persistence --------------------------------------------------
// The assistant remounts on every experiment page (list/form/detail), e.g.
// when a drafted config navigates to the New Experiment form. These module-
// level values survive those remounts so the conversation, the open/closed
// choice, and the dragged positions stay continuous while navigating. They
// reset on a full page reload (the natural session boundary) and when the
// instructor switches to a different class.
let persistedClassId: string | null = null;
let persistedOpen: boolean | null = null; // null = no state yet → auto-open on the list page
let persistedMessages: AssistantMsg[] = [];
let persistedInput = "";
let persistedPanelRect: PanelRect | null = null;
let persistedFabPos: FabPos | null = null;

/**
 * Floating AI assistant for the experiment pages. The instructor describes the
 * experiment; the backend (system chat model) replies and, when the design is
 * ready, returns a Config JSON. We then open the New Experiment form pre-filled
 * with that config (via router state) for review before submit.
 *
 * Also registers WebMCP page tools via `navigator.modelContext` when present,
 * so an external browser agent can drive the same create-and-open-draft flow.
 */
const ExperimentAssistant: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { classID } = useParams<{ classID: string }>();
  // Under reduced motion the launcher and the panel appear in place.
  const reduceMotion = useReducedMotion();
  const enter = reduceMotion ? { duration: 0 } : ENTER;
  const exit = reduceMotion ? { duration: 0 } : EXIT;

  // Switching to a DIFFERENT class starts a fresh assistant session (the
  // conversation about class A shouldn't leak into class B). Runs before the
  // useState initializers below read the persisted values; idempotent, so the
  // strict-mode double render is harmless.
  if (classID && persistedClassId !== classID) {
    if (persistedClassId !== null) {
      persistedOpen = null;
      persistedMessages = [];
      persistedInput = "";
      lastDraftConfig = null;
    }
    persistedClassId = classID;
  }

  // Open/closed follows the state the user left it in on the previous
  // experiment page ("open stays open, closed stays closed"). Only when there
  // is no prior state (first experiment page this session) does the LIST page
  // auto-open while form/detail start as a launcher icon.
  const [open, setOpen] = useState(
    () => persistedOpen ?? /\/experiments\/?$/.test(location.pathname),
  );
  const [messages, setMessages] = useState<AssistantMsg[]>(
    () => persistedMessages,
  );
  const [input, setInput] = useState(() => persistedInput);
  const [loading, setLoading] = useState(false);
  const [lastConfig, setLastConfig] = useState<ExperimentConfig | null>(
    lastDraftConfig,
  );
  const [showJson, setShowJson] = useState(false);
  const [panelRect, setPanelRect] = useState<PanelRect>(() =>
    persistedPanelRect ? clampPanelRect(persistedPanelRect) : initialPanelRect(),
  );
  const [fabPos, setFabPos] = useState<FabPos>(() =>
    persistedFabPos ? clampFabPos(persistedFabPos) : initialFabPos(),
  );

  // Mirror the continuity-relevant state into the module-level store as it
  // changes, so the next mount (after a page switch) restores it.
  useEffect(() => {
    persistedOpen = open;
  }, [open]);
  useEffect(() => {
    persistedInput = input;
  }, [input]);
  useEffect(() => {
    persistedPanelRect = panelRect;
  }, [panelRect]);
  useEffect(() => {
    persistedFabPos = fabPos;
  }, [fabPos]);
  // True when the last FAB pointer interaction was a drag — suppresses the
  // click-to-open that fires right after dropping it.
  const fabMovedRef = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const interactionRef = useRef<
    | {
      mode: "drag" | "resize";
      startX: number;
      startY: number;
      startRect: PanelRect;
    }
    | {
      mode: "fab";
      startX: number;
      startY: number;
      startPos: FabPos;
      moved: boolean;
    }
    | null
  >(null);

  const openDraft = useCallback(
    (config: ExperimentConfig) => {
      lastDraftConfig = config;
      setLastConfig(config);
      navigate(`/admin/class/${classID}/experiments/new`, {
        state: { prefillConfig: config },
      });
    },
    [classID, navigate],
  );

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, loading]);

  useEffect(() => {
    const handleResize = () => {
      setPanelRect((rect) => clampPanelRect(rect));
      setFabPos((pos) => clampFabPos(pos));
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      const interaction = interactionRef.current;
      if (!interaction) return;
      event.preventDefault();
      const dx = event.clientX - interaction.startX;
      const dy = event.clientY - interaction.startY;
      if (interaction.mode === "fab") {
        if (Math.hypot(dx, dy) > 3) interaction.moved = true;
        setFabPos(
          clampFabPos({
            x: interaction.startPos.x + dx,
            y: interaction.startPos.y + dy,
          }),
        );
        return;
      }
      const next =
        interaction.mode === "drag"
          ? {
            ...interaction.startRect,
            x: interaction.startRect.x + dx,
            y: interaction.startRect.y + dy,
          }
          : {
            ...interaction.startRect,
            width: interaction.startRect.width + dx,
            height: interaction.startRect.height + dy,
          };
      setPanelRect(clampPanelRect(next));
    };

    const stopInteraction = () => {
      const interaction = interactionRef.current;
      // Remember whether the FAB was actually dragged, so the click that fires
      // right after releasing it doesn't open the panel.
      if (interaction?.mode === "fab") fabMovedRef.current = interaction.moved;
      interactionRef.current = null;
      document.body.style.userSelect = "";
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", stopInteraction);
    window.addEventListener("pointercancel", stopInteraction);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", stopInteraction);
      window.removeEventListener("pointercancel", stopInteraction);
      document.body.style.userSelect = "";
    };
  }, []);

  const startDrag = (event: React.PointerEvent<HTMLElement>) => {
    if (event.button !== 0) return;
    if ((event.target as HTMLElement).closest("button")) return;
    event.preventDefault();
    interactionRef.current = {
      mode: "drag",
      startX: event.clientX,
      startY: event.clientY,
      startRect: panelRect,
    };
    document.body.style.userSelect = "none";
  };

  const startResize = (event: React.PointerEvent<HTMLElement>) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    interactionRef.current = {
      mode: "resize",
      startX: event.clientX,
      startY: event.clientY,
      startRect: panelRect,
    };
    document.body.style.userSelect = "none";
  };

  const startFabDrag = (event: React.PointerEvent<HTMLElement>) => {
    if (event.button !== 0) return;
    event.preventDefault();
    fabMovedRef.current = false;
    interactionRef.current = {
      mode: "fab",
      startX: event.clientX,
      startY: event.clientY,
      startPos: fabPos,
      moved: false,
    };
    document.body.style.userSelect = "none";
  };

  // Register WebMCP tools when a runtime is available (no-op otherwise).
  useEffect(() => {
    const mc: any = (navigator as any).modelContext;
    if (!mc || typeof mc.registerTool !== "function" || !classID) return;
    const regs: any[] = [];
    const safeRegister = (def: any) => {
      try {
        regs.push(mc.registerTool(def));
      } catch {
        /* ignore */
      }
    };
    safeRegister({
      name: "create_and_open_experiment_draft",
      description:
        "Open the New Experiment form pre-filled with the given experiment Config JSON for instructor review.",
      inputSchema: { type: "object", properties: { config: { type: "object" } } },
      execute: async (args: any) => {
        openDraft(args.config as ExperimentConfig);
        return { ok: true };
      },
    });
    safeRegister({
      name: "get_class_roster",
      description: "List the enrolled students (emails) of this class.",
      inputSchema: { type: "object", properties: {} },
      execute: async () => ({ students: await experimentApi.roster(classID) }),
    });
    return () => {
      regs.forEach((r) => {
        try {
          r?.unregister?.();
        } catch {
          /* ignore */
        }
      });
    };
  }, [classID, openDraft]);

  // Update both React state and the module store. The store is written
  // imperatively (not via effect) because a drafted config navigates to the
  // form in the same tick — the component can unmount before effects run, and
  // the final reply would otherwise be lost.
  const commitMessages = (msgs: AssistantMsg[]) => {
    persistedMessages = msgs;
    setMessages(msgs);
  };

  const send = async () => {
    if (!input.trim() || !classID || loading) return;
    const next: AssistantMsg[] = [
      ...messages,
      { role: "user", content: input.trim() },
    ];
    commitMessages(next);
    setInput("");
    setLoading(true);
    try {
      const res = await experimentApi.assistant(classID, next);
      commitMessages([...next, { role: "assistant", content: res.reply }]);
      if (res.config) openDraft(res.config);
    } catch (e: any) {
      commitMessages([
        ...next,
        { role: "assistant", content: `⚠️ ${e.message}` },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Launcher — draggable, anchored to the viewport's right edge */}
      <AnimatePresence>
        {!open && (
          <Box
            component={motion.button}
            onClick={() => {
              // A drag that ends on the button also fires a click — ignore it.
              if (fabMovedRef.current) {
                fabMovedRef.current = false;
                return;
              }
              setOpen(true);
            }}
            onPointerDown={startFabDrag}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: enter }}
            exit={{ opacity: 0, transition: exit }}
            whileTap={reduceMotion ? undefined : { scale: 0.98, transition: { duration: 0.15 } }}
            aria-label="open experiment assistant"
            // The floating launcher (DESIGN.md § The floating chat launcher): the
            // filled control's Soft sage disc, its 1 px edge and --shadow-2.
            sx={{
              position: "fixed",
              left: fabPos.x,
              top: fabPos.y,
              zIndex: "var(--z-assistant)",
              width: FAB_SIZE,
              height: FAB_SIZE,
              p: 0,
              borderRadius: "50%",
              cursor: "grab",
              touchAction: "none",
              color: "var(--launcher-icon)",
              display: "grid",
              placeItems: "center",
              bgcolor: "var(--launcher-fill)",
              border: "1px solid var(--launcher-border)",
              boxShadow: "var(--launcher-shadow)",
              "&:hover": { bgcolor: "var(--launcher-hover-fill)" },
              "&:active": { cursor: "grabbing", bgcolor: "var(--launcher-active-fill)" },
              // Bordered: focus recolours its own edge and keeps the launcher's shadow.
              "&:focus-visible": {
                outline: "none",
                borderColor: "var(--launcher-focus-border)",
                boxShadow: "inset 0 0 0 1px var(--launcher-focus-border), var(--launcher-shadow)",
              },
            }}
          >
            <ChatGlyph sx={{ fontSize: "var(--launcher-icon-size)" }} />
          </Box>
        )}
      </AnimatePresence>

      {/* Panel */}
      <AnimatePresence>
        {open && (
          <Paper
            component={motion.div}
            initial={{ opacity: 0, y: reduceMotion ? 0 : 8 }}
            animate={{ opacity: 1, y: 0, transition: enter }}
            exit={{ opacity: 0, y: reduceMotion ? 0 : 8, transition: exit }}
            elevation={0}
            // A floating panel: the sheet, its hairline edge and --shadow-2.
            sx={{
              position: "fixed",
              left: panelRect.x,
              top: panelRect.y,
              pointerEvents: "auto",
              width: panelRect.width,
              height: panelRect.height,
              minWidth: Math.min(MIN_PANEL_WIDTH, getViewport().width - EDGE_GAP * 2),
              minHeight: Math.min(MIN_PANEL_HEIGHT, getViewport().height - EDGE_GAP * 2),
              display: "flex",
              flexDirection: "column",
              zIndex: "var(--z-assistant)",
              borderRadius: "var(--radius-sheet)",
              overflow: "hidden",
              border: "1px solid var(--border)",
              boxShadow: "var(--shadow-2)",
            }}
          >
            {/* Header: a plain sheet with a hairline under it */}
            <Box
              sx={{
                px: 2,
                py: 1.75,
                display: "flex",
                alignItems: "center",
                gap: 1.5,
                color: "text.primary",
                borderBottom: "1px solid var(--border-subtle)",
                cursor: "move",
                userSelect: "none",
                touchAction: "none",
              }}
              onPointerDown={startDrag}
            >
              <Avatar sx={{ width: 38, height: 38 }}>
                <ChatGlyph sx={{ fontSize: 20, color: "var(--icon-default)" }} />
              </Avatar>
              <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                <Typography
                  sx={{
                    fontWeight: 600,
                    lineHeight: 1.2
                  }}>
                  Experiment Assistant
                </Typography>
                <Typography variant="caption" sx={{ color: "text.secondary" }}>
                  Describe it · I'll draft the config
                </Typography>
              </Box>
              <IconButton size="small" onClick={() => setOpen(false)}>
                <CloseIcon fontSize="small" />
              </IconButton>
            </Box>

            {/* Messages */}
            <Box ref={scrollRef} sx={{ flexGrow: 1, overflowY: "auto", p: 2 }}>
              {messages.length === 0 && (
                <Box sx={{ textAlign: "center", mt: 3, px: 1 }}>
                  <Box
                    sx={{
                      width: 56,
                      height: 56,
                      borderRadius: "50%",
                      display: "grid",
                      placeItems: "center",
                      mx: "auto",
                      mb: 1.5,
                      bgcolor: "action.hover",
                    }}
                  >
                    <ChatGlyph sx={{ fontSize: 26, color: "var(--icon-default)" }} />
                  </Box>
                  <Typography variant="body2" sx={{
                    color: "text.secondary"
                  }}>
                    Describe the experiment you want — e.g.{" "}
                    <Box component="span" sx={{ color: "text.primary", fontStyle: "italic" }}>
                      "Two groups 50/50: control on openai with default prompts,
                      treatment on qwen that never gives direct answers."
                    </Box>{" "}
                    I'll draft the config and open it for review.
                  </Typography>
                </Box>
              )}
              <Stack spacing={1.25}>
                {messages.map((m, i) => (
                  // Messages appear as they arrive, unanimated (a reading surface).
                  <Box
                    key={i}
                    sx={{
                      alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                      bgcolor: m.role === "user" ? "var(--surface-active)" : "action.hover",
                      color: "text.primary",
                      px: 1.75,
                      py: 1.25,
                      borderRadius: "var(--radius-sheet)",
                      borderTopRightRadius: m.role === "user" ? "var(--radius-small)" : "var(--radius-sheet)",
                      borderTopLeftRadius: m.role === "user" ? "var(--radius-sheet)" : "var(--radius-small)",
                      maxWidth: "88%",
                      whiteSpace: "pre-wrap",
                      typography: "body2",
                    }}
                  >
                    {m.content}
                  </Box>
                ))}
                {loading && (
                  <Box sx={{ alignSelf: "flex-start", bgcolor: "action.hover", borderRadius: "var(--radius-sheet)" }}>
                    <TypingDots />
                  </Box>
                )}
              </Stack>
            </Box>

            {/* Last draft JSON */}
            {lastConfig && (
              <Box sx={{ borderTop: "1px solid var(--border-subtle)" }}>
                <Button
                  size="small"
                  fullWidth
                  onClick={() => setShowJson((s) => !s)}
                  sx={{
                    justifyContent: "space-between",
                    px: 2,
                    borderRadius: 0,
                    // The panel clips its edges, so the ring is drawn inside the button.
                    "&.Mui-focusVisible, &:focus-visible": { outlineOffset: "calc(-1 * var(--size-focus-ring))" },
                  }}
                >
                  {showJson ? "Hide" : "View"} last draft JSON
                </Button>
                <Collapse in={showJson}>
                  <Box
                    component="pre"
                    sx={{
                      m: 0,
                      p: 1.5,
                      maxHeight: 200,
                      overflow: "auto",
                      bgcolor: "action.hover",
                      color: "text.primary",
                      fontFamily: "var(--font-mono)",
                      fontSize: "var(--type-caption-size)",
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                    }}
                  >
                    {JSON.stringify(lastConfig, null, 2)}
                  </Box>
                </Collapse>
              </Box>
            )}

            {/* Composer */}
            <Box sx={{ p: 1.25, display: "flex", gap: 1, alignItems: "flex-end", borderTop: "1px solid var(--border-subtle)" }}>
              <TextField
                size="small"
                fullWidth
                placeholder="Describe your experiment…"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                multiline
                maxRows={4}
              />
              <IconButton
                onClick={send}
                disabled={loading || !input.trim()}
                // Send is the filled control: the primary's fill, edge and label colour.
                sx={{
                  color: "var(--button-primary-text)",
                  bgcolor: "var(--button-primary-fill)",
                  border: "1px solid var(--button-primary-border)",
                  width: 40,
                  height: 40,
                  "&:hover": { bgcolor: "var(--button-primary-hover-fill)", color: "var(--button-primary-hover-text)" },
                  "&:active": { bgcolor: "var(--button-primary-active-fill)" },
                  // Bordered: focus recolours its own edge (one frame).
                  "&.Mui-focusVisible, &:focus-visible": {
                    outline: "none",
                    borderColor: "var(--button-primary-focus-border)",
                    boxShadow: "inset 0 0 0 1px var(--button-primary-focus-border)",
                  },
                  "&.Mui-disabled": {
                    bgcolor: "var(--button-primary-disabled-fill)",
                    color: "var(--button-primary-disabled-text)",
                    borderColor: "var(--button-primary-disabled-border)",
                  },
                }}
              >
                <Send sx={{ fontSize: 18 }} />
              </IconButton>
            </Box>
            <Box
              onPointerDown={startResize}
              aria-label="resize experiment assistant"
              sx={{
                position: "absolute",
                right: 0,
                bottom: 0,
                width: 24,
                height: 24,
                cursor: "nwse-resize",
                touchAction: "none",
                pointerEvents: "auto",
                "&:before": {
                  content: '""',
                  position: "absolute",
                  right: 6,
                  bottom: 6,
                  width: 10,
                  height: 10,
                  borderRight: "2px solid var(--border-interactive)",
                  borderBottom: "2px solid var(--border-interactive)",
                },
              }}
            />
          </Paper>
        )}
      </AnimatePresence>
    </>
  );
};

export default ExperimentAssistant;
