import {
  CreateOutlined as AnnotateIcon,
  CancelOutlined as CancelIcon,
  ChevronRightOutlined as ChevronRightIcon,
  CloudUploadOutlined as CloudUploadIcon,
  DeleteOutline as DeleteIcon,
  EditOutlined as EditIcon,
  ExpandMoreOutlined as ExpandMoreIcon,
  InsertDriveFileOutlined as FileIcon,
  FolderOutlined as FolderIcon,
  KeyboardArrowDownOutlined as KeyboardArrowDownIcon,
  KeyboardArrowUpOutlined as KeyboardArrowUpIcon,
  SaveOutlined as SaveIcon,
  SyncOutlined as ReprocessIcon
} from "@mui/icons-material";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Collapse,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  LinearProgress,
  MenuItem,
  Select,
  Snackbar,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Typography
} from "@mui/material";
import * as React from "react";
import { useParams } from "react-router-dom";
import { Material, MaterialAddRequestMaterialTypeEnum } from "../../services/index.ts";
import { MaterialEditRequestMaterialTypeEnum } from "../../services/models/MaterialEditRequest.ts";
import apiClient from "../../utils/api.ts";
import {
  runPipelineForExistingMaterial,
  reprocessExistingDocument,
  PipelineProgress,
} from "../../utils/documentPipeline.ts";
import { AdminPage, AdminPageHeader } from "../../components/AdminPage/index.ts";

interface DocumentInfo {
  id: string;
  fileName: string;
  file: string;
  isStudent: boolean;
  isLlm?: boolean;
  materialId: string;
}

interface MaterialInfo {
  id: string;
  materialName: string;
  materialType: string;
  availableDate: Date;
  documents: DocumentInfo[];
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => {
  return (
    <div hidden={value !== index}>
      {value === index && children}
    </div>
  );
};

export const NewMaterial: React.FC = () => {
  const [openSnackbar, setOpenSnackbar] = React.useState(false);
  const [materials, setMaterials] = React.useState<MaterialInfo[]>([]);
  const [selectedDocument, setSelectedDocument] = React.useState<DocumentInfo | null>(null);
  const [selectedMaterial, setSelectedMaterial] = React.useState<MaterialInfo | null>(null);
  const [tabValue, setTabValue] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [expandedMaterials, setExpandedMaterials] = React.useState<string[]>([]);
  const [editMode, setEditMode] = React.useState(false);
  const [editMaterialType, setEditMaterialType] = React.useState<MaterialEditRequestMaterialTypeEnum>("class materials");
  const [editAvailableDate, setEditAvailableDate] = React.useState<Date>(new Date());
  const [documentUploaded, setDocumentUploaded] = React.useState(false);
  const [flagUpdateSuccess, setFlagUpdateSuccess] = React.useState(false);
  const [updatingFlags, setUpdatingFlags] = React.useState<string | null>(null);
  const [actionsExpanded, setActionsExpanded] = React.useState(false);
  const { classID = "" } = useParams();
  // Filter materials by type
  const lectureMaterials = React.useMemo(
    () =>
      materials.filter(
        (m) =>
          m.materialType === MaterialAddRequestMaterialTypeEnum.ClassMaterials ||
          m.materialType?.toLowerCase() === "class materials"
      ),
    [materials]
  );

  const recitationMaterials = React.useMemo(
    () =>
      materials.filter(
        (m) =>
          m.materialType === MaterialAddRequestMaterialTypeEnum.Recitation ||
          m.materialType?.toLowerCase() === "recitation"
      ),
    [materials]
  );
  // For Batch Processing Uploaded Documents
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [progress, setProgress] = React.useState<PipelineProgress | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  // Confirmation dialog + pipeline progress state
  const [showConfirmDialog, setShowConfirmDialog] = React.useState(false);
  const [pendingFile, setPendingFile] = React.useState<File | null>(null);

  // Reprocess (re-chunk) an existing document
  const [reprocessingDocumentIds, setReprocessingDocumentIds] = React.useState<Set<string>>(new Set());
  const [reprocessSuccess, setReprocessSuccess] = React.useState(false);
  const [reprocessError, setReprocessError] = React.useState<string | null>(null);

  const handleSnackbarClose = () => {
    setOpenSnackbar(false);
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    setSelectedDocument(null);
    setSelectedMaterial(null);
  };

  const handleMaterialToggle = (materialId: string) => {
    setExpandedMaterials(prev =>
      prev.includes(materialId)
        ? prev.filter(id => id !== materialId)
        : [...prev, materialId]
    );
  };

  const handleMaterialSelect = (material: MaterialInfo) => {
    setSelectedMaterial(material);
    setSelectedDocument(null);
    setEditMode(false);
    setEditMaterialType(material.materialType as MaterialEditRequestMaterialTypeEnum);
    setEditAvailableDate(material.availableDate);
  };

  const handleDocumentSelect = (document: DocumentInfo) => {
    setSelectedDocument(document);
    // Find and set the material that contains this document
    const material = materials.find(m => m.documents.some(d => d.id === document.id));
    if (material) {
      setSelectedMaterial(material);
    }
  };


  const handleEditMaterial = async () => {
    if (!selectedMaterial) return;
    try {
      const res = await apiClient.materialControllerEdit({
        materialEditRequest: {
          materialId: selectedMaterial.id,
          materialType: editMaterialType,
          availableDate: editAvailableDate,
        },
      });
      if (res) {
        setEditMode(false);
        await fetchMaterialList(); // Refresh the material list
      }
    } catch (error) {
      console.error("Error editing material", error);
    }
  };

  const handleDeleteMaterial = async () => {
    if (!selectedMaterial) return;
    try {
      await apiClient.materialControllerDelete({
        materialDeleteRequest: {
          materialId: selectedMaterial.id,
        },
      });
      setSelectedMaterial(null);
      setSelectedDocument(null);
      await fetchMaterialList(); // Refresh the material list
    } catch (error) {
      console.error("Error deleting material", error);
    }
  };

  // STEP 1 CHANGE: gate upload by showing confirmation dialog first
  const handleDocumentUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.currentTarget.value = ""; // let users select same file again later
    if (!file || !selectedMaterial) return;

    // Do not start processing yet; store file and open confirmation dialog
    setPendingFile(file);
    setShowConfirmDialog(true);
  };

