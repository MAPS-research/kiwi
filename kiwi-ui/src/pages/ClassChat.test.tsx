import { render, screen } from "@testing-library/react";
import { ClassChat } from "./ClassChat.tsx";
import { ChatContext } from "./ClassLayout.tsx";

vi.mock("../context/GlobalChatContext.tsx", () => ({
  useGlobalChat: () => ({
    setCurrentClassId: vi.fn(),
    setCurrentPdfId: vi.fn(),
    setCurrentPdfPage: vi.fn(),
    setCurrentPdfMaterialType: vi.fn(),
    setPdfContent: vi.fn(),
    setActiveTab: vi.fn(),
    setActiveAppSlug: vi.fn(),
    setActiveAppName: vi.fn(),
    setAppContext: vi.fn(),
  }),
}));

vi.mock("../components/Chat/PDFComponent.tsx", () => ({
  default: () => <div data-testid="materials" />,
}));

describe("ClassChat", () => {
  it("shows a status line until the class is known", () => {
    render(<ClassChat />);
    expect(screen.getByRole("status")).toHaveTextContent("Loading class…");
    expect(screen.queryByTestId("materials")).not.toBeInTheDocument();
  });

  it("shows the class materials once the class is known", () => {
    render(
      <ChatContext.Provider value={{ class: { classID: "class-1" } }}>
        <ClassChat />
      </ChatContext.Provider>
    );
    expect(screen.getByTestId("materials")).toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});
