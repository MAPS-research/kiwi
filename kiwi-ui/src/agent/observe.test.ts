import { describe, it, expect, beforeEach } from "vitest";
import { observe } from "./observe.ts";

/**
 * Tests for the embedded-app context surfacing added for issue #213: on an app
 * tab the DOM scan only sees host chrome (the app is a cross-origin iframe), so
 * observe() must attach the app's self-reported context + guidance instead.
 */
describe("observe() app context (issue #213)", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("does not add appContext/note when not on an app tab", async () => {
    const obs = await observe("/class-1", () => ({ isAppTab: false }));
    expect(obs.appContext).toBeUndefined();
    expect(obs.note).toBeUndefined();
  });

  it("surfaces appContext and guidance when on an app tab with context", async () => {
    const obs = await observe("/class-1/app/codegen", () => ({
      isAppTab: true,
      appContext: "Challenge: print first n even numbers. Code: def solution(): ...",
    }));
    expect(obs.appContext).toContain("print first n even numbers");
    expect(obs.note).toMatch(/appContext/);
    expect(obs.note).toMatch(/iframe/i);
  });

  it("warns (without appContext) when on an app tab but no context reported yet", async () => {
    const obs = await observe("/class-1/app/codegen", () => ({
      isAppTab: true,
      appContext: undefined,
    }));
    expect(obs.appContext).toBeUndefined();
    expect(obs.note).toMatch(/has not reported any context/);
  });

  it("returns the element list alongside app context (both coexist)", async () => {
    // jsdom gives elements zero layout, so observe()'s visibility filter may drop
    // them; the point of this case is that elements is still an array and the app
    // context is attached in the same observation.
    const obs = await observe("/class-1/app/codegen", () => ({
      isAppTab: true,
      appContext: "some challenge",
    }));
    expect(Array.isArray(obs.elements)).toBe(true);
    expect(obs.appContext).toBe("some challenge");
  });

  it("works when no context provider is passed (backwards compatible)", async () => {
    const obs = await observe("/class-1");
    expect(obs.appContext).toBeUndefined();
    expect(obs.note).toBeUndefined();
    expect(Array.isArray(obs.elements)).toBe(true);
  });
});
