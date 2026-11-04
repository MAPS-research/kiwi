import {
  CreateOutlined as AnnotateIcon,
  DeleteOutlined as DeleteIcon,
  ErrorOutlineOutlined as ErrorIcon,
  SwapHorizOutlined as ReplaceIcon,
  SyncOutlined as ReprocessIcon,
  UploadFileOutlined as UploadIcon,
} from "@mui/icons-material";
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import * as React from "react";
import type { StaffDocument, StaffMaterial } from "../../services/index.ts";
import { ROLE_HINTS, type DocumentRoleValue } from "./materialsStaging.ts";

const STATUS_COLORS: Record<
  string,
  "default" | "info" | "success" | "error"
> = {
  PENDING: "default",
  PROCESSING: "info",
  READY: "success",
  FAILED: "error",
};

export const ProcessingChip: React.FC<{ document: StaffDocument }> = ({
  document,
}) => {
  const label =
    document.processingStatus === "PROCESSING" && document.processingStage
      ? document.processingStage
      : document.processingStatus.toLowerCase();

  const chip = (
    <Chip
      size="small"
      label={label}
      color={STATUS_COLORS[document.processingStatus] ?? "default"}
      variant={document.processingStatus === "READY" ? "filled" : "outlined"}
      icon={
        document.processingStatus === "PROCESSING" ? (
          <CircularProgress size={12} sx={{ ml: 1 }} />
        ) : document.processingStatus === "FAILED" ? (
          <ErrorIcon />
        ) : undefined
      }
    />
  );

  return document.processingError ? (
    <Tooltip title={document.processingError}>{chip}</Tooltip>
  ) : (
    chip
  );
};

export interface SlotProps {
  role: DocumentRoleValue;
  material: StaffMaterial;
  documents: StaffDocument[];
  busyDocumentId: string | null;
  classID: string;
  onAdd: (material: StaffMaterial, role: DocumentRoleValue) => void;
  onReplace: (document: StaffDocument) => void;
  onReprocess: (document: StaffDocument) => void;
  onDelete: (document: StaffDocument) => void;
}

/**
 * One role's worth of a material, filled or empty.
 *
 * The empty state is the point: "no answer key yet, add one" is a standing,
 * actionable fact on the material, not something the instructor had to get
 * right during an upload that happened days earlier — worksheets go up before
 * class and answers after it.
 */
export const MaterialSlot: React.FC<SlotProps> = ({
  role,
  material,
  documents,
  busyDocumentId,
  classID,
  onAdd,
  onReplace,
  onReprocess,
  onDelete,
}) => {
  const label =
    role === "STUDENT"
      ? "Student copy"
      : role === "ANSWER"
        ? "Answer key"
        : "Reference";

  const emptyCopy =
    role === "STUDENT"
      ? "Not uploaded — students cannot see this material at all."
      : role === "ANSWER"
        ? "Not uploaded — the tutor only has the questions."
        : null;

  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: "1fr", md: "150px minmax(0, 1fr) auto" },
        alignItems: "center",
        gap: 1.5,
        py: 1,
        borderTop: 1,
        borderColor: "divider",
      }}
    >
      <Tooltip title={ROLE_HINTS[role]} placement="left">
        <Typography variant="body2" sx={{
          color: "text.secondary"
        }}>
          {label}
        </Typography>
      </Tooltip>

      {documents.length === 0 ? (
        <>
          <Typography
            variant="body2"
            // A recitation with no answer key is the state this whole redesign
            // exists to make visible: the tutor is answering from the questions.
            color={
              role === "REFERENCE" ? "text.secondary" : "var(--status-error-text)"
            }
          >
            {emptyCopy ?? "None"}
          </Typography>
          <Button
            size="small"
            startIcon={<UploadIcon />}
            onClick={() => onAdd(material, role)}
          >
            {role === "REFERENCE" ? "Add reference" : `Upload ${label.toLowerCase()}`}
          </Button>
        </>
      ) : (
        <>
          <Stack spacing={0.5} sx={{ minWidth: 0 }}>
            {documents.map((document) => (
              <Stack
                key={document.id}
                direction="row"
                spacing={1}
                sx={{
                  alignItems: "center",
                  minWidth: 0
                }}>
                <Typography variant="body2" noWrap sx={{ flex: 1 }}>
                  {document.fileName}
                </Typography>
                <ProcessingChip document={document} />
                <Stack direction="row" spacing={0.25}>
                  <Tooltip title="Annotate">
                    <IconButton
                      size="small"
                      href={`/admin/class/${classID}/${material.id}/${document.id}/annotation`}
                      target="_blank"
                    >
                      <AnnotateIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Replace this file, keeping its annotations">
                    <IconButton
                      size="small"
                      disabled={busyDocumentId === document.id}
                      onClick={() => onReplace(document)}
                    >
                      <ReplaceIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Run the pipeline again">
                    <IconButton
                      size="small"
                      disabled={busyDocumentId === document.id}
                      onClick={() => onReprocess(document)}
                    >
                      <ReprocessIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete file">
                    <IconButton size="small" onClick={() => onDelete(document)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Stack>
              </Stack>
            ))}
          </Stack>
          {role === "REFERENCE" ? (
            <Button
              size="small"
              startIcon={<UploadIcon />}
              onClick={() => onAdd(material, role)}
            >
              Add another
            </Button>
          ) : (
            <Box />
          )}
        </>
      )}
    </Box>
  );
};
