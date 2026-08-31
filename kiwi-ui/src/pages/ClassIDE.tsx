import React, { useContext, useState, useCallback, useEffect, useRef } from "react";
import { Box } from "@mui/material";
import { CodeInterpreter } from "../components/CodeInterpreter/CodeInterpreter.tsx";
import { IDEContext } from "../components/Chat/ChatComponent.tsx";
import { ChatContext } from "./ClassLayout.tsx";
import { useGlobalChat } from "../context/GlobalChatContext.tsx";
import { useAuth } from "../auth/AuthContext.tsx";
import { useParams } from "react-router-dom";
import type { ChatMessage } from "../components/Chat/ChatMessages.tsx";

/**
 * IDE state persisted to localStorage so the student's code survives both a
 * tab-switch (ClassIDE unmounts when leaving the Code tab) and a full refresh.
 * We persist the editor code only — uploaded-file ArrayBuffers don't serialize
 * and can be large, so file tabs are session-scoped and reset to [Code Space]
 * on any remount (see the hydration effect below). Mirrors the load/save +
 * useEffect pattern in GlobalChatContext.tsx.
 */
interface PersistedIDEState {
  code: string;
}

const ideStorageKey = (classId: string) => `ideState_${classId}`;

/**
 * IDE column width. Capped at a readable default instead of stretching across
 * the whole viewport, but resizable via the drag handle on its right edge and
 * persisted globally (not per class — it's a display preference).
 */
const IDE_WIDTH_KEY = "ideEditorWidth";
const DEFAULT_IDE_WIDTH = 960;
const MIN_IDE_WIDTH = 480;

function loadIDEWidth(): number {
  try {
    const stored = Number(localStorage.getItem(IDE_WIDTH_KEY));
    if (Number.isFinite(stored) && stored >= MIN_IDE_WIDTH) return stored;
  } catch (error) {
    console.warn("[ClassIDE] Failed to load IDE width:", error);
  }
  return DEFAULT_IDE_WIDTH;
}

function loadIDEState(classId: string | undefined): PersistedIDEState | null {
  if (!classId) return null;
  try {
    const stored = localStorage.getItem(ideStorageKey(classId));
    if (stored) return JSON.parse(stored);
  } catch (error) {
    console.warn("[ClassIDE] Failed to load IDE state from storage:", error);
  }
  return null;
}

function saveIDEState(classId: string | undefined, state: PersistedIDEState): void {
  if (!classId) return;
  try {
    localStorage.setItem(ideStorageKey(classId), JSON.stringify(state));
  } catch (error) {
    console.warn("[ClassIDE] Failed to save IDE state to storage:", error);
  }
}

/**
 * Standalone IDE page for the Code Interpreter.
 * Accessible via the "Code" tab in class layout.
 */
