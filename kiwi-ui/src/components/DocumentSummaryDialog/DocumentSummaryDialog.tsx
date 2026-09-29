import ExpandMoreIcon from "@mui/icons-material/ExpandMoreOutlined";
import AddIcon from "@mui/icons-material/AddOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import SaveIcon from "@mui/icons-material/SaveOutlined";
import CloseIcon from "@mui/icons-material/CloseOutlined";
import VisibilityIcon from "@mui/icons-material/VisibilityOutlined";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOffOutlined";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  IconButton,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import React, { useEffect, useMemo, useState } from "react";

export interface DocumentSummaryItem {
  id: string;
  documentId: string;
  summaryNumber: number;
  content: string;
  isVisibleToStudents: boolean;
  authorId: string;
  author: {
    id: string;
    name?: string;
    email?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

interface DocumentSummaryDialogProps {
  open: boolean;
  documentId: string;
  documentName: string;
  summaries: DocumentSummaryItem[];
  onClose: () => void;
  onCreate: (summary: { content: string; isVisibleToStudents: boolean }) => Promise<void>;
  onDelete: (summaryId: string) => Promise<void>;
  onUpdate: (summaryId: string, content: string, isVisibleToStudents: boolean) => Promise<void>;
  onRefresh: () => Promise<void>;
}

const formatPreviewText = (value: string): string => {
  if (!value) return "No summary content provided";
  return value.length > 60 ? `${value.slice(0, 60)}…` : value;
};

export const DocumentSummaryDialog: React.FC<DocumentSummaryDialogProps> = ({
  open,
  documentName,
  summaries,
  onClose,
  onCreate,
  onDelete,
  onUpdate,
}) => {
  const [isAddMode, setIsAddMode] = useState(false);
  const [newSummaryText, setNewSummaryText] = useState("");
  const [newSummaryVisible, setNewSummaryVisible] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState("");
  const [editingVisible, setEditingVisible] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!open) {
      setIsAddMode(false);
      setNewSummaryText("");
      setNewSummaryVisible(true);
      setEditingId(null);
      setEditingContent("");
      setEditingVisible(true);
    }
  }, [open]);

  const sortedSummaries = useMemo(
    () => [...summaries].sort((a, b) => a.summaryNumber - b.summaryNumber),
    [summaries]
  );

  const startAdd = () => {
    setIsAddMode(true);
    setNewSummaryText("");
    setNewSummaryVisible(true);
  };

  const cancelAdd = () => {
    setIsAddMode(false);
    setNewSummaryText("");
    setNewSummaryVisible(true);
  };

  const handleSaveNew = async () => {
    if (!newSummaryText.trim() || isSaving) return;
    setIsSaving(true);
    try {
      await onCreate({
        content: newSummaryText.trim(),
        isVisibleToStudents: newSummaryVisible,
      });
      setIsAddMode(false);
      setNewSummaryText("");
      setNewSummaryVisible(true);
    } catch (error) {
      console.error("Failed to create summary:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const beginEdit = (summary: DocumentSummaryItem) => {
    setEditingId(summary.id);
    setEditingContent(summary.content);
    setEditingVisible(summary.isVisibleToStudents);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingContent("");
    setEditingVisible(true);
  };

  const handleSaveEdit = async () => {
    if (!editingId || isSaving) return;
    const content = editingContent.trim();
    if (!content) return;

    setIsSaving(true);
    try {
      await onUpdate(editingId, content, editingVisible);
      setEditingId(null);
      setEditingContent("");
      setEditingVisible(true);
    } catch (error) {
      console.error("Failed to update summary:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (summaryId: string) => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      await onDelete(summaryId);
    } catch (error) {
      console.error("Failed to delete summary:", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="md"
      slotProps={{
        paper: {
          sx: { borderRadius: 4, overflow: "hidden" },
        }
      }}
    >
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <Typography variant="h6" component="span">
          Document Summaries
        </Typography>
        <Typography variant="body2" component="span" sx={{
          color: "text.secondary"
        }}>
          {documentName}
        </Typography>
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={3}>
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Added Summaries ({sortedSummaries.length})
            </Typography>
            {sortedSummaries.length === 0 ? (
              <Box
                sx={{
                  border: "1px dashed",
                  borderColor: "divider",
                  borderRadius: 2,
                  p: 3,
                  textAlign: "center",
                }}
              >
                <Typography variant="body2" sx={{
                  color: "text.secondary"
                }}>
                  No summaries for this document yet. Click the plus icon to create one.
                </Typography>
              </Box>
            ) : (
              <Stack spacing={1.5}>
                {sortedSummaries.map((summary) => {
                  const isEditing = editingId === summary.id;
                  return (
                    <Accordion key={summary.id} disableGutters elevation={0}>
                      <AccordionSummary
                        expandIcon={<ExpandMoreIcon />}
                        sx={{
                          "& .MuiAccordionSummary-content": {
                            alignItems: "center",
                            gap: 1,
                          },
                        }}
                      >
                        <Typography variant="body1" sx={{ flex: 1 }}>
                          {formatPreviewText(summary.content)}
                        </Typography>
                        <Chip
                          size="small"
                          icon={summary.isVisibleToStudents ? <VisibilityIcon fontSize="inherit" /> : <VisibilityOffIcon fontSize="inherit" />}
                          label={summary.isVisibleToStudents ? "Visible to students" : "Hidden from students"}
                          color={summary.isVisibleToStudents ? "success" : "default"}
                          variant="outlined"
                        />
                        <Box sx={{ display: "flex", alignItems: "center", ml: 2 }}>
                          <IconButton
                            edge="end"
                            size="small"
                            aria-label="edit"
                            disabled={isSaving}
                            onClick={(event) => {
                              event.stopPropagation();
                              if (isEditing) {
                                cancelEdit();
                              } else {
                                beginEdit(summary);
                              }
                            }}
                          >
                            {isEditing ? <CloseIcon fontSize="small" /> : <EditOutlinedIcon fontSize="small" />}
                          </IconButton>
                          <IconButton
                            edge="end"
                            size="small"
                            aria-label="delete"
                            disabled={isSaving}
                            onClick={(event) => {
                              event.stopPropagation();
                              handleDelete(summary.id);
                            }}
                          >
                            <DeleteOutlineIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      </AccordionSummary>
                      <AccordionDetails>
                        {isEditing ? (
                          <Stack spacing={1.5}>
                            <TextField
                              value={editingContent}
                              minRows={4}
                              multiline
                              fullWidth
                              onChange={(event) => setEditingContent(event.target.value)}
                              placeholder="Update summary content"
                            />
                            <FormControlLabel
                              control={
                                <Switch
                                  checked={editingVisible}
                                  onChange={(event) => setEditingVisible(event.target.checked)}
                                />
                              }
                              label="Visible to students"
                            />
                            <Box sx={{ display: "flex", gap: 1, justifyContent: "flex-end" }}>
                              <Button
                                variant="outlined"
                                startIcon={<CloseIcon />}
                                onClick={cancelEdit}
                                disabled={isSaving}
                              >
                                Cancel
                              </Button>
                              <Button
                                variant="contained"
                                startIcon={<SaveIcon />}
                                onClick={handleSaveEdit}
                                disabled={isSaving || !editingContent.trim()}
                              >
                                {isSaving ? "Saving..." : "Save"}
                              </Button>
                            </Box>
                          </Stack>
                        ) : (
                          <Stack spacing={1.5}>
                            <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
                              {summary.content}
                            </Typography>
                            <Typography variant="caption" sx={{
                              color: "text.secondary"
                            }}>
                              Created by {summary.author.name || summary.author.email} • {new Date(summary.createdAt).toLocaleString()}
                            </Typography>
                          </Stack>
                        )}
                      </AccordionDetails>
                    </Accordion>
                  );
                })}
              </Stack>
            )}
          </Box>

          <Divider flexItem />

          <Box>
            <Stack direction="row" spacing={2} sx={{
              alignItems: "center"
            }}>
              <Typography variant="subtitle2">Add New Summary</Typography>
              {!isAddMode && (
                <IconButton
                  color="primary"
                  onClick={startAdd}
                  disabled={isSaving}
                  sx={{
                    border: "1px dashed",
                    borderColor: "primary.main",
                    borderRadius: "50%",
                  }}
                >
                  <AddIcon />
                </IconButton>
              )}
            </Stack>
            {isAddMode && (
              <Box
                sx={{
                  mt: 2,
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: 2,
                  p: 2,
                  backgroundColor: "rgba(25, 118, 210, 0.03)",
                }}
              >
                <Stack spacing={2}>
                  <TextField
                    label="Summary Content"
                    placeholder="Enter summary for this document..."
                    value={newSummaryText}
                    onChange={(event) => setNewSummaryText(event.target.value)}
                    multiline
                    minRows={4}
                    fullWidth
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={newSummaryVisible}
                        onChange={(event) => setNewSummaryVisible(event.target.checked)}
                      />
                    }
                    label="Visible to students"
                  />
                  <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1.5 }}>
                    <Button
                      variant="text"
                      startIcon={<CloseIcon />}
                      onClick={cancelAdd}
                      disabled={isSaving}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="contained"
                      startIcon={<SaveIcon />}
                      onClick={handleSaveNew}
                      disabled={!newSummaryText.trim() || isSaving}
                    >
                      {isSaving ? "Saving..." : "Save Summary"}
                    </Button>
                  </Box>
                </Stack>
              </Box>
            )}
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} disabled={isSaving}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default DocumentSummaryDialog;
