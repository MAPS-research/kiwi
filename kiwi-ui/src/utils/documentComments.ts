import { HighlightArea } from "../components/PDFViewer/pdfTypes.ts";
import {
  CommentPinPosition,
  DocumentCommentPin,
} from "../types/documentComments.ts";

type ServerDocumentComment = Partial<DocumentCommentPin> &
  Record<string, unknown> & {
    id?: string | number;
    commentId?: string | number;
    selection_region?: HighlightArea;
    region?: HighlightArea;
    pageIndex?: number | string;
    page_number?: number | string;
    pageNumber?: number | string;
    page?: number | string;
    pin_position?: CommentPinPosition;
    position?: CommentPinPosition;
    left?: number | string;
    top?: number | string;
    width?: number | string;
    height?: number | string;
  };

const toOptionalNumber = (value: unknown): number | null => {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const toNumberOrZero = (value: unknown) => toOptionalNumber(value) ?? 0;

const normalizeHighlightArea = (
  value: any,
  fallbackPageIndex: number
): HighlightArea | null => {
  if (!value) {
    return null;
  }

  const left = toOptionalNumber(value.left);
  const top = toOptionalNumber(value.top);
  const width = toOptionalNumber(value.width);
  const height = toOptionalNumber(value.height);

  if (
    left == null ||
    top == null ||
    width == null ||
    height == null
  ) {
    return null;
  }

  const candidatePageIndex =
    value.pageIndex ??
    value.page_index ??
    value.page_number ??
    value.pageNumber ??
    value.page;

  return {
    left,
    top,
    width,
    height,
    pageIndex: toNumberOrZero(candidatePageIndex ?? fallbackPageIndex),
  };
};

const deriveSelectionRegion = (
  comment: ServerDocumentComment
): HighlightArea => {
  const candidate =
    (comment.selectionRegion as HighlightArea | undefined) ??
    comment.region ??
    comment.selection_region ??
    null;

  const pageSource =
    comment.pageIndex ??
    comment.page_number ??
    comment.pageNumber ??
    comment.page ??
    0;

  const normalizedFromCandidate = normalizeHighlightArea(
    candidate,
    toNumberOrZero(pageSource)
  );

  if (normalizedFromCandidate) {
    return normalizedFromCandidate;
  }

  const fromLegacyFields = normalizeHighlightArea(
    {
      left: comment.left,
      top: comment.top,
      width: comment.width,
      height: comment.height,
      pageIndex: pageSource,
    },
    toNumberOrZero(pageSource)
  );

  return (
    fromLegacyFields ?? {
      left: 0,
      top: 0,
      width: 0,
      height: 0,
      pageIndex: toNumberOrZero(pageSource),
    }
  );
};

const derivePinPosition = (
  comment: ServerDocumentComment,
  region: HighlightArea
): CommentPinPosition => {
  const candidate =
    (comment.pinPosition as CommentPinPosition | undefined) ??
    comment.pin_position ??
    comment.position ??
    null;

  if (candidate) {
    const left = toOptionalNumber(candidate.left);
    const top = toOptionalNumber(candidate.top);

    if (left != null && top != null) {
      return { left, top };
    }
  }

  return getDefaultPinPosition(region);
};

const toBoolean = (value: unknown) => {
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") {
      return true;
    }
    if (normalized === "false") {
      return false;
    }
  }
  if (typeof value === "number") {
    return value === 1;
  }
  return Boolean(value);
};

export const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

export const getDefaultPinPosition = (
  region: HighlightArea
): CommentPinPosition => ({
  // Position slightly to the right of the selection to avoid covering content
  left: Math.min(region.left + region.width + 1.5, 95), // Don't go past 95% to avoid cutoff
  top: Math.max(region.top, 2), // Keep at least 2% from top
});

export const mapServerCommentToPin = (
  comment: ServerDocumentComment
): DocumentCommentPin => {
  const selectionRegion = deriveSelectionRegion(comment);
  const fallbackId = `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
  return {
    id: String(comment.id ?? comment.commentId ?? fallbackId),
    text: (comment.text as string) ?? "",
    isVisibleToStudents: toBoolean(comment.isVisibleToStudents),
    selectionRegion,
    pinPosition: derivePinPosition(comment, selectionRegion),
  };
};
