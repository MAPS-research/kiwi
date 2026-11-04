/**
 * The checkbox and radio drawings of the design system (kiwi-ui/DESIGN.md,
 * Checkboxes and radios): an 18 px box (a circle for a radio) with a 1 px
 * --border-interactive edge on the sheet; checked and indeterminate take the
 * selection tint with a --selection-text glyph. The theme passes these to MUI as
 * the Checkbox and Radio icons, and styles every state on the box through the
 * classes below, so the focus frame is the box's own edge (one frame).
 */

const BOX = "kiwi-control-box";

type Mark = "none" | "check" | "dash" | "dot";

function ControlBox({ round, mark }: { round: boolean; mark: Mark }) {
  return (
    <span
      className={`${BOX} ${BOX}--${round ? "radio" : "checkbox"} ${BOX}--${mark}`}
      aria-hidden="true"
    >
      {mark === "check" && (
        <svg viewBox="0 0 16 16" width="14" height="14" focusable="false">
          <path
            d="M3.5 8.5l3 3 6-7"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
      {mark === "dash" && (
        <svg viewBox="0 0 16 16" width="14" height="14" focusable="false">
          <path d="M4 8h8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      )}
      {mark === "dot" && <span className={`${BOX}__dot`} />}
    </span>
  );
}

export const CheckboxIcon = () => <ControlBox round={false} mark="none" />;
export const CheckboxCheckedIcon = () => <ControlBox round={false} mark="check" />;
export const CheckboxIndeterminateIcon = () => <ControlBox round={false} mark="dash" />;
export const RadioIcon = () => <ControlBox round mark="none" />;
export const RadioCheckedIcon = () => <ControlBox round mark="dot" />;

export const CONTROL_BOX_CLASS = BOX;
