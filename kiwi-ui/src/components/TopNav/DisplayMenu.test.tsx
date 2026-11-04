import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeProvider } from "@mui/material/styles";
import { createKiwiTheme } from "../../Theme.ts";
import {
  DisplayPreferencesProvider,
  KIWI_ANIMATION_STORAGE_KEY,
} from "../../theme/displayPreferences.tsx";
import DisplayMenu from "./DisplayMenu.tsx";

const defaultMatchMedia = window.matchMedia;

function stubFlags({ dark, motion }: { dark: boolean; motion: boolean }) {
  vi.stubEnv("VITE_ENABLE_DARK_MODE", dark ? "true" : "false");
  vi.stubEnv("VITE_ENABLE_MASCOT_MOTION", motion ? "true" : "false");
}

function renderMenu() {
  return render(
    <ThemeProvider theme={createKiwiTheme({ dark: true })} defaultMode="light" modeStorageKey="test-theme-mode">
      <DisplayPreferencesProvider>
        <DisplayMenu />
      </DisplayPreferencesProvider>
    </ThemeProvider>
  );
}

async function openMenu() {
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: "Display settings" }));
  return { user, menu: screen.getByRole("menu", { name: "Display settings" }) };
}

afterEach(() => {
  vi.unstubAllEnvs();
  window.matchMedia = defaultMatchMedia;
  vi.mocked(window.localStorage.setItem).mockReset();
  document.documentElement.removeAttribute("data-theme");
});

describe("DisplayMenu", () => {
  it("is hidden when the deployment offers neither choice", () => {
    stubFlags({ dark: false, motion: false });
    renderMenu();

    expect(screen.queryByRole("button", { name: "Display settings" })).not.toBeInTheDocument();
  });

  it("offers Match device, Light and Dark, and re-themes the page at once", async () => {
    stubFlags({ dark: true, motion: false });
    renderMenu();
    const { user, menu } = await openMenu();

    expect(within(menu).getByText("Theme")).toBeInTheDocument();
    expect(within(menu).getAllByRole("menuitemradio").map((item) => item.textContent)).toEqual([
      "Match device",
      "Light",
      "Dark",
    ]);
    expect(within(menu).queryByText("Kiwi animation")).not.toBeInTheDocument();

    await user.click(within(menu).getByRole("menuitemradio", { name: "Dark" }));

    expect(document.documentElement).toHaveAttribute("data-theme", "dark");
    expect(within(menu).getByRole("menuitemradio", { name: "Dark" })).toHaveAttribute("aria-checked", "true");
    expect(within(menu).getByRole("menuitemradio", { name: "Light" })).toHaveAttribute("aria-checked", "false");
  });

  it("turns Kiwi animation off and keeps the choice on this device", async () => {
    stubFlags({ dark: false, motion: true });
    renderMenu();
    const { user, menu } = await openMenu();

    expect(within(menu).queryByText("Theme")).not.toBeInTheDocument();
    const animation = within(menu).getByRole("menuitemcheckbox", { name: "Kiwi animation" });
    expect(animation).toHaveAttribute("aria-checked", "true");

    await user.click(animation);

    expect(animation).toHaveAttribute("aria-checked", "false");
    expect(window.localStorage.setItem).toHaveBeenCalledWith(KIWI_ANIMATION_STORAGE_KEY, "off");
  });

  it("holds the switch still, with its reason, when the device asks for reduced motion", async () => {
    stubFlags({ dark: false, motion: true });
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query.includes("prefers-reduced-motion"),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
    renderMenu();
    const { user, menu } = await openMenu();

    const animation = within(menu).getByRole("menuitemcheckbox", { name: "Kiwi animation" });
    expect(animation).toHaveAttribute("aria-disabled", "true");
    expect(animation).toHaveAttribute("aria-checked", "false");
    expect(animation).toHaveAccessibleDescription("Your device is set to reduce motion, so Kiwi stays still.");

    await user.click(animation);

    expect(window.localStorage.setItem).not.toHaveBeenCalledWith(KIWI_ANIMATION_STORAGE_KEY, expect.anything());
  });

  it("says so when the browser will not keep the choice", async () => {
    stubFlags({ dark: false, motion: true });
    vi.mocked(window.localStorage.setItem).mockImplementation(() => {
      throw new Error("blocked");
    });
    renderMenu();
    const { user, menu } = await openMenu();

    await user.click(within(menu).getByRole("menuitemcheckbox", { name: "Kiwi animation" }));

    expect(within(menu).getByRole("status")).toHaveTextContent(
      "Your browser won't save this setting, so it resets when you reload the page."
    );
  });
});
