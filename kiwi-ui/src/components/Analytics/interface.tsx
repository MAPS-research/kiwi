// export interface Action {
//   name: string;
//   timestamp: string;
//   context: {};
// }
export interface Interaction {
  id: string;
  userId: string;
  sessionId: string;
  timestamp: Date;
  type: string;
  pdfId?: string;
  pdfMaterialType?: string;
  pdfPage?: number;
  context: Record<string, unknown>;
}

export interface SessionActivity {
  userId: string;
  sessionId: string;
  sessionStartTime: Date;
  totalWatchTime: number;
  pdfActions: pdfAction[];
  codeActions: codeAction[];
  chatActions: chatAction[];
  otherActions: Interaction[];
  weekStart: Date;
}

export interface pdfAction extends Interaction {
  pdfId: string;
  pdfPage: number;
  pdfMaterialType: string;
}
export interface chatAction extends Interaction {
  pdfId: string;
  pdfPage: number;
  pdfMaterialType: string;
  context: {
    uniqueID: string;
    content: {
      prompt: string;
      answer: string;
    };
    engineChoice?: string;
  };
}
export interface codeAction extends Interaction {
  type: string;
  timestamp: Date;
  context: {
    userCode: string;
    outputCode?: string;
  };
}