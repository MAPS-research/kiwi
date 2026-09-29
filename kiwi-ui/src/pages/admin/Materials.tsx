import {
  CloudUploadOutlined as CloudUploadIcon,
  DeleteOutline as DeleteIcon,
  FolderOutlined as FolderIcon,
  PlayArrowOutlined as PlayIcon,
  SearchOutlined as SearchIcon,
  UnfoldLessOutlined as CollapseAllIcon,
} from "@mui/icons-material";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  MenuItem,
  Select,
  InputAdornment,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import * as React from "react";
import { useParams } from "react-router-dom";
import type { StaffDocument, StaffMaterial } from "../../services/index.ts";
import apiClient from "../../utils/api.ts";
import { AdminPage, AdminPageHeader } from "../../components/AdminPage/index.ts";
import { MaterialRow } from "./MaterialRow.tsx";
import {
  applyListControls,
  FILTER_LABELS,
  needsAttention,
  SORT_LABELS,
  type MaterialFilter,
  type MaterialSort,
} from "./materialsListing.ts";
import {
  attachedRole,
  DETACHED,
  isOrphanAnswerKey,
  misfiledAnswerKeyFor,
  reconcileStagedPairs,
  stageFile,
  type DocumentRoleValue,
  type MaterialTypeValue,
  type StagedFile,
} from "./materialsStaging.ts";

/** True while anything is still moving through the pipeline. */
function hasWorkInFlight(materials: StaffMaterial[]): boolean {
  return materials.some((material) =>
    material.documents.some(
      (doc) =>
        doc.processingStatus === "PENDING" ||
        doc.processingStatus === "PROCESSING",
    ),
  );
}

type PendingUpload =
  | { kind: "add"; material: StaffMaterial; role: DocumentRoleValue }
  | { kind: "replace"; document: StaffDocument };

const SectionLabel: React.FC<{ label: string; count: number }> = ({
  label,
  count,
}) => (
  <Stack
    direction="row"
    spacing={1}
    alignItems="center"
    sx={{ px: 1.5, py: 0.75, bgcolor: "action.hover" }}
  >
    <Typography variant="overline" color="text.secondary">
      {label}
    </Typography>
    <Chip size="small" label={count} />
  </Stack>
);

