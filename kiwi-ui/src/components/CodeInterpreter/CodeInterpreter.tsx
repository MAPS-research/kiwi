import { IDE } from "./IDE.tsx";

interface ChatMessages {
  isAi: boolean;
  content: string;
  typing?: boolean;
  uniqueId?: string;
  imgURLs?: string[];
  comment?: string;
  error: boolean;
}

interface CodeInterpreterProps {
  handleSendMessage: (promptMessage: string) => Promise<void>;
  Messages: ChatMessages[];
  exportCode: (prompt: string) => void;
  pdfInfo: string;
  onLanguageChange?: (lang: "python" | "r") => void;
  allowR?: boolean;
}

export const CodeInterpreter: React.FC<CodeInterpreterProps> = ({
  pdfInfo,
  handleSendMessage,
  Messages,
  exportCode,
  onLanguageChange,
  allowR,
}) => {
  return (
    <IDE
      pdfInfo={pdfInfo}
      Messages={Messages}
      exportCode={exportCode}
      handleSendMessage={handleSendMessage}
      onLanguageChange={onLanguageChange}
      allowR={allowR}
    />
  );
};
