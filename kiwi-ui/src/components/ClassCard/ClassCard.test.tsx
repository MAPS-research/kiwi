import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import SharedClassCard from "./ClassCard.tsx";

const theme = createTheme();

const renderCard = (component: React.ReactElement) => render(
  <MemoryRouter>
    <ThemeProvider theme={theme}>{component}</ThemeProvider>
  </MemoryRouter>,
);

describe("SharedClassCard", () => {
  it("renders a fixed media region and card height without an image", () => {
    renderCard(
      <SharedClassCard
        title="No image class"
        instructor="Professor Example"
        to="/NO-IMAGE"
      />,
    );

    expect(screen.getByTestId("class-card-image-fallback")).toBeInTheDocument();
    expect(screen.getByTestId("class-card-media")).toHaveStyle({ height: "152px" });
    const card = screen.getByTestId("class-card-media").closest(".MuiCard-root");
    expect(card).toHaveStyle({
      height: "252px",
      backgroundColor: "rgb(245, 245, 245)",
    });
    expect(screen.getByTestId("class-card-image-fallback")).toHaveStyle({
      backgroundImage: "linear-gradient(135deg, #f5f5f5 0%, #e0e0e0 100%)",
    });
    expect(screen.getByTestId("class-card-placeholder-wordmark")).toHaveTextContent("Kiwi");
    expect(screen.getByTestId("class-card-content")).toHaveStyle({ marginTop: "-16px" });
  });

  it("renders a non-interactive card when no destination is provided", () => {
    renderCard(<SharedClassCard title="Preview class" instructor="Professor Preview" />);

    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.getByText("Preview class")).toBeInTheDocument();
    expect(screen.getByText("Professor Preview")).toBeInTheDocument();
    expect(screen.getByText("Preview class").closest(".MuiCard-root")?.parentElement).toHaveStyle({
      width: "100%",
    });
  });

  it("keeps an empty preview hoverable without making it a link", () => {
    renderCard(
      <SharedClassCard
        title="Empty preview"
        instructor="Professor Preview"
        hoverable
      />,
    );

    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.getByText("Empty preview").closest(".MuiCard-root")).toHaveAttribute(
      "tabindex",
      "0",
    );
  });
});
