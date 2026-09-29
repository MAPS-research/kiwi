import html2canvas from "html2canvas";
import React, { CSSProperties, useRef, useState } from "react";

interface BoxCoordinates {
  left: number;
  top: number;
  width: number;
  height: number;
}

interface SelectionType {
  image: string;
  selectionRegion: BoxCoordinates;
  clickPosition?: { left: number; top: number }; // Percentage-based click position relative to container
}

interface ClickToSelectProps {
  children: React.ReactNode;
  onAddChunk: (selection: SelectionType) => void;
  onAddComment: (selection: SelectionType) => void;
}

enum Selection {
  None = "None",
  Clicked = "Clicked",
  Dragging = "Dragging",
  Selected = "Selected",
}

const clamp = (val: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, val));

const ClickToSelect: React.FC<ClickToSelectProps> = ({
  children,
  onAddChunk,
  onAddComment,
}) => {
  const [selection, setSelection] = useState(Selection.None);
  const [isSelecting, setIsSelecting] = useState(false);
  const [showButton, setShowButton] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [{ dx, dy }, setOffset] = useState({
    dx: 0,
    dy: 0,
  });
  const [{ startX, startY }, setStartPosition] = useState({
    startX: 0,
    startY: 0,
  });
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });

  const onMouseDown = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target?.closest('[data-selection-ignore="true"]')) {
      return;
    }

    const eleRect = containerRef.current?.getBoundingClientRect();
    if (!eleRect) return;
    const startRelativePos = {
      startX: e.clientX - eleRect.left,
      startY: e.clientY - eleRect.top,
    };
    setOffset({ dx: 0, dy: 0 });
    setStartPosition(startRelativePos);
    setStartPos({ x: e.clientX, y: e.clientY });
    setSelection(Selection.Clicked);
    setIsSelecting(true);
    setShowButton(false);
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (!isSelecting) return;
    const eleRect = containerRef.current?.getBoundingClientRect();
    if (!eleRect) return;
    let dx = e.clientX - startPos.x;
    let dy = e.clientY - startPos.y;
    const maxX = eleRect.width - startX;
    const maxY = eleRect.height - startY;
    dx = clamp(dx, 0, maxX);
    dy = clamp(dy, 0, maxY);

    setOffset({ dx, dy });
    setSelection(Selection.Dragging);
  };

  const onMouseUp = () => {
    if (!isSelecting) return;
    setIsSelecting(false);
    setSelection(Selection.Selected);
    setShowButton(dx > 2 && dy > 2);
  };

  const captureSelection = (
    callback: (selection: SelectionType) => void,
    includeClickPosition: boolean = false
  ) => {
    if (!containerRef.current) return;

    const eleRect = containerRef.current.getBoundingClientRect();

    // For comments, use the container coordinates (which wraps the PDF page layers)
    // The renderHighlights container is positioned relative to the same container
    const pageRect = eleRect;

    html2canvas(containerRef.current, {
      x: startX,
      y: startY,
      width: dx,
      height: dy,
    }).then((canvas) => {
      const base64Image = canvas.toDataURL();

      const selection: SelectionType = {
        image: base64Image,
        selectionRegion: {
          left: ((startPos.x - eleRect.left) * 100) / eleRect.width,
          top: ((startPos.y - eleRect.top) * 100) / eleRect.height,
          width: (dx * 100) / eleRect.width,
          height: (dy * 100) / eleRect.height,
        },
      };

      // For comments, include the click position relative to the container
      // This matches the coordinate system used by renderHighlights
      if (includeClickPosition) {
        // Calculate click position relative to the container (same as selectionRegion)
        const clickX = startPos.x - eleRect.left;
        const clickY = startPos.y - eleRect.top;
        const clickPosition = {
          left: (clickX * 100) / eleRect.width,
          top: (clickY * 100) / eleRect.height,
        };
        console.log('ClickToSelect - Calculating click position:', {
          startPos: { x: startPos.x, y: startPos.y },
          eleRect: { left: eleRect.left, top: eleRect.top, width: eleRect.width, height: eleRect.height },
          clickX,
          clickY,
          clickPosition,
        });
        selection.clickPosition = clickPosition;
      }

      callback(selection);
      setShowButton(false);
      setSelection(Selection.None);
    });
  };

  const handleAddChunk = (e: React.MouseEvent) => {
    e.stopPropagation();
    captureSelection(onAddChunk, false);
  };

  const handleAddComment = (e: React.MouseEvent) => {
    e.stopPropagation();
    captureSelection(onAddComment, true);
  };

  const selectionBoxStyle: CSSProperties = {
    position: "absolute",
    top: 0,
    left: 0,
    transform: `translate(${startX}px, ${startY}px)`,
    width: `${dx}px`,
    height: `${dy}px`,
    border: "2px dashed rgb(203 213 225)",
    pointerEvents: "none",
  };

  const selectionContainerStyle: CSSProperties = {
    position: "relative",
    width: "100%",
    height: "auto",
    cursor: isSelecting ? "crosshair" : "auto",
  };

  return (
    <div
      ref={containerRef}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      style={selectionContainerStyle}
    >
      {children}
      {(isSelecting || selection === Selection.Selected) && (
        <div style={selectionBoxStyle}></div>
      )}
      {showButton && (
        <div
          data-selection-ignore="true"
          style={{
            position: "absolute",
            left: `${startX}px`,
            top: `${startY + dy}px`,
            zIndex: 2,
            display: "flex",
            gap: "8px",
            backgroundColor: "rgba(255,255,255,0.95)",
            border: "1px solid #cbd5e1",
            borderRadius: 6,
            padding: "6px 8px",
            boxShadow: "0 4px 12px rgba(15,23,42,0.18)",
          }}
        >
          <button onClick={handleAddChunk}>Add Chunk</button>
          <button onClick={handleAddComment}>Add Comments</button>
        </div>
      )}
    </div>
  );
};

export default ClickToSelect;