export const Materials: React.FC = () => {
  const { classID = "" } = useParams();

  const [materials, setMaterials] = React.useState<StaffMaterial[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [staged, setStaged] = React.useState<StagedFile[]>([]);
  const [processing, setProcessing] = React.useState(false);
  const [busyDocumentId, setBusyDocumentId] = React.useState<string | null>(null);
  const [toast, setToast] = React.useState<{
    message: string;
    severity: "success" | "error" | "info" | "warning";
  } | null>(null);
  const [confirmDelete, setConfirmDelete] = React.useState<
    | { kind: "material"; id: string; label: string }
    | { kind: "document"; id: string; label: string }
    | null
  >(null);
  const [confirmReplace, setConfirmReplace] =
    React.useState<StaffDocument | null>(null);
  const [query, setQuery] = React.useState("");
  const [filter, setFilter] = React.useState<MaterialFilter>("all");
  const [sort, setSort] = React.useState<MaterialSort>("newest");
  const [expandedIds, setExpandedIds] = React.useState<Set<string>>(new Set());

  const newFilesRef = React.useRef<HTMLInputElement>(null);
  const slotFileRef = React.useRef<HTMLInputElement>(null);
  const pendingUpload = React.useRef<PendingUpload | null>(null);

  const loadMaterials = React.useCallback(async () => {
    try {
      const response = await apiClient.materialControllerListForStaff({
        materialListRequest: { classId: classID },
      });
      setMaterials(response.materials ?? []);
    } catch (error) {
      console.error("Failed to load materials", error);
      setToast({ message: "Could not load materials.", severity: "error" });
    } finally {
      setLoading(false);
    }
  }, [classID]);

  React.useEffect(() => {
    loadMaterials();
  }, [loadMaterials]);

  // Processing lives on the server, so the page just asks again. This is also
  // what makes a reload harmless mid-pipeline: the state was never here.
  React.useEffect(() => {
    if (!hasWorkInFlight(materials)) return;
    const timer = setTimeout(loadMaterials, 4000);
    return () => clearTimeout(timer);
  }, [materials, loadMaterials]);

  const fail = (error: any, fallback: string) =>
    setToast({ message: error?.message ?? fallback, severity: "error" });

  // ---- new materials -------------------------------------------------------

  const addNewFiles = (files: FileList | null) => {
    if (!files) return;
    const accepted = Array.from(files).filter(
      (file) => file.type === "application/pdf",
    );
    setStaged((previous) =>
      reconcileStagedPairs([...previous, ...accepted.map(stageFile)]),
    );
    if (accepted.length !== files.length) {
      setToast({ message: "Only PDF files are accepted.", severity: "warning" });
    }
  };

  const updateStaged = (id: string, patch: Partial<StagedFile>) =>
    setStaged((previous) =>
      reconcileStagedPairs(
        previous.map((row) => (row.id === id ? { ...row, ...patch } : row)),
      ),
    );

  /** Open a material the instructor just acted on, so the result is visible. */
  const revealMaterial = (materialId: string) =>
    setExpandedIds((previous) => new Set(previous).add(materialId));

  /** Pull an answer key out of its worksheet, making it its own material. */
  const detachStaged = (id: string) =>
    setStaged((previous) =>
      previous.map((row) =>
        row.id === id ? { ...row, attachTo: DETACHED } : row,
      ),
    );

  const removeStaged = (id: string) =>
    setStaged((previous) =>
      reconcileStagedPairs(
        previous.filter((row) => row.id !== id && row.attachTo !== id),
      ),
    );

  const attachmentsOf = (row: StagedFile) =>
    staged.filter((other) => other.attachTo === row.id);

  const toggleExpanded = (materialId: string) =>
    setExpandedIds((previous) => {
      const next = new Set(previous);
      if (next.has(materialId)) next.delete(materialId);
      else next.add(materialId);
      return next;
    });

  const createMaterials = async () => {
    setProcessing(true);

    for (const row of staged) {
      if (row.status === "done" || row.attachTo) continue;
      const attached = staged.filter((other) => other.attachTo === row.id);

      updateStaged(row.id, { status: "uploading", error: undefined });

      try {
        const created = await apiClient.materialControllerAdd({
          materialAddRequest: {
            classId: classID,
            materialType: row.materialType as any,
            availableDate: new Date(row.availableDate),
            title: row.title.trim() || undefined,
          },
        });
        if (!created.classMaterialId) {
          throw new Error("The server did not return a material id.");
        }

        await apiClient.materialControllerUploadDocument({
          materialId: created.classMaterialId,
          file: row.file,
          role: "STUDENT" as any,
        });

        // Answer keys and extras that came in the same batch go into the
        // material that was just created, not one of their own.
        for (const extra of attached) {
          updateStaged(extra.id, { status: "uploading" });
          await apiClient.materialControllerUploadDocument({
            materialId: created.classMaterialId,
            file: extra.file,
            role: attachedRole(row.materialType) as any,
          });
          updateStaged(extra.id, { status: "done" });
        }

        revealMaterial(created.classMaterialId);
        updateStaged(row.id, { status: "done" });
      } catch (error: any) {
        updateStaged(row.id, {
          status: "error",
          error: error?.message ?? "Upload failed.",
        });
      }
    }

    setProcessing(false);
    setStaged((previous) =>
      reconcileStagedPairs(previous.filter((row) => row.status !== "done")),
    );
    await loadMaterials();
    setToast({
      message:
        "Uploaded. Processing continues on the server — you can leave this page.",
      severity: "success",
    });
  };

  /** Move a staged file into an existing material as its answer key. */
  const attachAsAnswerKey = async (row: StagedFile, material: StaffMaterial) => {
    updateStaged(row.id, { status: "uploading", error: undefined });
    try {
      await apiClient.materialControllerUploadDocument({
        materialId: material.id,
        file: row.file,
        role: "ANSWER" as any,
      });
      setStaged((previous) => previous.filter((r) => r.id !== row.id));
      await loadMaterials();
    } catch (error: any) {
      updateStaged(row.id, {
        status: "error",
        error: error?.message ?? "Upload failed.",
      });
    }
  };

  // ---- files added to an existing material --------------------------------

  const requestSlotUpload = (
    material: StaffMaterial,
    role: DocumentRoleValue,
  ) => {
    pendingUpload.current = { kind: "add", material, role };
    slotFileRef.current?.click();
  };

  const requestReplace = (document: StaffDocument) =>
    setConfirmReplace(document);

  const startReplace = () => {
    if (!confirmReplace) return;
    pendingUpload.current = { kind: "replace", document: confirmReplace };
    setConfirmReplace(null);
    slotFileRef.current?.click();
  };

  const handleSlotFile = async (file: File | undefined) => {
    const request = pendingUpload.current;
    pendingUpload.current = null;
    if (!file || !request) return;

    if (file.type !== "application/pdf") {
      setToast({ message: "Only PDF files are accepted.", severity: "warning" });
      return;
    }

    try {
      if (request.kind === "add") {
        await apiClient.materialControllerUploadDocument({
          materialId: request.material.id,
          file,
          role: request.role as any,
        });
      } else {
        setBusyDocumentId(request.document.id);
        await apiClient.documentControllerReplaceFile({
          id: request.document.id,
          file,
        });
      }
      await loadMaterials();
    } catch (error: any) {
      fail(error, "Upload failed.");
    } finally {
      setBusyDocumentId(null);
    }
  };

  // ---- per-document actions ------------------------------------------------

  const reprocess = async (document: StaffDocument) => {
    setBusyDocumentId(document.id);
    try {
      await apiClient.documentControllerReprocess({ id: document.id });
      await loadMaterials();
    } catch (error: any) {
      fail(error, "Could not queue reprocessing.");
    } finally {
      setBusyDocumentId(null);
    }
  };

  const runDelete = async () => {
    if (!confirmDelete) return;
    try {
      if (confirmDelete.kind === "material") {
        await apiClient.materialControllerDelete({
          materialDeleteRequest: { materialId: confirmDelete.id },
        });
      } else {
        await apiClient.documentControllerDelete({
          documentDeleteRequestDto: { documentId: confirmDelete.id },
        });
      }
      await loadMaterials();
    } catch (error: any) {
      fail(error, "Delete failed.");
    } finally {
      setConfirmDelete(null);
    }
  };

  const saveMaterialField = async (
    material: StaffMaterial,
    patch: { title?: string; availableDate?: Date },
  ) => {
    try {
      await apiClient.materialControllerEdit({
        materialEditRequest: {
          materialId: material.id,
          materialType: material.materialType as any,
          ...patch,
        },
      });
      await loadMaterials();
    } catch (error: any) {
      fail(error, "Could not save the material.");
    }
  };

  // ---- rendering -----------------------------------------------------------

  const renderMaterial = (material: StaffMaterial) => (
    <MaterialRow
      key={material.id}
      material={material}
      expanded={expandedIds.has(material.id)}
      onToggle={toggleExpanded}
      busyDocumentId={busyDocumentId}
      classID={classID}
      onAdd={requestSlotUpload}
      onReplace={requestReplace}
      onReprocess={reprocess}
      onDeleteDocument={(document) =>
        setConfirmDelete({
          kind: "document",
          id: document.id,
          label: document.fileName,
        })
      }
      onDeleteMaterial={(target) =>
        setConfirmDelete({
          kind: "material",
          id: target.id,
          label: target.title,
        })
      }
      onSaveField={saveMaterialField}
    />
  );

  if (loading) {
    return (
      <AdminPage>
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <CircularProgress />
        </Box>
      </AdminPage>
    );
  }

  // Attached rows are files inside another row's material, not materials.
  const materialCount = staged.filter(
    (row) => !row.attachTo || row.attachTo === DETACHED,
  ).length;

  const visible = applyListControls(materials, { query, filter, sort });
  const lectures = visible.filter((m) => m.materialType !== "recitation");
  const recitations = visible.filter((m) => m.materialType === "recitation");
  const attentionCount = materials.filter(needsAttention).length;
  const hiddenCount = materials.length - visible.length;

  return (
    <AdminPage maxWidth="xl">
      <AdminPageHeader
        title="Materials"
        description="Upload a lecture or a recitation here; add its answer key and any reference material from the material itself. Processing runs on the server, so you can close this page once files are queued."
      />

      <Card variant="outlined" sx={{ borderRadius: 2, mb: 4 }}>
        <CardContent sx={{ p: 0, "&:last-child": { pb: 0 } }}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          justifyContent="space-between"
          alignItems={{ xs: "stretch", sm: "center" }}
          spacing={2}
          sx={{ p: 3, pb: 2 }}
        >
          <Stack direction="row" spacing={1.5} alignItems="flex-start">
            <CloudUploadIcon color="action" />
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                New materials
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Each file becomes its own material, as the copy students see.
                Answer keys go on the material below, whenever they are ready.
              </Typography>
            </Box>
          </Stack>
          <Button
            variant="outlined"
            startIcon={<CloudUploadIcon />}
            onClick={() => newFilesRef.current?.click()}
            sx={{ whiteSpace: "nowrap" }}
          >
            Choose PDFs
          </Button>
          <input
            ref={newFilesRef}
            type="file"
            accept="application/pdf"
            multiple
            hidden
            onChange={(event) => {
              addNewFiles(event.target.files);
              event.target.value = "";
            }}
          />
        </Stack>

        {staged.length > 0 && (
          <>
            <TableContainer
              sx={{ borderTop: "1px solid", borderColor: "divider" }}
            >
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: "action.hover" }}>
                    <TableCell>File</TableCell>
                    <TableCell sx={{ width: 170 }}>Type</TableCell>
                    <TableCell sx={{ width: 260 }}>Title</TableCell>
                    <TableCell sx={{ width: 170 }}>Available from</TableCell>
                    <TableCell sx={{ width: 60 }} align="right" />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {staged
                    .filter((row) => !row.attachTo || row.attachTo === DETACHED)
                    .map((row) => {
                    const misfiled = misfiledAnswerKeyFor(row, materials);
                    const attached = attachmentsOf(row);
                    const orphanAnswer = isOrphanAnswerKey(row, staged, materials);
                    return (
                      <TableRow key={row.id}>
                        <TableCell>
                          <Typography variant="body2">{row.fileName}</Typography>
                          {row.error && (
                            <Typography variant="caption" color="error">
                              {row.error}
                            </Typography>
                          )}
                          {attached.map((extra) => (
                            <Stack
                              key={extra.id}
                              direction="row"
                              spacing={1}
                              alignItems="center"
                              sx={{ mt: 0.5 }}
                            >
                              <Chip
                                size="small"
                                variant="outlined"
                                label={
                                  row.materialType === "recitation"
                                    ? "Answer key"
                                    : "Reference"
                                }
                              />
                              <Typography variant="caption" noWrap>
                                {extra.fileName}
                              </Typography>
                              <Button
                                size="small"
                                disabled={processing}
                                onClick={() => detachStaged(extra.id)}
                              >
                                Separate
                              </Button>
                            </Stack>
                          ))}
                          {orphanAnswer && (
                            <Typography
                              variant="caption"
                              color="warning.main"
                              sx={{ display: "block", mt: 0.5 }}
                            >
                              Looks like an answer key, but nothing here matches
                              it. On its own, students would see the answers.
                            </Typography>
                          )}
                          {misfiled && (
                            <Box sx={{ mt: 0.5 }}>
                              <Typography variant="caption" color="warning.main">
                                Looks like the answer key for “{misfiled.title}”.
                                As a new material, students would see the
                                answers.
                              </Typography>
                              <Button
                                size="small"
                                sx={{ ml: 1 }}
                                disabled={processing}
                                onClick={() => attachAsAnswerKey(row, misfiled)}
                              >
                                Attach it there instead
                              </Button>
                            </Box>
                          )}
                        </TableCell>
                        <TableCell>
                          <Select
                            size="small"
                            fullWidth
                            value={row.materialType}
                            disabled={processing}
                            onChange={(event) =>
                              updateStaged(row.id, {
                                materialType: event.target
                                  .value as MaterialTypeValue,
                                typeTouched: true,
                              })
                            }
                          >
                            <MenuItem value="class materials">Lecture</MenuItem>
                            <MenuItem value="recitation">Recitation</MenuItem>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <TextField
                            size="small"
                            fullWidth
                            value={row.title}
                            disabled={processing}
                            onChange={(event) =>
                              updateStaged(row.id, { title: event.target.value })
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <TextField
                            size="small"
                            type="date"
                            fullWidth
                            value={row.availableDate}
                            disabled={processing}
                            onChange={(event) =>
                              updateStaged(row.id, {
                                availableDate: event.target.value,
                              })
                            }
                          />
                        </TableCell>
                        <TableCell align="right">
                          {row.status === "uploading" ? (
                            <CircularProgress size={18} />
                          ) : (
                            <IconButton
                              size="small"
                              disabled={processing}
                              onClick={() => removeStaged(row.id)}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>

            <Box sx={{ p: 3, pt: 2 }}>
              <Button
                variant="contained"
                startIcon={
                  processing ? (
                    <CircularProgress size={16} color="inherit" />
                  ) : (
                    <PlayIcon />
                  )
                }
                disabled={processing}
                onClick={createMaterials}
              >
                Create {materialCount} material{materialCount > 1 ? "s" : ""}
              </Button>
            </Box>
          </>
        )}
        </CardContent>
      </Card>

      {/* One input serves every slot button; the pending request says where the
          file is going. */}
      <input
        ref={slotFileRef}
        type="file"
        accept="application/pdf"
        hidden
        onChange={(event) => {
          handleSlotFile(event.target.files?.[0]);
          event.target.value = "";
        }}
      />

      <Card variant="outlined" sx={{ borderRadius: 2, mb: 4 }}>
        <CardContent sx={{ p: 0, "&:last-child": { pb: 0 } }}>
        <Stack direction="row" spacing={1.5} alignItems="flex-start" sx={{ p: 3, pb: 2 }}>
          <FolderIcon color="action" />
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Materials
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {materials.length} material{materials.length === 1 ? "" : "s"}
              {attentionCount > 0 && ` · ${attentionCount} need attention`}
            </Typography>
          </Box>
        </Stack>

        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={1.5}
          alignItems={{ md: "center" }}
          sx={{ px: 3, pb: 2 }}
        >
          <TextField
            size="small"
            placeholder="Search titles and file names"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            sx={{ flex: 1, minWidth: 220 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
          />
          <Select
            size="small"
            value={filter}
            onChange={(event) =>
              setFilter(event.target.value as MaterialFilter)
            }
            sx={{ minWidth: 190 }}
          >
            {(
              Object.keys(FILTER_LABELS) as MaterialFilter[]
            ).map((value) => (
              <MenuItem key={value} value={value}>
                {FILTER_LABELS[value]}
                {value === "attention" && attentionCount > 0
                  ? ` (${attentionCount})`
                  : ""}
              </MenuItem>
            ))}
          </Select>
          <Select
            size="small"
            value={sort}
            onChange={(event) => setSort(event.target.value as MaterialSort)}
            sx={{ minWidth: 150 }}
          >
            {(Object.keys(SORT_LABELS) as MaterialSort[]).map((value) => (
              <MenuItem key={value} value={value}>
                {SORT_LABELS[value]}
              </MenuItem>
            ))}
          </Select>
          <Tooltip title="Collapse all">
            <span>
              <IconButton
                size="small"
                disabled={expandedIds.size === 0}
                onClick={() => setExpandedIds(new Set())}
              >
                <CollapseAllIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        </Stack>

        <Box sx={{ borderTop: "1px solid", borderColor: "divider" }}>
        {visible.length === 0 ? (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ p: 3, textAlign: "center" }}
          >
            {materials.length === 0
              ? "No materials yet."
              : "Nothing matches these filters."}
          </Typography>
        ) : (
          <>
            {lectures.length > 0 && (
              <>
                <SectionLabel label="Lectures" count={lectures.length} />
                {lectures.map(renderMaterial)}
              </>
            )}
            {recitations.length > 0 && (
              <>
                <SectionLabel label="Recitations" count={recitations.length} />
                {recitations.map(renderMaterial)}
              </>
            )}
          </>
        )}

        {hiddenCount > 0 && (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: "block", px: 1.5, py: 1 }}
          >
            {hiddenCount} material{hiddenCount > 1 ? "s" : ""} hidden by the
            current filter.
          </Typography>
        )}
        </Box>
        </CardContent>
      </Card>

      <Dialog
        open={Boolean(confirmReplace)}
        onClose={() => setConfirmReplace(null)}
      >
        <DialogTitle>Replace this file?</DialogTitle>
        <DialogContent>
          <DialogContentText component="div">
            <Typography variant="body2" paragraph>
              “{confirmReplace?.fileName}” is swapped for the file you pick next.
              Comments, summaries and existing citations stay with it — they
              point at the document, not the file.
            </Typography>
            <Typography variant="body2">
              If the new PDF paginates differently, comments keep their page
              numbers but their pin positions may sit in the wrong place.
            </Typography>
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmReplace(null)}>Cancel</Button>
          <Button onClick={startReplace}>Choose file</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(confirmDelete)} onClose={() => setConfirmDelete(null)}>
        <DialogTitle>
          {confirmDelete?.kind === "material"
            ? "Delete this material?"
            : "Delete this file?"}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            {confirmDelete?.kind === "material"
              ? `“${confirmDelete?.label}” and its files stop appearing for students. Chat history that referenced it is kept.`
              : `“${confirmDelete?.label}” is removed permanently, along with its annotations and everything the tutor learned from it.`}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDelete(null)}>Cancel</Button>
          <Button color="error" onClick={runDelete}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={Boolean(toast)}
        autoHideDuration={5000}
        onClose={() => setToast(null)}
      >
        <Alert severity={toast?.severity ?? "info"} onClose={() => setToast(null)}>
          {toast?.message}
        </Alert>
      </Snackbar>
    </AdminPage>
  );
};