  // STEP 1 ADD: confirm handler that actually runs the pipeline
  const confirmSingleProcess = async () => {
    if (!pendingFile || !selectedMaterial) {
      setShowConfirmDialog(false);
      return;
    }

    setShowConfirmDialog(false);
    setError(null);
    setIsProcessing(true);
    setProgress({ phase: "uploading", message: "Preparing..." });

    try {
      await runPipelineForExistingMaterial({
        materialId: selectedMaterial.id,
        file: pendingFile,
        onProgress: setProgress,
      });

      setDocumentUploaded(true); // your Snackbar
      await fetchMaterialList(); // refresh table
    } catch (err: any) {
      setError(err?.message ?? "Unknown error");
    } finally {
      setIsProcessing(false);
      setPendingFile(null);
    }
  };

  const handleDeleteDocument = async (documentId: string) => {
    try {
      await apiClient.documentControllerDelete({
        documentDeleteRequestDto: {
          documentId: documentId,
        },
      });
      await fetchMaterialList(); // Refresh the material list
    } catch (error) {
      console.error("Error deleting document", error);
    }
  };

  const handleReprocessDocument = async (documentId: string) => {
    if (reprocessingDocumentIds.has(documentId)) return; // already in flight, guard double-clicks

    setReprocessingDocumentIds((prev) => new Set(prev).add(documentId));
    setReprocessError(null);

    try {
      await reprocessExistingDocument({ documentId });
      setReprocessSuccess(true);
      await fetchMaterialList(); // Refresh the material list
    } catch (error: any) {
      console.error("Error reprocessing document", error);
      setReprocessError(error?.message ?? "Failed to reprocess document.");
    } finally {
      setReprocessingDocumentIds((prev) => {
        const next = new Set(prev);
        next.delete(documentId);
        return next;
      });
    }
  };

