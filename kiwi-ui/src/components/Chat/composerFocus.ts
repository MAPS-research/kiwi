/**
 * After an answer completes the composer takes focus again (kiwi-ui/DESIGN.md,
 * the tutor-message surface: success), so the student can type the next
 * question at once. It does not pull focus back from the page: only when focus
 * is still inside the chat (or nowhere) does it move.
 */
export function returnFocusToComposer(form: HTMLFormElement | null): void {
  const composer = form?.querySelector<HTMLTextAreaElement>("textarea");
  if (!form || !composer) return;
  const chat = form.closest("aside") ?? form.parentElement;
  const active = document.activeElement;
  if (!active || active === document.body || chat?.contains(active)) composer.focus();
}
