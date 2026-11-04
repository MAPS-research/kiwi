import { returnFocusToComposer } from "./composerFocus.ts";

const mount = () => {
  document.body.innerHTML = `
    <main><button id="page-button">Run code</button></main>
    <aside><button id="chat-button">Copy code</button><form><textarea aria-label="Composer"></textarea></form></aside>`;
  return {
    form: document.querySelector("form")!,
    composer: document.querySelector("textarea")!,
    pageButton: document.getElementById("page-button")!,
    chatButton: document.getElementById("chat-button")!,
  };
};

describe("returnFocusToComposer", () => {
  it("gives the composer focus when focus is inside the chat", () => {
    const { form, composer, chatButton } = mount();
    chatButton.focus();

    returnFocusToComposer(form);

    expect(composer).toHaveFocus();
  });

  it("gives the composer focus when nothing has focus", () => {
    const { form, composer } = mount();
    (document.activeElement as HTMLElement | null)?.blur();

    returnFocusToComposer(form);

    expect(composer).toHaveFocus();
  });

  it("leaves focus on the page when the student has moved there", () => {
    const { form, pageButton } = mount();
    pageButton.focus();

    returnFocusToComposer(form);

    expect(pageButton).toHaveFocus();
  });
});