  const handleDocumentFlagChange = async (
    doc: DocumentInfo,
    field: "isStudent" | "isLlm",
    nextValue: boolean
  ) => {
    console.log(`🔄 Changing ${field} from ${doc[field]} to ${nextValue} for document:`, doc.fileName);

    const nextPayload = {
      materialId: doc.materialId,
      isStudent: field === "isStudent" ? nextValue : !!doc.isStudent,
      isLlm: field === "isLlm" ? nextValue : !!doc.isLlm,
    };

    console.log("📤 Sending payload:", nextPayload);

    try {
      setUpdatingFlags(doc.id);

      // Optimistic update: immediately update the UI
      setMaterials(prevMaterials =>
        prevMaterials.map(material => ({
          ...material,
          documents: material.documents.map(document => {
            if (document.id === doc.id) {
              return { ...document, ...nextPayload };
            }
            // If enabling isStudent on this document, disable it on others in the same material
            if (field === "isStudent" && nextValue && document.materialId === doc.materialId) {
              return { ...document, isStudent: false };
            }
            return document;
          })
        }))
      );

      // Make API call
      const apiResponse = await apiClient.documentControllerSetFlags({
        id: doc.id,
        setDocumentFlagsDto: nextPayload,
      });

      console.log("✅ API call successful:", apiResponse);

      // Show success feedback
      setFlagUpdateSuccess(true);

      // Refresh from server to ensure consistency
      console.log("🔄 Refreshing data from server...");
      await fetchMaterialList();
      console.log("✅ Data refresh complete");
    } catch (error) {
      console.error("Error updating document flags", error);
      // On error, refresh from server to revert optimistic update
      await fetchMaterialList();
    } finally {
      setUpdatingFlags(null);
    }
  };

