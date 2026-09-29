/** Persisted PDF coordinates are percentages; pageIndex is zero based. */
export interface HighlightArea {
  pageIndex: number;
  left: number;
  top: number;
  width: number;
  height: number;
}
export interface PageChangeEvent {
  currentPage: number;
}
