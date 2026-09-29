import {
  DeleteOutline as DeleteIcon,
  ExpandMoreOutlined as ExpandIcon,
  WarningAmberOutlined as WarningIcon,
} from "@mui/icons-material";
import {
  Box,
  Chip,
  Collapse,
  IconButton,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import * as React from "react";
import type { StaffDocument, StaffMaterial } from "../../services/index.ts";
import { MaterialSlot } from "./MaterialSlots.tsx";
import type { DocumentRoleValue } from "./materialsStaging.ts";
import {
  documentsWithRole,
  ISSUE_LABELS,
  materialIssues,
  needsAttention,
} from "./materialsListing.ts";

const dateLabel = (value: Date | string) =>
  new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });

/**
 * A material's state, compressed into the collapsed row.
 *
 * This is what makes collapsing worth doing. If the row said only a title, then
 * "which recitation still needs its answers" would mean opening every one of
 * them — the scrolling problem moved rather than solved. Slots that are filled
 * stay quiet; the ones that are missing speak up.
 */
const SummaryChips: React.FC<{ material: StaffMaterial }> = ({ material }) => {
  const issues = materialIssues(material);
  const references = documentsWithRole(material, "REFERENCE").length;

  return (
    <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap" useFlexGap>
      {issues
        .filter((issue) => issue !== "processing")
        .map((issue) => (
          <Chip
            key={issue}
            size="small"
            color="error"
            variant="outlined"
            label={ISSUE_LABELS[issue]}
            // The only styling kept from the heavier pass: at 12px regular
            // these read as hairlines.
            sx={{ fontWeight: 600 }}
          />
        ))}
      {issues.includes("processing") && (
        <Chip
          size="small"
          color="info"
          variant="outlined"
          label="processing"
          sx={{ fontWeight: 600 }}
        />
      )}
      {references > 0 && (
        <Chip
          size="small"
          variant="outlined"
          label={`${references} reference${references > 1 ? "s" : ""}`}
          sx={{ fontWeight: 600 }}
        />
      )}
    </Stack>
  );
};

export interface MaterialRowProps {
  material: StaffMaterial;
  expanded: boolean;
  onToggle: (materialId: string) => void;
  busyDocumentId: string | null;
  classID: string;
  onAdd: (material: StaffMaterial, role: DocumentRoleValue) => void;
  onReplace: (document: StaffDocument) => void;
  onReprocess: (document: StaffDocument) => void;
  onDeleteDocument: (document: StaffDocument) => void;
  onDeleteMaterial: (material: StaffMaterial) => void;
  onSaveField: (
    material: StaffMaterial,
    patch: { title?: string; availableDate?: Date },
  ) => void;
}

export const MaterialRow: React.FC<MaterialRowProps> = ({
  material,
  expanded,
  onToggle,
  busyDocumentId,
  classID,
  onAdd,
  onReplace,
  onReprocess,
  onDeleteDocument,
  onDeleteMaterial,
  onSaveField,
}) => {
  const isRecitation = material.materialType === "recitation";
  const attention = needsAttention(material);

  const slotProps = {
    material,
    busyDocumentId,
    classID,
    onAdd,
    onReplace,
    onReprocess,
    onDelete: onDeleteDocument,
  };

  return (
    <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
      <Stack
        direction="row"
        spacing={1.5}
        alignItems="center"
        onClick={() => onToggle(material.id)}
        sx={{
          px: 1.5,
          py: 1.25,
          cursor: "pointer",
          "&:hover": { bgcolor: "action.hover" },
        }}
      >
        <ExpandIcon
          fontSize="small"
          sx={{
            color: "text.secondary",
            transform: expanded ? "rotate(0deg)" : "rotate(-90deg)",
            transition: "transform 120ms",
            flexShrink: 0,
          }}
        />

        {attention ? (
          <Tooltip title="Needs attention">
            <WarningIcon fontSize="small" color="warning" />
          </Tooltip>
        ) : (
          <Box sx={{ width: 20, flexShrink: 0 }} />
        )}

        <Typography variant="body2" sx={{ flex: 1, minWidth: 0 }} noWrap>
          {material.title}
        </Typography>

        <SummaryChips material={material} />

        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ width: 64, textAlign: "right", flexShrink: 0 }}
        >
          {dateLabel(material.availableDate)}
        </Typography>
      </Stack>

      <Collapse in={expanded} unmountOnExit>
        <Box sx={{ px: 1.5, pb: 2 }}>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={2}
            alignItems={{ sm: "center" }}
            sx={{ mb: 1 }}
          >
            <TextField
              size="small"
              label="Title"
              defaultValue={material.title}
              onBlur={(event) => {
                const title = event.target.value.trim();
                if (title !== material.title) onSaveField(material, { title });
              }}
              sx={{ flex: 1, minWidth: 220 }}
            />
            <TextField
              size="small"
              type="date"
              label="Available from"
              defaultValue={new Date(material.availableDate)
                .toISOString()
                .slice(0, 10)}
              InputLabelProps={{ shrink: true }}
              onBlur={(event) =>
                onSaveField(material, {
                  availableDate: new Date(event.target.value),
                })
              }
            />
            <Tooltip title="Delete material">
              <IconButton onClick={() => onDeleteMaterial(material)}>
                <DeleteIcon />
              </IconButton>
            </Tooltip>
          </Stack>

          <MaterialSlot
            role="STUDENT"
            documents={documentsWithRole(material, "STUDENT")}
            {...slotProps}
          />
          {/* Lectures have no answer key, so the slot is not offered at all. */}
          {isRecitation && (
            <MaterialSlot
              role="ANSWER"
              documents={documentsWithRole(material, "ANSWER")}
              {...slotProps}
            />
          )}
          <MaterialSlot
            role="REFERENCE"
            documents={documentsWithRole(material, "REFERENCE")}
            {...slotProps}
          />
        </Box>
      </Collapse>
    </Box>
  );
};