  const fetchMaterialList = async () => {
    try {
      setLoading(true);
      const { materials } = await apiClient.materialControllerList({
        materialListRequest: { classId: classID },
      });
      const materialInfoArray = await fetchMaterialInfoArray(materials);
      setMaterials(materialInfoArray);
    } catch (error) {
      console.log("error fetching class material", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMaterialInfoArray = async (
    materials: Material[]
  ): Promise<MaterialInfo[]> => {
    return Promise.all(materials.map(convertToMaterialInfo));
  };

  const convertToMaterialInfo = async (
    material: Material
  ): Promise<MaterialInfo> => {
    try {
      const { documents } =
        await apiClient.materialControllerGetListByMaterialId({
          materialID: material.id,
        });

      console.log(`📋 Raw documents from server for material ${material.id}:`, documents);

      const documentInfos: DocumentInfo[] = documents?.map((doc: any) => {
        const processed = {
          id: doc.id,
          fileName: doc.fileName || "Untitled",
          file: doc.file || "",
          isStudent: !!doc.isStudent,
          isLlm: !!doc.isLlm,
          materialId: material.id,
        };
        console.log(`📄 Processing document ${doc.fileName}: isStudent=${doc.isStudent} -> ${processed.isStudent}, isLlm=${doc.isLlm} -> ${processed.isLlm}`);
        return processed;
      }) || [];

      return {
        id: material.id,
        materialName: documentInfos.length > 0 ? documentInfos[0].fileName : `Material ${material.id.substring(0, 8)}`,
        materialType: material.materialType,
        availableDate: new Date(material.availableDate),
        documents: documentInfos,
      };
    } catch (error) {
      console.error("Error fetching material data:", error);
      return {
        id: material.id,
        materialName: "Untitled Material",
        materialType: material.materialType,
        availableDate: new Date(material.availableDate),
        documents: [],
      };
    }
  };

  React.useEffect(() => {
    fetchMaterialList();
  }, [classID]);

  // Set first material as selected by default when materials are loaded
  React.useEffect(() => {
    if (materials.length > 0 && !selectedMaterial) {
      const currentTabMaterials = tabValue === 0 ? lectureMaterials : recitationMaterials;
      if (currentTabMaterials.length > 0) {
        setSelectedMaterial(currentTabMaterials[0]);
        setExpandedMaterials(prev => [...prev, currentTabMaterials[0].id]);
      }
    }
  }, [materials, tabValue, lectureMaterials, recitationMaterials, selectedMaterial]);

  if (loading) {
    return (
      <AdminPage>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
          <CircularProgress />
        </Box>
      </AdminPage>
    );
  }

  return (
    <AdminPage maxWidth="xl">
      <AdminPageHeader
        title="Manage Materials"
        description="Organize lecture and recitation materials and manage their documents."
      />

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tabValue} onChange={handleTabChange}>
          <Tab label="Lecture" />
          <Tab label="Recitation" />
        </Tabs>
      </Box>

      {/* Tab Panels */}
      <TabPanel value={tabValue} index={0}>
        <Box sx={{ display: 'flex', height: '70vh', gap: 2 }}>
          {/* Left Side: Hierarchical Directory */}
          <Box sx={{ width: '25%', minWidth: 250 }}>
            <Box sx={{ p: 2, height: '100%', overflow: 'auto' }}>
              {lectureMaterials.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No lecture materials yet.
                </Typography>
              ) : (
                <List>
                  {lectureMaterials.map((material) => (
                    <React.Fragment key={material.id}>
                      <ListItem disablePadding>
                        <ListItemButton
                          onClick={() => {
                            handleMaterialToggle(material.id);
                            handleMaterialSelect(material);
                          }}
                        >
                          <ListItemIcon>
                            {expandedMaterials.includes(material.id) ? <ExpandMoreIcon /> : <ChevronRightIcon />}
                          </ListItemIcon>
                          <ListItemIcon>
                            <FolderIcon />
                          </ListItemIcon>
                          <ListItemText primary={material.materialName} />
                        </ListItemButton>
                      </ListItem>
                      <Collapse in={expandedMaterials.includes(material.id)} timeout="auto" unmountOnExit>
                        <List component="div" disablePadding>
                          {material.documents.map((document) => (
                            <ListItem key={document.id} disablePadding sx={{ pl: 4 }}>
                              <ListItemButton onClick={() => handleDocumentSelect(document)}>
                                <ListItemIcon>
                                  <FileIcon />
                                </ListItemIcon>
                                <ListItemText primary={
                                  <Typography variant="body2">{document.fileName}</Typography>
                                } />
                              </ListItemButton>
                            </ListItem>
                          ))}
                        </List>
                      </Collapse>
                    </React.Fragment>
                  ))}
                </List>
              )}
            </Box>
          </Box>

          {/* Middle: Divider */}
          <Divider orientation="vertical" flexItem />

          {/* Right Side: Document Table */}
          <Box sx={{ flex: 1 }}>
            <Box sx={{ p: 2, height: '100%' }}>
              {selectedMaterial ? (
                <Box>
                  {/* Material Actions Control Panel - Collapsible */}
                  <Box sx={{ mb: 2 }}>
                    <Button
                      onClick={() => setActionsExpanded(!actionsExpanded)}
                      startIcon={actionsExpanded ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
                      variant="outlined"
                      fullWidth
                      sx={{ mb: 1, justifyContent: 'flex-start' }}
                    >
                      Material Actions
                    </Button>
                    <Collapse in={actionsExpanded}>
                      <Box sx={{
                        p: 2,
                        border: '1px solid #e0e0e0',
                        borderRadius: 1,
                        display: 'flex',
                        gap: 2,
                        flexWrap: 'wrap'
                      }}>
                        {/* Upload Document */}
                        <Box sx={{ flex: '1 1 250px', minWidth: 200 }}>
                          <Typography variant="subtitle2" gutterBottom>
                            Upload Document
                          </Typography>
                          <Button
                            component="label"
                            variant="contained"
                            startIcon={<CloudUploadIcon />}
                            fullWidth
                          >
                            Upload File
                            <input
                              accept=".pdf,.doc,.docx,.ppt,.pptx,.png,.jpg,.jpeg"
                              type="file"
                              style={{ display: "none" }}
                              onChange={handleDocumentUpload}
                            />
                          </Button>
                        </Box>

                        {/* Edit Material */}
                        <Box sx={{ flex: '1 1 250px', minWidth: 200 }}>
                          <Typography variant="subtitle2" gutterBottom>
                            Edit Material
                          </Typography>
                          {editMode ? (
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                              <FormControl fullWidth size="small">
                                <InputLabel>Material Type</InputLabel>
                                <Select
                                  value={editMaterialType}
                                  label="Material Type"
                                  onChange={(e) => setEditMaterialType(e.target.value as MaterialEditRequestMaterialTypeEnum)}
                                >
                                  {Object.values(MaterialEditRequestMaterialTypeEnum).map((value) => (
                                    <MenuItem key={value} value={value}>
                                      {value}
                                    </MenuItem>
                                  ))}
                                </Select>
                              </FormControl>
                              <TextField
                                label="Available Date"
                                type="date"
                                size="small"
                                fullWidth
                                value={editAvailableDate.toISOString().split("T")[0]}
                                onChange={(e) => setEditAvailableDate(new Date(e.target.value))}
                                InputLabelProps={{ shrink: true }}
                              />
                              <Box sx={{ display: 'flex', gap: 1 }}>
                                <Button
                                  variant="contained"
                                  size="small"
                                  startIcon={<SaveIcon />}
                                  onClick={handleEditMaterial}
                                  sx={{ flex: 1 }}
                                >
                                  Save
                                </Button>
                                <Button
                                  variant="outlined"
                                  size="small"
                                  startIcon={<CancelIcon />}
                                  onClick={() => setEditMode(false)}
                                  sx={{ flex: 1 }}
                                >
                                  Cancel
                                </Button>
                              </Box>
                            </Box>
                          ) : (
                            <Button
                              variant="outlined"
                              startIcon={<EditIcon />}
                              onClick={() => setEditMode(true)}
                              fullWidth
                            >
                              Edit Material
                            </Button>
                          )}
                        </Box>

                        {/* Delete Material */}
                        <Box sx={{ flex: '1 1 250px', minWidth: 200 }}>
                          <Typography variant="subtitle2" gutterBottom sx={{ color: 'error.main' }}>
                            Delete Material
                          </Typography>
                          <Button
                            variant="contained"
                            color="error"
                            startIcon={<DeleteIcon />}
                            onClick={handleDeleteMaterial}
                            fullWidth
                          >
                            Delete Material
                          </Button>
                        </Box>
                      </Box>
                    </Collapse>
                  </Box>

                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>File Name</TableCell>
                          <TableCell>Student Visible</TableCell>
                          <TableCell>LLM Retrieval</TableCell>
                          <TableCell>Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {selectedMaterial.documents.map((document) => (
                          <TableRow
                            key={document.id}
                            sx={{
                              backgroundColor: selectedDocument?.id === document.id ? '#D4C8E0' : 'transparent',
                              '&:hover': { backgroundColor: selectedDocument?.id === document.id ? '#D4C8E0' : '#f5f5f5' }
                            }}
                          >
                            <TableCell>{document.fileName}</TableCell>
                            <TableCell>
                              <FormControl size="small" sx={{ minWidth: 120 }}>
                                <Select
                                  value={String(!!document.isStudent)}
                                  onChange={(e) => handleDocumentFlagChange(document, "isStudent", e.target.value === "true")}
                                  disabled={updatingFlags === document.id}
                                  renderValue={(v) => (
                                    <Chip
                                      size="small"
                                      color={v === "true" ? "success" : "default"}
                                      label={updatingFlags === document.id ? "Updating..." : (v === "true" ? "Enabled" : "Disabled")}
                                    />
                                  )}
                                >
                                  <MenuItem value="true">Enable</MenuItem>
                                  <MenuItem value="false">Disable</MenuItem>
                                </Select>
                              </FormControl>
                            </TableCell>
                            <TableCell>
                              <FormControl size="small" sx={{ minWidth: 120 }}>
                                <Select
                                  value={String(!!document.isLlm)}
                                  onChange={(e) => handleDocumentFlagChange(document, "isLlm", e.target.value === "true")}
                                  disabled={updatingFlags === document.id}
                                  renderValue={(v) => (
                                    <Chip
                                      size="small"
                                      color={v === "true" ? "success" : "default"}
                                      label={updatingFlags === document.id ? "Updating..." : (v === "true" ? "Enabled" : "Disabled")}
                                    />
                                  )}
                                >
                                  <MenuItem value="true">Enable</MenuItem>
                                  <MenuItem value="false">Disable</MenuItem>
                                </Select>
                              </FormControl>
                            </TableCell>
                            <TableCell>
                              <Box sx={{ display: 'flex', gap: 1 }}>
                                <Button
                                  startIcon={<AnnotateIcon />}
                                  variant="outlined"
                                  size="small"
                                  href={`/admin/class/${classID}/${selectedMaterial.id}/${document.id}/annotation`}
                                  target="_blank"
                                >
                                  Annotate
                                </Button>
                                <Button
                                  startIcon={
                                    reprocessingDocumentIds.has(document.id) ? (
                                      <CircularProgress size={16} color="inherit" />
                                    ) : (
                                      <ReprocessIcon />
                                    )
                                  }
                                  variant="outlined"
                                  size="small"
                                  disabled={reprocessingDocumentIds.has(document.id)}
                                  onClick={() => handleReprocessDocument(document.id)}
                                >
                                  Reprocess
                                </Button>
                                <Button
                                  startIcon={<DeleteIcon />}
                                  variant="outlined"
                                  color="error"
                                  size="small"
                                  onClick={() => handleDeleteDocument(document.id)}
                                >
                                  Delete
                                </Button>
                              </Box>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              ) : (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
                  <Typography variant="body1" color="text.secondary">
                    Select a material from the directory to view its documents
                  </Typography>
                </Box>
              )}
            </Box>
          </Box>
        </Box>
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        <Box sx={{ display: 'flex', height: '70vh', gap: 2 }}>
          {/* Left Side: Hierarchical Directory */}
          <Box sx={{ width: '25%', minWidth: 250 }}>
            <Box sx={{ p: 2, height: '100%', overflow: 'auto' }}>
              {recitationMaterials.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No recitation materials yet.
                </Typography>
              ) : (
                <List>
                  {recitationMaterials.map((material) => (
                    <React.Fragment key={material.id}>
                      <ListItem disablePadding>
                        <ListItemButton
                          onClick={() => {
                            handleMaterialToggle(material.id);
                            handleMaterialSelect(material);
                          }}
                        >
                          <ListItemIcon>
                            {expandedMaterials.includes(material.id) ? <ExpandMoreIcon /> : <ChevronRightIcon />}
                          </ListItemIcon>
                          <ListItemIcon>
                            <FolderIcon />
                          </ListItemIcon>
                          <ListItemText primary={material.materialName} />
                        </ListItemButton>
                      </ListItem>
                      <Collapse in={expandedMaterials.includes(material.id)} timeout="auto" unmountOnExit>
                        <List component="div" disablePadding>
                          {material.documents.map((document) => (
                            <ListItem key={document.id} disablePadding sx={{ pl: 4 }}>
                              <ListItemButton onClick={() => handleDocumentSelect(document)}>
                                <ListItemIcon>
                                  <FileIcon />
                                </ListItemIcon>
                                <ListItemText primary={
                                  <Typography variant="body2">{document.fileName}</Typography>
                                } />
                              </ListItemButton>
                            </ListItem>
                          ))}
                        </List>
                      </Collapse>
                    </React.Fragment>
                  ))}
                </List>
              )}
            </Box>
          </Box>

          {/* Middle: Divider */}
          <Divider orientation="vertical" flexItem />

          {/* Right Side: Document Table */}
          <Box sx={{ flex: 1 }}>
            <Box sx={{ p: 2, height: '100%' }}>
              {selectedMaterial ? (
                <Box>
                  {/* Material Actions Control Panel - Collapsible */}
                  <Box sx={{ mb: 2 }}>
                    <Button
                      onClick={() => setActionsExpanded(!actionsExpanded)}
                      startIcon={actionsExpanded ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
                      variant="outlined"
                      fullWidth
                      sx={{ mb: 1, justifyContent: 'flex-start' }}
                    >
                      Material Actions
                    </Button>
                    <Collapse in={actionsExpanded}>
                      <Box sx={{
                        p: 2,
                        border: '1px solid #e0e0e0',
                        borderRadius: 1,
                        display: 'flex',
                        gap: 2,
                        flexWrap: 'wrap'
                      }}>
                        {/* Upload Document */}
                        <Box sx={{ flex: '1 1 250px', minWidth: 200 }}>
                          <Typography variant="subtitle2" gutterBottom>
                            Upload Document
                          </Typography>
                          <Button
                            component="label"
                            variant="contained"
                            startIcon={<CloudUploadIcon />}
                            fullWidth
                          >
                            Upload File
                            <input
                              accept=".pdf,.doc,.docx,.ppt,.pptx,.png,.jpg,.jpeg"
                              type="file"
                              style={{ display: "none" }}
                              onChange={handleDocumentUpload}
                            />
                          </Button>
                        </Box>

                        {/* Edit Material */}
                        <Box sx={{ flex: '1 1 250px', minWidth: 200 }}>
                          <Typography variant="subtitle2" gutterBottom>
                            Edit Material
                          </Typography>
                          {editMode ? (
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                              <FormControl fullWidth size="small">
                                <InputLabel>Material Type</InputLabel>
                                <Select
                                  value={editMaterialType}
                                  label="Material Type"
                                  onChange={(e) => setEditMaterialType(e.target.value as MaterialEditRequestMaterialTypeEnum)}
                                >
                                  {Object.values(MaterialEditRequestMaterialTypeEnum).map((value) => (
                                    <MenuItem key={value} value={value}>
                                      {value}
                                    </MenuItem>
                                  ))}
                                </Select>
                              </FormControl>
                              <TextField
                                label="Available Date"
                                type="date"
                                size="small"
                                fullWidth
                                value={editAvailableDate.toISOString().split("T")[0]}
                                onChange={(e) => setEditAvailableDate(new Date(e.target.value))}
                                InputLabelProps={{ shrink: true }}
                              />
                              <Box sx={{ display: 'flex', gap: 1 }}>
                                <Button
                                  variant="contained"
                                  size="small"
                                  startIcon={<SaveIcon />}
                                  onClick={handleEditMaterial}
                                  sx={{ flex: 1 }}
                                >
                                  Save
                                </Button>
                                <Button
                                  variant="outlined"
                                  size="small"
                                  startIcon={<CancelIcon />}
                                  onClick={() => setEditMode(false)}
                                  sx={{ flex: 1 }}
                                >
                                  Cancel
                                </Button>
                              </Box>
                            </Box>
                          ) : (
                            <Button
                              variant="outlined"
                              startIcon={<EditIcon />}
                              onClick={() => setEditMode(true)}
                              fullWidth
                            >
                              Edit Material
                            </Button>
                          )}
                        </Box>

                        {/* Delete Material */}
                        <Box sx={{ flex: '1 1 250px', minWidth: 200 }}>
                          <Typography variant="subtitle2" gutterBottom sx={{ color: 'error.main' }}>
                            Delete Material
                          </Typography>
                          <Button
                            variant="contained"
                            color="error"
                            startIcon={<DeleteIcon />}
                            onClick={handleDeleteMaterial}
                            fullWidth
                          >
                            Delete Material
                          </Button>
                        </Box>
                      </Box>
                    </Collapse>
                  </Box>

                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>File Name</TableCell>
                          <TableCell>Student Visible</TableCell>
                          <TableCell>LLM Retrieval</TableCell>
                          <TableCell>Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {selectedMaterial.documents.map((document) => (
                          <TableRow
                            key={document.id}
                            sx={{
                              backgroundColor: selectedDocument?.id === document.id ? '#D4C8E0' : 'transparent',
                              '&:hover': { backgroundColor: selectedDocument?.id === document.id ? '#D4C8E0' : '#f5f5f5' }
                            }}
                          >
                            <TableCell>{document.fileName}</TableCell>
                            <TableCell>
                              <FormControl size="small" sx={{ minWidth: 120 }}>
                                <Select
                                  value={String(!!document.isStudent)}
                                  onChange={(e) => handleDocumentFlagChange(document, "isStudent", e.target.value === "true")}
                                  disabled={updatingFlags === document.id}
                                  renderValue={(v) => (
                                    <Chip
                                      size="small"
                                      color={v === "true" ? "success" : "default"}
                                      label={updatingFlags === document.id ? "Updating..." : (v === "true" ? "Enabled" : "Disabled")}
                                    />
                                  )}
                                >
                                  <MenuItem value="true">Enable</MenuItem>
                                  <MenuItem value="false">Disable</MenuItem>
                                </Select>
                              </FormControl>
                            </TableCell>
                            <TableCell>
                              <FormControl size="small" sx={{ minWidth: 120 }}>
                                <Select
                                  value={String(!!document.isLlm)}
                                  onChange={(e) => handleDocumentFlagChange(document, "isLlm", e.target.value === "true")}
                                  disabled={updatingFlags === document.id}
                                  renderValue={(v) => (
                                    <Chip
                                      size="small"
                                      color={v === "true" ? "success" : "default"}
                                      label={updatingFlags === document.id ? "Updating..." : (v === "true" ? "Enabled" : "Disabled")}
                                    />
                                  )}
                                >
                                  <MenuItem value="true">Enable</MenuItem>
                                  <MenuItem value="false">Disable</MenuItem>
                                </Select>
                              </FormControl>
                            </TableCell>
                            <TableCell>
                              <Box sx={{ display: 'flex', gap: 1 }}>
                                <Button
                                  startIcon={<AnnotateIcon />}
                                  variant="outlined"
                                  size="small"
                                  href={`/admin/class/${classID}/${selectedMaterial.id}/${document.id}/annotation`}
                                  target="_blank"
                                >
                                  Annotate
                                </Button>
                                <Button
                                  startIcon={
                                    reprocessingDocumentIds.has(document.id) ? (
                                      <CircularProgress size={16} color="inherit" />
                                    ) : (
                                      <ReprocessIcon />
                                    )
                                  }
                                  variant="outlined"
                                  size="small"
                                  disabled={reprocessingDocumentIds.has(document.id)}
                                  onClick={() => handleReprocessDocument(document.id)}
                                >
                                  Reprocess
                                </Button>
                                <Button
                                  startIcon={<DeleteIcon />}
                                  variant="outlined"
                                  color="error"
                                  size="small"
                                  onClick={() => handleDeleteDocument(document.id)}
                                >
                                  Delete
                                </Button>
                              </Box>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              ) : (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
                  <Typography variant="body1" color="text.secondary">
                    Select a material from the directory to view its documents
                  </Typography>
                </Box>
              )}
            </Box>
          </Box>
        </Box>
      </TabPanel>


      <Snackbar
        open={documentUploaded}
        autoHideDuration={3000}
        onClose={() => setDocumentUploaded(false)}
      >
        <Alert
          severity="success"
          variant="filled"
        >
          Document uploaded successfully!
        </Alert>
      </Snackbar>

      <Snackbar
        open={flagUpdateSuccess}
        autoHideDuration={2000}
        onClose={() => setFlagUpdateSuccess(false)}
      >
        <Alert
          severity="success"
          variant="filled"
        >
          Document flags updated successfully!
        </Alert>
      </Snackbar>

      <Snackbar
        open={reprocessSuccess}
        autoHideDuration={3000}
        onClose={() => setReprocessSuccess(false)}
      >
        <Alert
          onClose={() => setReprocessSuccess(false)}
          severity="success"
          variant="filled"
        >
          Document reprocessed successfully.
        </Alert>
      </Snackbar>

      <Snackbar
        open={!!reprocessError}
        autoHideDuration={5000}
        onClose={() => setReprocessError(null)}
      >
        <Alert
          onClose={() => setReprocessError(null)}
          severity="error"
          variant="filled"
        >
          {reprocessError}
        </Alert>
      </Snackbar>

      <Snackbar
        open={openSnackbar}
        autoHideDuration={3000}
        onClose={handleSnackbarClose}
      >
        <Alert
          onClose={handleSnackbarClose}
          severity="success"
          variant="filled"
        >
          Material updated successfully!
        </Alert>
      </Snackbar>

      {/* STEP 1 ADD: Confirmation dialog (exact wording as Batch) */}
      <Dialog open={showConfirmDialog} onClose={() => setShowConfirmDialog(false)}>
        <DialogTitle>Start Batch Processing?</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mt: 1 }}>
            This process will upload and process 1 files.
            Each file will go through chunking, description, and embedding processes.
            This may take several minutes. Please do not leave this page until the process is complete.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowConfirmDialog(false)}>Cancel</Button>
          <Button onClick={confirmSingleProcess} variant="contained" color="primary">
            Start Processing
          </Button>
        </DialogActions>
      </Dialog>
    </AdminPage>
  );
};
