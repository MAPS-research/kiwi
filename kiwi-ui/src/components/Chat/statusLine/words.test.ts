import { STREAM_LABEL, WAIT_VERBS, stepLabelFor, waitVerbFor } from "./words.ts";

describe("status line words", () => {
  it("starts every chat at the first verb and goes round the five in order", () => {
    expect(waitVerbFor(1)).toBe("Foraging…");
    expect(waitVerbFor(2)).toBe("Poking around…");
    expect(waitVerbFor(5)).toBe("Sniffing it out…");
    expect(waitVerbFor(6)).toBe("Foraging…");
    expect(WAIT_VERBS).toHaveLength(5);
  });

  it("keeps a reading step's object in its playful form", () => {
    expect(stepLabelFor("Checking the page list")).toBe("Peeking at the page list…");
    expect(stepLabelFor("Looking up your classes")).toBe("Sniffing out your classes…");
    expect(stepLabelFor("Reading class analytics")).toBe("Peering at class analytics…");
    expect(stepLabelFor("Reading this page")).toBe("Peering at this page…");
  });

  it("pecks through class materials for the materials search, under its new or its kept chain label", () => {
    expect(stepLabelFor("Searching your class materials")).toBe("Pecking through class materials…");
    expect(stepLabelFor("Searching materials")).toBe("Pecking through class materials…");
  });

  it("leaves acting and tool steps plain, with one ellipsis", () => {
    expect(stepLabelFor("Opening a page for you")).toBe("Opening a page for you…");
    expect(stepLabelFor("Running code")).toBe("Running code…");
    expect(stepLabelFor("Working…")).toBe("Working…");
  });

  it("jots the answer down while it streams", () => {
    expect(STREAM_LABEL).toBe("Jotting it down…");
  });
});
