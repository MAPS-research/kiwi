// Shared builder for the v2 chat request's `context` block.
//
// Both the main chat stream (ChatCore) and the experiment compare lanes
// (useChatLane) post to /student/chat/v2 and must describe the user's surface
// identically — the only difference between them is which experiment variant is
// previewed. Keeping the mapping here means a compare lane can never drift from
// what the real chat sends, so a side-by-side reads as a true variant diff.

export interface ExperimentPreview {
  experimentId: string;
  variantKey: string;
}

export interface ChatContextParams {
  classId?: string;
  pdfId?: string;
  pdfPage?: number;
  pdfMaterialType?: string;
  activeTab?: string;
  activeView?: string;
  currentPath?: string;
  activeAppSlug?: string;
  activeAppName?: string;
  appContext?: string;
  appTutoringMode?: string;
  /** Instructor/admin-only variant preview override. */
  experiment?: ExperimentPreview;
}

export const buildChatContext = ({
  classId,
  pdfId,
  pdfPage,
  pdfMaterialType,
  activeTab,
  activeView,
  currentPath,
  activeAppSlug,
  activeAppName,
  appContext,
  appTutoringMode,
  experiment,
}: ChatContextParams): Record<string, any> => {
  // materialType may be unset for some documents — don't drop the whole pdf
  // context over it.
  const hasPdfContext = classId && pdfId;

  // Ensure activeTab always has a valid value (required by v2 endpoint)
  const effectiveActiveTab = activeTab || "chat";

  // Check if we're on an app tab - different context handling
  const isAppTab = effectiveActiveTab === "app";

  // The Code tab (activeView 'code') keeps the last-viewed PDF's context in
  // global state; sending it would dilute code questions with unrelated
  // material chunks, so skip pdf context there — the editor code travels via
  // app context instead.
  const isCodeView = activeView === "code";

  return {
    environment: {
      activeTab: effectiveActiveTab,
      ...(activeView && { activeView }),
      ...(currentPath && { currentPath }),
      ...(activeAppSlug && { activeAppSlug }),
      ...(activeAppName && { activeAppName }),
    },
    // Include PDF context only when NOT on the app tab or the Code tab
    ...(!isAppTab &&
      !isCodeView &&
      hasPdfContext && {
        pdf: {
          classId: classId,
          pdfId: pdfId,
          pageNumber: (pdfPage || 0) + 1,
          materialType: pdfMaterialType || "",
        },
      }),
    // Include app context on the app tab OR whenever the surface requests a
    // tutoring mode (e.g. the Code tab, which asks for 'guidance' but reports
    // activeTab 'materials'). The backend keys the Socratic guardrail off
    // context.app.tutoringMode, so it must be sent regardless of the tab.
    ...((isAppTab || appTutoringMode) && {
      app: {
        ...(activeAppSlug && { appSlug: activeAppSlug }),
        ...(appContext && { appContext }),
        ...(classId && { classId }),
        // Forward tutoring mode so the backend applies the Socratic guardrail
        // (hints instead of full solutions) for codegen exercises.
        ...(appTutoringMode && { tutoringMode: appTutoringMode }),
      },
    }),
    ...(experiment && { experiment }),
  };
};
