import { buildChatContext } from "./chatContext.ts";

describe("buildChatContext", () => {
  it("defaults activeTab to chat and omits absent surfaces", () => {
    const context = buildChatContext({});
    expect(context.environment).toEqual({ activeTab: "chat" });
    expect(context.pdf).toBeUndefined();
    expect(context.app).toBeUndefined();
    expect(context.experiment).toBeUndefined();
  });

  it("sends pdf context with a 1-based page number", () => {
    const context = buildChatContext({
      classId: "class-1",
      pdfId: "pdf-1",
      pdfPage: 3,
      pdfMaterialType: "lecture",
      activeTab: "materials",
    });
    expect(context.pdf).toEqual({
      classId: "class-1",
      pdfId: "pdf-1",
      pageNumber: 4,
      materialType: "lecture",
    });
  });

  it("keeps pdf context when materialType is unset", () => {
    const context = buildChatContext({ classId: "c", pdfId: "p" });
    expect(context.pdf).toMatchObject({ pdfId: "p", materialType: "" });
  });

  it("drops pdf context on the app tab and in the code view", () => {
    const base = { classId: "c", pdfId: "p" };
    expect(buildChatContext({ ...base, activeTab: "app" }).pdf).toBeUndefined();
    expect(
      buildChatContext({ ...base, activeTab: "materials", activeView: "code" })
        .pdf,
    ).toBeUndefined();
  });

  it("sends app context whenever a tutoring mode is requested, even off the app tab", () => {
    const context = buildChatContext({
      classId: "c",
      activeTab: "materials",
      appTutoringMode: "guidance",
    });
    expect(context.app).toEqual({ classId: "c", tutoringMode: "guidance" });
  });

  it("passes an experiment preview straight through", () => {
    const experiment = { experimentId: "exp-1", variantKey: "treatment" };
    expect(buildChatContext({ experiment }).experiment).toEqual(experiment);
  });
});
