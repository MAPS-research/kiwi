import {
  CloudUploadOutlined as CloudUploadIcon,
  DeleteOutline as DeleteIcon,
  DownloadOutlined as DownloadIcon,
  PlayArrowOutlined as PlayArrowIcon,
  RefreshOutlined as RefreshIcon,
  WarningAmberOutlined as WarningIcon,
} from "@mui/icons-material";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Paper,
  Select,
  Snackbar,
  Step,
  StepButton,
  StepLabel,
  Stepper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import * as React from "react";
import { useParams } from "react-router-dom";
import { MaterialAddRequestMaterialTypeEnum } from "../../services/index.ts";
import apiClient from "../../utils/api.ts";
import { AdminPage, AdminPageHeader } from "../../components/AdminPage/index.ts";

interface BatchFile {
  id: string;
  file: File;
  fileName: string;
  materialType: MaterialAddRequestMaterialTypeEnum;
  availableDate: string;
  status: 'pending' | 'uploading' | 'chunking' | 'describing' | 'embedding' | 'completed' | 'error';
  materialId?: string;
  documentId?: string;
  chunkJobId?: string;
  error?: string;
  progress?: string;
}

interface BatchUploadProgress {
  classId: string;
  timestamp: number;
  files: Array<{
    fileName: string;
    materialType: string;
    availableDate: string;
    status: string;
    materialId?: string;
    documentId?: string;
    chunkJobId?: string;
    error?: string;
  }>;
}

