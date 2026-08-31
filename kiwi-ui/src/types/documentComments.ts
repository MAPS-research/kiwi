import { HighlightArea } from "@react-pdf-viewer/highlight";

export interface CommentPinPosition {
  left: number;
  top: number;
}

export interface DocumentCommentPin {
  id: string;
  text: string;
  selectionRegion: HighlightArea;
  pinPosition?: CommentPinPosition | null;
  isVisibleToStudents: boolean;
}

export interface CreateDocumentCommentDto {
  text: string;
  selectionRegion: HighlightArea;
  pinPosition?: CommentPinPosition | null;
  isVisibleToStudents: boolean;
}

export type UpdateDocumentCommentDto = Partial<CreateDocumentCommentDto>;
