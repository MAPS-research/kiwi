import { beforeEach, describe, expect, it, vi } from "vitest";

vi.unmock("./api.ts");
vi.unmock("../services/index.ts");
vi.unmock("../services/models/index.ts");
vi.unmock("../services/runtime.ts");

import apiClient, { kiwiAppsApiClient, bridgeKiwiAppsApiClient } from "./api.ts";

describe("API authentication headers", () => {
  beforeEach(() => {
    vi.mocked(localStorage.getItem).mockReturnValue("user-token");
    vi.mocked(fetch).mockReset();
    vi.mocked(fetch).mockResolvedValue(
      new Response("[]", { status: 200, headers: { "Content-Type": "application/json" } }),
    );
  });

  it("authenticates app-list requests whose generated client omits auth metadata", async () => {
    await kiwiAppsApiClient.kiwiAppControllerListApps();
    const [url, init] = vi.mocked(fetch).mock.calls[0];
    expect(url).toContain("/api/kiwi-apps");
    expect(new Headers(init?.headers).get("Authorization")).toBe("Bearer user-token");
    expect(init?.credentials).toBe("include");
  });

  it("does not double-prefix headers supplied by generated clients", async () => {
    await apiClient.authControllerGetProfile();
    expect(new Headers(vi.mocked(fetch).mock.calls[0][1]?.headers).get("Authorization"))
      .toBe("Bearer user-token");
  });

  it("preserves an explicitly supplied authorization header", async () => {
    await kiwiAppsApiClient.kiwiAppControllerListApps({}, {
      headers: { authorization: "Bearer explicit-token" },
    });
    expect(new Headers(vi.mocked(fetch).mock.calls[0][1]?.headers).get("Authorization"))
      .toBe("Bearer explicit-token");
  });

  it("replaces the expired token on retry without duplicating the authorization header", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(new Response("{}", { status: 401 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ accessToken: "refreshed-token" })))
      .mockResolvedValueOnce(new Response("[]"));
    vi.mocked(localStorage.getItem)
      .mockReturnValueOnce("user-token")
      .mockReturnValue("refreshed-token");
    await kiwiAppsApiClient.kiwiAppControllerListApps();
    const init = vi.mocked(fetch).mock.calls[2][1];
    expect(new Headers(init?.headers).get("Authorization")).toBe("Bearer refreshed-token");
    expect(init?.credentials).toBe("include");
  });

  it("does not attach the user token or cookies to the separate app bridge client", async () => {
    await bridgeKiwiAppsApiClient.kiwiAppControllerListApps({}, {
      headers: { Authorization: "Bearer app-token" },
    });
    const init = vi.mocked(fetch).mock.calls[0][1];
    expect(new Headers(init?.headers).get("Authorization")).toBe("Bearer app-token");
    expect(init?.credentials).toBeUndefined();
  });
});