export const BatchMaterialsUpload: React.FC = () => {
  const { classID = "" } = useParams();
  const [files, setFiles] = React.useState<BatchFile[]>([]);
  const [answerFiles, setAnswerFiles] = React.useState<BatchFile[]>([]);
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [openSnackbar, setOpenSnackbar] = React.useState(false);
  const [snackbarMessage, setSnackbarMessage] = React.useState("");
  const [snackbarSeverity, setSnackbarSeverity] = React.useState<"success" | "error" | "warning" | "info">("success");
  const [showWarningDialog, setShowWarningDialog] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const answerFileInputRefs = React.useRef<{ [key: string]: HTMLInputElement | null }>({});
  const steps = ["Upload Materials", "Upload Recitation Answers"];
  const [activeStep, setActiveStep] = React.useState(0);
  const [materialDocuments, setMaterialDocuments] = React.useState<Record<string, any[]>>({});
  const handleStepClick = (index: number) => {
    setActiveStep(index);
  };
  const fetchDocumentsForMaterial = async (materialId: string) => {
    try {
      const response = await apiClient.materialControllerGetListByMaterialId({ materialID: materialId });
      return response.documents; // ordered list
    } catch (err) {
      console.error("Failed to fetch documents for material:", materialId, err);
      return [];
    }
  };



  // Load progress from localStorage on mount
  React.useEffect(() => {
    const savedProgress = localStorage.getItem(`batchUpload_${classID}`);
    if (savedProgress) {
      try {
        const progress: BatchUploadProgress = JSON.parse(savedProgress);
        // Check if progress is recent (within last 24 hours)
        if (Date.now() - progress.timestamp < 24 * 60 * 60 * 1000) {
          const restoredFiles: BatchFile[] = progress.files.map((f, index) => ({
            id: `restored-${index}`,
            file: new File([], f.fileName), // Placeholder file - real file data is lost
            fileName: f.fileName,
            materialType: f.materialType as MaterialAddRequestMaterialTypeEnum,
            availableDate: f.availableDate,
            status: f.status as BatchFile['status'],
            materialId: f.materialId,
            documentId: f.documentId,
            chunkJobId: f.chunkJobId,
            error: f.error,
          }));
          setFiles(restoredFiles);

          // Check if any files were in progress - reset them since file data is lost
          const hasInProgress = restoredFiles.some(f =>
            ['uploading', 'chunking', 'describing', 'embedding'].includes(f.status)
          );
          if (hasInProgress) {
            // Reset any in-progress files to 'error' status since we lost the file data
            setFiles(prev => prev.map(f =>
              ['uploading', 'chunking', 'describing', 'embedding'].includes(f.status)
                ? { ...f, status: 'error' as const, error: 'File data lost - please re-select the file', progress: undefined }
                : f
            ));
            setSnackbarMessage("Previous session restored. Files that were processing need to be re-selected due to browser limitations.");
            setSnackbarSeverity("warning");
            setOpenSnackbar(true);
          }
        }
      } catch (error) {
        console.error("Failed to restore batch upload progress:", error);
      }
    }
  }, [classID]);

  // loadDocuments() from backend (used to fetch documents for recitation materials)
  React.useEffect(() => {
    const loadDocuments = async () => {
      const materialIds = files
        .filter(f => f.materialType === MaterialAddRequestMaterialTypeEnum.Recitation)
        .map(f => f.materialId)
        .filter((id): id is string => Boolean(id));

      const uniqueMaterialIds = Array.from(new Set(materialIds));

      const entries = await Promise.all(
        uniqueMaterialIds.map(async (id) => {
          const docs = await fetchDocumentsForMaterial(id);
          return [id, docs] as const;
        })
      );

      setMaterialDocuments(Object.fromEntries(entries));
    };

    loadDocuments();
  }, [files, answerFiles]);

  // Save progress to localStorage whenever files change
  React.useEffect(() => {
    if (files.length > 0) {
      const progress: BatchUploadProgress = {
        classId: classID,
        timestamp: Date.now(),
        files: files.map(f => ({
          fileName: f.fileName,
          materialType: f.materialType,
          availableDate: f.availableDate,
          status: f.status,
          materialId: f.materialId,
          documentId: f.documentId,
          chunkJobId: f.chunkJobId,
          error: f.error,
        })),
      };
      localStorage.setItem(`batchUpload_${classID}`, JSON.stringify(progress));
    }
  }, [files, classID]);


  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = event.target.files;
    if (selectedFiles) {
      const newFiles: BatchFile[] = Array.from(selectedFiles)
        .filter(file => file.type === "application/pdf")
        .map((file, index) => ({
          id: `${Date.now()}-${index}`,
          file,
          fileName: file.name,
          materialType: MaterialAddRequestMaterialTypeEnum.ClassMaterials,
          availableDate: new Date().toISOString().split('T')[0],
          status: 'pending',
        }));

      setFiles(prev => [...prev, ...newFiles]);

      if (newFiles.length !== selectedFiles.length) {
        setSnackbarMessage("Only PDF files are accepted");
        setSnackbarSeverity("warning");
        setOpenSnackbar(true);
      }
    }
  };
  const handleAnswerFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
    recitationMaterial: BatchFile
  ) => {
    const selected = event.target.files?.[0];
    if (!selected || selected.type !== "application/pdf") return;

    const newAnswerFile: BatchFile = {
      id: `answer-${Date.now()}`,
      file: selected,
      fileName: selected.name,
      materialType: MaterialAddRequestMaterialTypeEnum.Recitation,
      availableDate: recitationMaterial.availableDate,
      status: "pending",
      materialId: recitationMaterial.materialId, // crucial: use same materialId
    };

    setAnswerFiles(prev => [...prev, newAnswerFile]);

    // Reset input so re-uploading same file works
    if (answerFileInputRefs.current[recitationMaterial.id]) {
      answerFileInputRefs.current[recitationMaterial.id]!.value = "";
    }
  };

  const handleRemoveFile = (fileId: string) => {
    setFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const handleRemoveAnswerFile = (fileId: string) => {
    setAnswerFiles(prev => prev.filter(f => f.id !== fileId));
  };


  const handleMaterialTypeChange = (fileId: string, materialType: MaterialAddRequestMaterialTypeEnum) => {
    setFiles(prev => prev.map(f =>
      f.id === fileId ? { ...f, materialType } : f
    ));
  };

  const handleDateChange = (fileId: string, date: string) => {
    setFiles(prev => prev.map(f =>
      f.id === fileId ? { ...f, availableDate: date } : f
    ));
  };

  const updateFileStatus = (fileId: string, updates: Partial<BatchFile>, isAnswerFile = false) => {
    if (isAnswerFile) {
      setAnswerFiles(prev => prev.map(f =>
        f.id === fileId ? { ...f, ...updates } : f
      ));
    } else {
      setFiles(prev => prev.map(f =>
        f.id === fileId ? { ...f, ...updates } : f
      ));
    }
  };


  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const processFile = async (file: BatchFile, isAnswerFile = false): Promise<void> => {
    try {
      // Check if this is a placeholder file (no actual file data)
      if (file.file.size === 0) {
        throw new Error("File data is missing - please re-select the file");
      }

      let materialId = file.materialId;
      let documentId = file.documentId;
      let chunkJobId = file.chunkJobId;

      // Step 1: Create material (skip if already done)
      if (!materialId) {
        updateFileStatus(file.id, { status: 'uploading', progress: 'Creating material...' }, isAnswerFile);

        const materialResponse = await apiClient.materialControllerAdd({
          materialAddRequest: {
            classId: classID,
            materialType: file.materialType,
            availableDate: new Date(file.availableDate),
          },
        });

        console.log("Material creation response:", materialResponse);

        if (!materialResponse.classMaterialId) {
          throw new Error("Failed to create material");
        }

        materialId = materialResponse.classMaterialId;
        updateFileStatus(file.id, { materialId, progress: 'Material created successfully' }, isAnswerFile);
      } else {
        updateFileStatus(file.id, { progress: 'Using existing material...' }, isAnswerFile);
      }

      // Step 2: Upload document (skip if already done)
      if (!documentId) {
        updateFileStatus(file.id, { progress: 'Uploading document...' }, isAnswerFile);

        const uploadResponse = await apiClient.documentControllerUpload({
          file: file.file,
          classMaterialId: materialId,
        });

        if (!uploadResponse.document?.id) {
          throw new Error("Failed to upload document");
        }

        documentId = uploadResponse.document.id;
        updateFileStatus(file.id, { documentId, status: 'chunking', progress: 'Document uploaded successfully' }, isAnswerFile);
      } else {
        updateFileStatus(file.id, { status: 'chunking', progress: 'Using existing document...' });
      }

      // Step 3: Start chunking (skip if already done)
      if (!chunkJobId) {
        updateFileStatus(file.id, { progress: 'Starting chunking job...' }, isAnswerFile);

        const chunkResponse = await apiClient.documentControllerChunk({
          chunkRequest: { id: documentId },
        });

        if (!chunkResponse.jobId) {
          throw new Error("Failed to start chunking job");
        }

        chunkJobId = chunkResponse.jobId;
        updateFileStatus(file.id, { chunkJobId, progress: 'Chunking job started' }, isAnswerFile);
      } else {
        updateFileStatus(file.id, { progress: 'Resuming chunking job...' }, isAnswerFile);
      }

      // Step 4: Poll for chunk completion
      let chunkCompleted = false;
      let pollAttempts = 0;
      const maxPollAttempts = 60; // 5 minutes max

      while (!chunkCompleted && pollAttempts < maxPollAttempts) {
        await sleep(5000); // Wait 5 seconds between polls

        try {
          const statusResponse = await apiClient.documentControllerChunkStatus({
            chunkQueueRequest: { jobId: chunkJobId },
          });

          console.log("Chunk status response:", statusResponse);

          if (statusResponse.message?.includes('completed') || statusResponse.message?.includes('finished')) {
            chunkCompleted = true;
          } else if (statusResponse.message?.includes('failed') || statusResponse.message?.includes('error')) {
            throw new Error(`Chunking failed: ${statusResponse.message}`);
          }

          updateFileStatus(file.id, { progress: `Chunking: ${statusResponse.message}` }, isAnswerFile);
        } catch (error) {
          console.error("Error checking chunk status:", error);
          updateFileStatus(file.id, { progress: `Error checking chunk status: ${error}` }, isAnswerFile);
          throw error;
        }

        pollAttempts++;
      }

      if (!chunkCompleted) {
        throw new Error("Chunking timed out");
      }

      // Step 5: Describe document
      updateFileStatus(file.id, { status: 'describing', progress: 'Describing document...' }, isAnswerFile);

      await apiClient.documentControllerDescribe({
        chunkRequest: { id: documentId },
      });

      // Step 6: Embed document
      updateFileStatus(file.id, { status: 'embedding', progress: 'Embedding document...' }, isAnswerFile);

      await apiClient.documentControllerEmbed({
        chunkRequest: { id: documentId },
      });

      // Complete!
      updateFileStatus(file.id, { status: 'completed', progress: 'Completed successfully' }, isAnswerFile);

    } catch (error: any) {
      const errorMessage = error.message || "Unknown error occurred";
      updateFileStatus(file.id, {
        status: 'error',
        error: errorMessage,
        progress: `Error: ${errorMessage}`
      }, isAnswerFile);
      throw error;
    }
  };


  const handleStartBatchProcess = async () => {
    const pendingFiles = files.filter(f => f.status === 'pending' || f.status === 'error');

    if (pendingFiles.length === 0) {
      setSnackbarMessage("No files to process");
      setSnackbarSeverity("warning");
      setOpenSnackbar(true);
      return;
    }

    setShowWarningDialog(true);
  };

  const confirmBatchProcess = async () => {
    setShowWarningDialog(false);
    setIsProcessing(true);

    const pendingFiles = files.filter(f => f.status === 'pending' || f.status === 'error');

    // Process files sequentially to avoid overwhelming the server
    for (const file of pendingFiles) {
      try {
        await processFile(file);
      } catch (error) {
        console.error(`Failed to process ${file.fileName}:`, error);
      }
    }

    setIsProcessing(false);

    // Show completion summary
    const successCount = files.filter(f => f.status === 'completed').length;
    const errorCount = files.filter(f => f.status === 'error').length;

    setSnackbarMessage(`Batch processing completed: ${successCount} successful, ${errorCount} failed`);
    setSnackbarSeverity(errorCount === 0 ? "success" : "warning");
    setOpenSnackbar(true);
  };

  const handleStartAnswerBatchProcess = async () => {
    const pendingAnswers = answerFiles.filter(f => f.status === 'pending' || f.status === 'error');

    if (pendingAnswers.length === 0) {
      setSnackbarMessage("No recitation answer files to process");
      setSnackbarSeverity("warning");
      setOpenSnackbar(true);
      return;
    }

    setIsProcessing(true);

    for (const file of pendingAnswers) {
      try {
        await processFile(file, true);
      } catch (error) {
        console.error(`Failed to process recitation answer file ${file.fileName}:`, error);
      }
    }

    setIsProcessing(false);

    const successCount = answerFiles.filter(f => f.status === 'completed').length;
    const errorCount = answerFiles.filter(f => f.status === 'error').length;

    setSnackbarMessage(`Recitation answer processing completed: ${successCount} successful, ${errorCount} failed`);
    setSnackbarSeverity(errorCount === 0 ? "success" : "warning");
    setOpenSnackbar(true);
  };


  const handleRetryFile = async (fileId: string) => {
    const file = files.find(f => f.id === fileId);
    if (file) {
      updateFileStatus(fileId, { status: 'pending', error: undefined, progress: undefined });
    }
  };

  const exportToCSV = () => {
    const csvHeaders = "FileName,MaterialType,AvailableDate,Status,MaterialId,DocumentId,Error\n";
    const csvData = files.map(file =>
      `"${file.fileName}","${file.materialType}","${file.availableDate}","${file.status}","${file.materialId || ''}","${file.documentId || ''}","${file.error || ''}"`
    ).join('\n');

    const csvContent = csvHeaders + csvData;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');

    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `batch_materials_${classID}_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const clearCompleted = () => {
    setFiles(prev => prev.filter(f => f.status !== 'completed'));
    localStorage.removeItem(`batchUpload_${classID}`);
  };

  const clearAllAndReset = () => {
    setFiles([]);
    localStorage.removeItem(`batchUpload_${classID}`);
    setSnackbarMessage("All data cleared. You can start fresh.");
    setSnackbarSeverity("info");
    setOpenSnackbar(true);
  };

  const getStatusColor = (status: BatchFile['status']) => {
    switch (status) {
      case 'pending': return 'default';
      case 'uploading':
      case 'chunking':
      case 'describing':
      case 'embedding': return 'info';
      case 'completed': return 'success';
      case 'error': return 'error';
      default: return 'default';
    }
  };



  return (
    <AdminPage>
      {/* Stepper Bar */}
      <AdminPageHeader
        title="Batch Upload Materials"
        description="Upload and process multiple class materials in one batch."
      />
      <Stepper nonLinear activeStep={activeStep} sx={{ pb: 3 }}>
        {steps.map((label, index) => (
          <Step key={label}>
            <StepButton onClick={() => handleStepClick(index)}>
              <StepLabel>{label}</StepLabel>
            </StepButton>
          </Step>
        ))}
      </Stepper>

      {activeStep === 0 && (
        <>
          <Typography variant="h6" color="text.secondary" sx={{ mb: 2 }}>
            Step 1: Upload Lecture and Recitation Worksheets
          </Typography>
          {isProcessing && (
            <Alert severity="warning" sx={{ mb: 3 }} icon={<WarningIcon />}>
              Processing files... Please do not leave this page until the process is complete.
            </Alert>
          )}

          <Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="application/pdf"
              style={{ display: 'none' }}
              onChange={handleFileSelect}
            />

            <Button
              variant="contained"
              startIcon={<CloudUploadIcon />}
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
            >
              Select PDF Files
            </Button>

            <Button
              variant="contained"
              color="success"
              startIcon={isProcessing ? <CircularProgress size={20} /> : <PlayArrowIcon />}
              onClick={handleStartBatchProcess}
              disabled={isProcessing || files.length === 0}
            >
              {isProcessing ? 'Processing...' : 'Start Batch Process'}
            </Button>

            {files.length > 0 && (
              <>
                <Button
                  variant="outlined"
                  startIcon={<DownloadIcon />}
                  onClick={exportToCSV}
                >
                  Export CSV
                </Button>

                <Button
                  variant="outlined"
                  color="secondary"
                  onClick={clearCompleted}
                  disabled={isProcessing}
                >
                  Clear Completed
                </Button>

                <Button
                  variant="outlined"
                  color="error"
                  onClick={clearAllAndReset}
                  disabled={isProcessing}
                  sx={{ ml: 1 }}
                >
                  Reset All
                </Button>
              </>
            )}
          </Box>

          {files.length > 0 && (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>File Name</TableCell>
                    <TableCell>Material Type</TableCell>
                    <TableCell>Available Date</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Progress</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {files.map((file) => (
                    <TableRow key={file.id}>
                      <TableCell>
                        {file.fileName}
                        {file.file.size === 0 && (
                          <Typography variant="caption" color="error" display="block">
                            (File data missing - re-select file)
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={file.materialType}
                          onChange={(e) => handleMaterialTypeChange(file.id, e.target.value as MaterialAddRequestMaterialTypeEnum)}
                          size="small"
                          disabled={isProcessing || file.status !== 'pending'}
                        >
                          <MenuItem value={MaterialAddRequestMaterialTypeEnum.ClassMaterials}>
                            Lecture PDF
                          </MenuItem>
                          <MenuItem value={MaterialAddRequestMaterialTypeEnum.Recitation}>
                            Recitation
                          </MenuItem>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <TextField
                          type="date"
                          value={file.availableDate}
                          onChange={(e) => handleDateChange(file.id, e.target.value)}
                          size="small"
                          disabled={isProcessing || file.status !== 'pending'}
                          slotProps={{ inputLabel: { shrink: true } }}
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={file.status}
                          color={getStatusColor(file.status)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {file.progress || file.error || '-'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {file.status === 'error' ? (
                          <IconButton
                            size="small"
                            onClick={() => handleRetryFile(file.id)}
                            disabled={isProcessing}
                            title="Retry"
                          >
                            <RefreshIcon />
                          </IconButton>
                        ) : file.status === 'pending' ? (
                          <IconButton
                            size="small"
                            onClick={() => handleRemoveFile(file.id)}
                            disabled={isProcessing}
                            title="Remove"
                          >
                            <DeleteIcon />
                          </IconButton>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {files.length === 0 && (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <CloudUploadIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary">
                No files selected
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Click "Select PDF Files" to upload multiple class materials at once
              </Typography>
            </Box>
          )}

          <Dialog open={showWarningDialog} onClose={() => setShowWarningDialog(false)}>
            <DialogTitle>Start Batch Processing?</DialogTitle>
            <DialogContent>
              <Alert severity="warning" sx={{ mt: 1 }}>
                This process will upload and process {files.filter(f => f.status === 'pending' || f.status === 'error').length} files.
                Each file will go through chunking, description, and embedding processes.
                This may take several minutes. Please do not leave this page until the process is complete.
              </Alert>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setShowWarningDialog(false)}>Cancel</Button>
              <Button onClick={confirmBatchProcess} variant="contained" color="primary">
                Start Processing
              </Button>
            </DialogActions>
          </Dialog>

          <Snackbar
            open={openSnackbar}
            autoHideDuration={6000}
            onClose={() => setOpenSnackbar(false)}
          >
            <Alert
              onClose={() => setOpenSnackbar(false)}
              severity={snackbarSeverity}
              sx={{ width: "100%" }}
            >
              {snackbarMessage}
            </Alert>
          </Snackbar>
        </>
      )}

      {activeStep === 1 && (
        <>
          <Typography variant="h6" color="text.secondary" sx={{ mb: 2 }}>
            Step 2: Upload Recitation Answers
          </Typography>
          <Box sx={{ mb: 3 }}>
            <Button
              variant="contained"
              color="success"
              startIcon={isProcessing ? <CircularProgress size={20} /> : <PlayArrowIcon />}
              onClick={handleStartAnswerBatchProcess}
              disabled={isProcessing || answerFiles.length === 0}
            >
              {isProcessing ? "Processing..." : "Start Batch Process"}
            </Button>
          </Box>

          {Object.keys(materialDocuments).length > 0 ? (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>File Name</TableCell>
                    <TableCell>Material Type</TableCell>
                    <TableCell>Available Date</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Progress</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>

                  {Object.entries(materialDocuments).map(([materialId, documents]) => (
                    <React.Fragment key={materialId}>
                      {documents.map((doc) => {
                        // Try to find the file in files or answerFiles
                        const file =
                          files.find(f => f.documentId === doc.id) ||
                          answerFiles.find(f => f.documentId === doc.id) ||
                          files.find(f => f.fileName === doc.fileName && f.materialId === materialId) ||
                          answerFiles.find(f => f.fileName === doc.fileName && f.materialId === materialId);

                        if (!file) return null;

                        const isAnswer = answerFiles.some(f => f.id === file.id);

                        return (
                          <TableRow key={file.id}>
                            <TableCell>{file.fileName}</TableCell>
                            <TableCell>{isAnswer ? "Recitation (answer)" : "Recitation"}</TableCell>
                            <TableCell>{file.availableDate}</TableCell>
                            <TableCell>
                              <Chip
                                label={file.status}
                                color={getStatusColor(file.status)}
                                size="small"
                              />
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" color="text.secondary">
                                {file.progress || file.error || "-"}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              {isAnswer ? (
                                <IconButton
                                  size="small"
                                  onClick={() => handleRemoveAnswerFile(file.id)}
                                  title="Remove"
                                >
                                  <DeleteIcon />
                                </IconButton>
                              ) : (
                                <>
                                  <Button
                                    size="small"
                                    variant="outlined"
                                    onClick={() => answerFileInputRefs.current[file.id]?.click()}
                                  >
                                    Upload Answer
                                  </Button>
                                  <input
                                    type="file"
                                    accept="application/pdf"
                                    hidden
                                    ref={el => {
                                      answerFileInputRefs.current[file.id] = el;
                                    }}
                                    onChange={(e) => handleAnswerFileUpload(e, file)}
                                  />
                                </>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      {/* Render new local answer files (no documentId yet) */}
                      {answerFiles
                        .filter(f => f.materialId === materialId && !f.documentId)
                        .map((file) => (
                          <TableRow key={file.id}>
                            <TableCell>{file.fileName}</TableCell>
                            <TableCell>Recitation (answer)</TableCell>
                            <TableCell>{file.availableDate}</TableCell>
                            <TableCell>
                              <Chip label={file.status} color={getStatusColor(file.status)} size="small" />
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" color="text.secondary">
                                {file.progress || file.error || "-"}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <IconButton size="small" onClick={() => handleRemoveAnswerFile(file.id)} title="Remove">
                                <DeleteIcon />
                              </IconButton>
                            </TableCell>
                          </TableRow>
                        ))}
                    </React.Fragment>
                  ))}

                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Typography variant="body2" color="text.secondary">
              No completed recitation materials found.
            </Typography>
          )}
        </>
      )}

    </AdminPage>
  );
}
