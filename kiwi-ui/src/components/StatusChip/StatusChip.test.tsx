import { render, screen } from "@testing-library/react";
import StatusChip, { type StatusKind } from "./StatusChip.tsx";

describe("StatusChip", () => {
  it.each<StatusKind>(["success", "warning", "error", "info", "neutral"])(
    "carries a shape icon beside its %s label, never colour alone",
    (kind) => {
      const { container } = render(<StatusChip kind={kind} label="Active" />);

      expect(screen.getByText("Active")).toBeInTheDocument();
      expect(container.querySelector(".MuiChip-icon")).toBeInTheDocument();
    }
  );
});
