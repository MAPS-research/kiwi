import { useState, type ReactElement } from "react";
import { Tooltip } from "@mui/material";
import { densityAttr } from "./regionDensity.ts";

export interface DisabledReasonProps {
  /** Why the control is unavailable right now; null or empty while it is available. */
  reason?: string | null;
  /** The control. It stays focusable (`aria-disabled`, never `disabled`) and ignores activation itself. */
  children: ReactElement;
}

/**
 * The stated reason of a disabled control (DESIGN.md, Components > Disabled): a
 * toggletip on the control itself that opens on hover, focus and tap and is
 * linked as the control's description. The tooltip stays mounted while the
 * control is available, so the control never remounts and keeps its focus when
 * its state changes.
 */
const DisabledReason = ({ reason, children }: DisabledReasonProps) => {
  const [portalAttr, setPortalAttr] = useState<Record<string, string>>({});
  const active = Boolean(reason);

  return (
    <Tooltip
      title={reason ?? ""}
      describeChild
      placement="bottom-start"
      disableHoverListener={!active}
      disableFocusListener={!active}
      disableTouchListener={!active}
      enterTouchDelay={0}
      leaveTouchDelay={2500}
      // The open may run after a delay, when the event no longer has a currentTarget.
      onOpen={(event) => setPortalAttr(densityAttr(event.target as Element))}
      slotProps={{ popper: { ...portalAttr } }}
    >
      {children}
    </Tooltip>
  );
};

export default DisabledReason;
