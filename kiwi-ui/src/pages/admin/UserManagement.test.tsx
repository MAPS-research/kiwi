import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { isSsoDomainEmail } from "./UserManagement.tsx";

beforeEach(() => {
  vi.stubEnv("VITE_SSO_EMAIL_DOMAIN", "example.edu");
});
afterEach(() => {
  vi.unstubAllEnvs();
});

/**
 * Regression tests for issue #174: SSO-domain users must render as OAuth users (not
 * password users). The merged user/whitelist directory uses `isSsoDomainEmail` for
 * pending signups, so this helper determines whether password controls appear.
 */
describe("isSsoDomainEmail (UserManagement oauth flag, issue #174)", () => {
  it("treats SSO-domain emails as OAuth accounts", () => {
    expect(isSsoDomainEmail("someone@example.edu")).toBe(true);
  });

  it("is case-insensitive on the domain", () => {
    expect(isSsoDomainEmail("Someone@EXAMPLE.EDU")).toBe(true);
    expect(isSsoDomainEmail("student@Example.Edu")).toBe(true);
  });

  it("treats non-SSO emails as password users", () => {
    expect(isSsoDomainEmail("person@gmail.com")).toBe(false);
    expect(isSsoDomainEmail("person@other.edu")).toBe(false);
  });

  it("does not match look-alike or embedded domains", () => {
    // the domain must be the suffix, not appear mid-string or as a subdomain.
    expect(isSsoDomainEmail("person@example.edu.evil.com")).toBe(false);
    expect(isSsoDomainEmail("example.edu@gmail.com")).toBe(false);
    expect(isSsoDomainEmail("person@notexample.edu")).toBe(false);
  });

  it("mirrors the value the add flows assign to the optimistic row's `oauth`", () => {
    // Same expression used when a whitelist entry is merged into the directory.
    const rowOauth = (email: string) => isSsoDomainEmail(email);
    expect(rowOauth("newstudent@example.edu")).toBe(true); // -> renders "OAuth User"
    expect(rowOauth("newstudent@gmail.com")).toBe(false); // -> renders "Reset Password"
  });
});