export const ClassIDE: React.FC = () => {
  const { currentPDFID, class: myClass } = useContext(ChatContext);
  const {
    openChat,
    setPendingPrompt,
    setActiveTab,
    setActiveView,
    setActiveAppSlug,
    setActiveAppName,
    setAppContext,
    setAppTutoringMode,
    setCurrentClassId,
    pendingCode,
    clearPendingCode,
  } = useGlobalChat();

  // The Code tab is a coding surface, so its chat must get the same tutoring
  // guardrail as the codegen app tab (hints, not full solutions). We keep
  // activeTab as 'materials' (there's no dedicated code tab value the backend
  // branches on for this scratch IDE) but label the sub-view 'code' and, crucially,
  // request tutoringMode 'guidance' — the trigger the backend actually keys on.
  // Without this the request looked like plain "class materials" and the model
  // dumped the full solution.
  useEffect(() => {
    setActiveTab('materials');
    setActiveView('code');
    setActiveAppSlug('codegen');
    setActiveAppName(undefined);
    setAppTutoringMode('guidance');
    return () => {
      // Leaving the Code tab: drop the code-specific guardrail/context.
      setActiveView(undefined);
      setActiveAppSlug(undefined);
      setAppTutoringMode(undefined);
      setAppContext(undefined);
    };
  }, [
    setActiveTab,
    setActiveView,
    setActiveAppSlug,
    setActiveAppName,
    setAppTutoringMode,
    setAppContext,
  ]);

  // Sync class ID to global chat context
  useEffect(() => {
    if (myClass?.classID) {
      setCurrentClassId(myClass.classID);
    }
  }, [myClass?.classID, setCurrentClassId]);

  // IDE state. IDECode lazily hydrates from localStorage for this class so a
  // refresh restores the last-typed code even before the async class fetch
  // resolves classID; the hydration effect below covers the mount-before-classID
  // case.
  const [IDECode, setIDECode] = useState<string>(
    () => loadIDEState(myClass?.classID)?.code ?? ""
  );
  const [IDEOutputCode, setIDEOutputCode] = useState<string>("");
  const [ideLanguage, setIdeLanguage] = useState<"python" | "r">("python");
  // R is per-class: the RLanguageClass feature flag gates it. Until now the
  // flag had no reader anywhere, so granting it did nothing and every class
  // saw the R option whether or not it had been given.
  const { classID } = useParams<{ classID?: string }>();
  const { availableFeatures } = useAuth();
  const allowR = availableFeatures.some(
    (f) =>
      f.featureName === "RLanguageClass" &&
      // A class grant must match THIS class; a user-level grant applies anywhere.
      (f.validFor !== "class" || f.validForID === classID),
  );
  const [IDEfileNameState, setIDEFileNameState] = useState<string[]>([]);
  const [IDEFileBufferState, setIDEFileBufferState] = useState<ArrayBuffer[]>([]);
  const [IDEModifiedFileBufferState, setModifiedFileBufferState] = useState<ArrayBuffer[]>([]);
  const [IDETabs, setIDETabs] = useState([{ label: "Code Space", content: "Code space" }]);
  const [IDETabvalue, setIDETabValue] = useState(0);

  // Consume code handed off from the chat's "Import Code to IDE" button (#177):
  // load it into the editor, then clear it so re-entering the Code tab doesn't
  // re-import stale code.
  useEffect(() => {
    if (pendingCode !== undefined) {
      setIDECode(pendingCode);
      clearPendingCode();
    }
  }, [pendingCode, clearPendingCode]);

  // Hydrate IDECode from localStorage once classID is known. The lazy useState
  // initializer above already handles the case where classID is available at
  // first render; this covers the common case where ClassIDE mounts before the
  // async class fetch resolves classID. Runs at most once, and yields to an
  // in-flight #177 import (pendingCode) so we never clobber imported code.
  const hasHydratedRef = useRef(false);
  useEffect(() => {
    if (hasHydratedRef.current) return;
    if (!myClass?.classID) return;
    if (pendingCode !== undefined) return;
    hasHydratedRef.current = true;
    const persisted = loadIDEState(myClass.classID);
    if (persisted?.code) {
      setIDECode(persisted.code);
    }
  }, [myClass?.classID, pendingCode]);

  // Persist IDECode to localStorage (per class), debounced so we're not writing
  // on every keystroke. Only writes once classID is known.
  useEffect(() => {
    const classId = myClass?.classID;
    if (!classId) return;
    const handle = setTimeout(() => {
      saveIDEState(classId, { code: IDECode });
    }, 400);
    return () => clearTimeout(handle);
  }, [myClass?.classID, IDECode]);

  // Surface the student's current IDE code to the AI as app context so hints are
  // grounded in what they've actually written. Code/output are truncated to match
  // the backend's code-context limits.
  useEffect(() => {
    if (!IDECode.trim()) {
      setAppContext(undefined);
      return;
    }
    const languageLabel = ideLanguage === "python" ? "Python" : "R";
    const trimmedCode = IDECode.slice(0, 6000);
    const trimmedOutput = IDEOutputCode.trim().slice(0, 2000);
    setAppContext(
      `The student is working in the code editor (language: ${languageLabel}). Their current code:\n\`\`\`\n${trimmedCode}\n\`\`\`` +
        (trimmedOutput
          ? `\n\nLatest run output:\n\`\`\`\n${trimmedOutput}\n\`\`\``
          : "")
    );
  }, [IDECode, IDEOutputCode, ideLanguage, setAppContext]);

  // Resizable IDE column: centered with a sane default width; the handle on
  // the right edge drags the width (kept centered, so width tracks 2x the
  // cursor's distance from center). Persisted with the same debounce pattern
  // as the code above.
  const [ideWidth, setIdeWidth] = useState<number>(() => loadIDEWidth());
  const ideContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handle = setTimeout(() => {
      try {
        localStorage.setItem(IDE_WIDTH_KEY, String(ideWidth));
      } catch (error) {
        console.warn("[ClassIDE] Failed to save IDE width:", error);
      }
    }, 400);
    return () => clearTimeout(handle);
  }, [ideWidth]);

  const handleResizePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
  }, []);

  const handleResizePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
    const container = ideContainerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const center = rect.left + rect.width / 2;
    const width = Math.round((e.clientX - center) * 2);
    setIdeWidth(Math.max(MIN_IDE_WIDTH, Math.min(width, rect.width)));
  }, []);

  // Empty messages for CodeInterpreter (it can work without chat context)
  const messages: ChatMessage[] = [];

  // Connect to global chat modal
  const handleSendMessage = useCallback(async (_message: string) => {
    // Open the global chat modal
    openChat();
  }, [openChat]);

  const exportCode = useCallback((prompt: string) => {
    // Set the pending prompt and open the chat modal
    setPendingPrompt(prompt);
    openChat();
  }, [setPendingPrompt, openChat]);

  return (
    <Box
      ref={ideContainerRef}
      sx={{
        height: "100%",
        width: "100%",
        p: 2,
        display: "flex",
        justifyContent: "center",
      }}
    >
      <Box
        sx={{
          position: "relative",
          height: "100%",
          width: ideWidth,
          maxWidth: "100%",
        }}
      >
        <IDEContext.Provider
          value={{
            IDECode,
            setIDECode,
            IDEOutputCode,
            setIDEOutputCode,
            IDEfileNameState,
            setIDEFileNameState,
            IDEFileBufferState,
            setIDEFileBufferState,
            IDEModifiedFileBufferState,
            setModifiedFileBufferState,
            IDETabs,
            setIDETabs,
            IDETabvalue,
            setIDETabValue,
          }}
        >
          <CodeInterpreter
            pdfInfo={currentPDFID || ""}
            handleSendMessage={handleSendMessage}
            Messages={messages}
            exportCode={exportCode}
            onLanguageChange={setIdeLanguage}
            allowR={allowR}
          />
        </IDEContext.Provider>

        {/* Drag handle to resize the IDE column */}
        <Box
          onPointerDown={handleResizePointerDown}
          onPointerMove={handleResizePointerMove}
          aria-label="resize editor"
          sx={{
            position: "absolute",
            top: 0,
            right: -14,
            width: 14,
            height: "100%",
            cursor: "col-resize",
            touchAction: "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            "&:hover .resize-grip, &:active .resize-grip": {
              bgcolor: "primary.main",
            },
          }}
        >
          <Box
            className="resize-grip"
            sx={{
              width: 4,
              height: 48,
              borderRadius: 2,
              bgcolor: "divider",
              transition: "background-color 0.15s",
            }}
          />
        </Box>
      </Box>
    </Box>
  );
};

export default ClassIDE;
