import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import SharedClassCard from "./ClassCard.tsx";

const theme = createTheme();

// Token values stay var() strings in jsdom's computed style, which toHaveStyle cannot parse.
const computed = (element: Element | null) => getComputedStyle(element as Element);

const renderCard = (component: React.ReactElement) => render(
  <MemoryRouter>
    <ThemeProvider theme={theme}>{component}</ThemeProvider>
  </MemoryRouter>,
);

describe("SharedClassCard", () => {
  it("shows Kiwi's logo at 64 px on a flat tile when the class has no image", () => {
    renderCard(
      <SharedClassCard
        title="No image class"
        instructor="Professor Example"
        to="/NO-IMAGE"
      />,
    );

    const media = screen.getByTestId("class-card-media");
    expect(media).toHaveStyle({ height: "152px" });
    expect(computed(media).backgroundColor).toBe("var(--surface-hover)");
    expect(computed(media).backgroundImage).not.toContain("gradient");
    const logo = media.querySelector("img");
    expect(logo).toHaveAttribute("src", "/assets/images/kiwi-mark.svg");
    expect(logo).toHaveAttribute("alt", "");
    expect(computed(logo).width).toBe("var(--companion-slot-inline)");
    expect(screen.queryByText("Kiwi")).not.toBeInTheDocument();

    const card = media.closest(".MuiCard-root");
    expect(card).toHaveStyle({ height: "252px" });
  });

  it("shows the class image as a decorative cover", () => {
    renderCard(
      <SharedClassCard title="Imaged class" instructor="Professor Example" imageUrl="/cover.webp" to="/IMG" />,
    );

    const image = screen.getByTestId("class-card-image");
    expect(image).toHaveAttribute("src", "/cover.webp");
    expect(image).toHaveAttribute("alt", "");
    expect(image).toHaveStyle({ objectFit: "cover" });
  });

  it("falls back to the logo when the image fails to load", () => {
    renderCard(
      <SharedClassCard title="Broken image" instructor="Professor Example" imageUrl="/missing.webp" to="/BROKEN" />,
    );

    fireEvent.error(screen.getByTestId("class-card-image"));

    expect(screen.queryByTestId("class-card-image")).not.toBeInTheDocument();
    expect(
      screen.getByTestId("class-card-media").querySelector('img[src="/assets/images/kiwi-mark.svg"]'),
    ).toBeInTheDocument();
  });

  it("is one link named after the class, carrying the class name in its state", () => {
    renderCard(
      <SharedClassCard title="Statistics" instructor="Dr. Lena Hartmann" to="/STAT" routeState={{ className: "Statistics" }} />,
    );

    const link = screen.getByRole("link", { name: "Open Statistics" });
    expect(link).toHaveAttribute("href", "/STAT");
    expect(link).toHaveClass("MuiCard-root");
    expect(screen.getByText("Statistics")).toHaveClass("MuiTypography-subtitle1");
    const instructor = screen.getByText("Dr. Lena Hartmann");
    expect(instructor).toHaveStyle({ whiteSpace: "nowrap", textOverflow: "ellipsis" });
    expect(computed(instructor).color).toBe("var(--text-secondary)");
  });

  it("names a class without a name or an instructor", () => {
    renderCard(<SharedClassCard title="  " instructor="" to="/UNNAMED" />);

    expect(screen.getByRole("link", { name: "Open Untitled class" })).toBeInTheDocument();
    expect(screen.getByText("Untitled class")).toBeInTheDocument();
    expect(screen.getByText("No instructor listed")).toBeInTheDocument();
    expect(screen.queryByText("Unnamed class")).not.toBeInTheDocument();
    expect(screen.queryByText("Instructor TBD")).not.toBeInTheDocument();
  });

  it("renders a non-interactive card when no destination is provided", () => {
    renderCard(<SharedClassCard title="Preview class" instructor="Professor Preview" />);

    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.getByText("Preview class")).toBeInTheDocument();
    expect(screen.getByText("Professor Preview")).toBeInTheDocument();
    const card = screen.getByText("Preview class").closest(".MuiCard-root");
    expect(card).toHaveStyle({ width: "100%" });
    expect(card).not.toHaveAttribute("tabindex");
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
