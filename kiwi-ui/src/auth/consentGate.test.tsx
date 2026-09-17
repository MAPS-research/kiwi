import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import ProtectedRoute from "./ProtectedRoute.tsx";
import AdminProtectedRoute from "./AdminProtectedRoute.tsx";

let mockUser: Record<string, unknown> | null = null;

vi.mock("./AuthContext.tsx", () => ({
  useAuth: () => ({ user: mockUser }),
}));

const renderAt = (guard: "user" | "admin") =>
  render(
    <MemoryRouter initialEntries={["/home"]}>
      <Routes>
        <Route
          path="/home"
          element={
            guard === "user" ? (
              <ProtectedRoute>
                <div>main page</div>
              </ProtectedRoute>
            ) : (
              <AdminProtectedRoute>
                <div>main page</div>
              </AdminProtectedRoute>
            )
          }
        />
        <Route path="/consent" element={<div>consent page</div>} />
      </Routes>
    </MemoryRouter>,
  );

/**
 * The research-consent gate only applies when a deployment configures a
 * consent document; a fresh install must land on the main page.
 */
describe("consent gate", () => {
  beforeEach(() => {
    mockUser = { username: "a@example.com", consent: false, isAdmin: true };
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it.each(["user", "admin"] as const)(
    "lets a %s through when no consent document is configured",
    async (guard) => {
      renderAt(guard);
      expect(await screen.findByText("main page")).toBeInTheDocument();
      expect(screen.queryByText("consent page")).not.toBeInTheDocument();
    },
  );

  it.each(["user", "admin"] as const)(
    "sends a %s to /consent when a consent document is configured",
    async (guard) => {
      vi.stubEnv("VITE_CONSENT_FORM_URL", "https://example.edu/consent.pdf");
      renderAt(guard);
      expect(await screen.findByText("consent page")).toBeInTheDocument();
    },
  );

  it("lets a consenting user through when a document is configured", async () => {
    vi.stubEnv("VITE_CONSENT_FORM_URL", "https://example.edu/consent.pdf");
    mockUser = { username: "a@example.com", consent: true, isAdmin: true };
    renderAt("user");
    expect(await screen.findByText("main page")).toBeInTheDocument();
  });
});
