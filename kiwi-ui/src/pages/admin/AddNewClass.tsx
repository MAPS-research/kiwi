import * as React from "react";
import { useNavigate } from "react-router-dom";
import {
  AddOutlined as AddIcon,
  CloseOutlined as CloseIcon,
  CloudUploadOutlined as CloudUploadIcon,
} from "@mui/icons-material";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import apiClient from "../../utils/api.ts";
import ClassCard from "../../components/ClassCard/ClassCard.tsx";
import { CREATE_NEW_CLASS_LABEL } from "../../constants/classCopy.ts";

interface AddNewClassDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated?: () => void | Promise<void>;
}

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Please try again.";
};

export const AddNewClassDialog: React.FC<AddNewClassDialogProps> = ({
  open,
  onClose,
  onCreated,
}) => {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("sm"));
  const [className, setClassName] = React.useState("");
  const [professorName, setProfessorName] = React.useState("");
  const [professorEmail, setProfessorEmail] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [snippetImageUrl, setSnippetImageUrl] = React.useState<string | null>(
    null,
  );
  const [snippetImageServerKey, setSnippetImageServerKey] = React.useState<
    string | null
  >(null);
  const [uploadingImage, setUploadingImage] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const resetForm = React.useCallback(() => {
    setClassName("");
    setProfessorName("");
    setProfessorEmail("");
    setDescription("");
    setSnippetImageUrl(null);
    setSnippetImageServerKey(null);
    setUploadingImage(false);
    setSubmitting(false);
    setError(null);
  }, []);

  React.useEffect(() => {
    if (!open) {
      resetForm();
    }
  }, [open, resetForm]);

  React.useEffect(() => {
    return () => {
      if (snippetImageUrl) {
        URL.revokeObjectURL(snippetImageUrl);
      }
    };
  }, [snippetImageUrl]);

  const handleClose = () => {
    if (!submitting && !uploadingImage) {
      onClose();
    }
  };

  const handleImageUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    setUploadingImage(true);
    setError(null);

    try {
      const response = await apiClient.classControllerUploadImage({ file });
      setSnippetImageUrl(URL.createObjectURL(file));
      setSnippetImageServerKey(response.key);
    } catch (uploadError) {
      console.error("Error uploading class image", uploadError);
      setError(
        `The course image could not be uploaded. ${getErrorMessage(uploadError)}`,
      );
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      await apiClient.classControllerAdd({
        classAddRequest: {
          classDetails: {
            className: className.trim(),
            professorName: professorName.trim(),
            professorEmail: professorEmail.trim(),
            description: description.trim(),
            imageSnippetUrl: snippetImageServerKey || undefined,
          },
        },
      });
      await onCreated?.();
      onClose();
    } catch (submitError) {
      console.error("Error adding new class", submitError);
      setError(
        `The class could not be created. ${getErrorMessage(submitError)}`,
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      fullScreen={fullScreen}
      aria-labelledby="add-new-class-title"
      slotProps={{
        paper: {
          sx: {
            maxHeight: { sm: "calc(100% - 48px)" },
          },
        },
      }}
    >
      <DialogTitle
        id="add-new-class-title"
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 2,
          pr: 1,
        }}
      >
        <Typography component="span" variant="h6">
          {CREATE_NEW_CLASS_LABEL}
        </Typography>
        <IconButton
          aria-label="Close create new class dialog"
          onClick={handleClose}
          disabled={submitting || uploadingImage}
          sx={{ minWidth: 44, minHeight: 44 }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ px: { xs: 2, sm: 3 }, py: 3 }}>
        <Box
          id="add-new-class-form"
          component="form"
          onSubmit={handleSubmit}
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "minmax(0, 1fr)",
              md: "minmax(0, 1fr) 280px",
            },
            gap: { xs: 4, md: 5 },
            alignItems: "start",
          }}
        >
          <Stack
            data-testid="class-form-column"
            spacing={3}
            sx={{ minWidth: 0 }}
          >
            <Box
              component="section"
              aria-labelledby="new-class-information-heading"
            >
              <Typography
                id="new-class-information-heading"
                component="h3"
                variant="subtitle1"
                sx={{ fontWeight: 600, mb: 2 }}
              >
                Basic information
              </Typography>
              <Stack spacing={2.5}>
                <TextField
                  required
                  fullWidth
                  id="class-name"
                  label="Class Name"
                  name="class-name"
                  autoFocus
                  value={className}
                  onChange={(event) => setClassName(event.target.value)}
                  disabled={submitting}
                />
                <TextField
                  required
                  fullWidth
                  id="professor-name"
                  label="Professor Name"
                  name="professor-name"
                  value={professorName}
                  onChange={(event) => setProfessorName(event.target.value)}
                  disabled={submitting}
                />
                <TextField
                  required
                  fullWidth
                  type="email"
                  id="professor-email"
                  label="Professor Email"
                  name="professor-email"
                  autoComplete="email"
                  value={professorEmail}
                  onChange={(event) => setProfessorEmail(event.target.value)}
                  disabled={submitting}
                />
                <TextField
                  fullWidth
                  id="description"
                  label="Description"
                  name="description"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  disabled={submitting}
                  multiline
                  rows={3}
                />
              </Stack>
            </Box>

            <Box component="section" aria-labelledby="new-class-image-heading">
              <Typography
                id="new-class-image-heading"
                component="h3"
                variant="subtitle1"
                sx={{ fontWeight: 600, mb: 0.5 }}
              >
                Course image
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  color: "text.secondary",
                  mb: 1.5
                }}>
                PNG, JPG, JPEG, or WebP. Used as the cover image on the class
                card.
              </Typography>
              <Button
                component="label"
                variant="outlined"
                startIcon={
                  uploadingImage ? (
                    <CircularProgress size={18} />
                  ) : (
                    <CloudUploadIcon />
                  )
                }
                disabled={submitting || uploadingImage}
                sx={{ minHeight: 44, textTransform: "none" }}
              >
                {uploadingImage
                  ? "Uploading…"
                  : snippetImageUrl
                    ? "Replace image"
                    : "Upload image"}
                <input
                  accept=".png,.jpg,.jpeg,.webp"
                  type="file"
                  hidden
                  onChange={handleImageUpload}
                />
              </Button>
            </Box>

            {error && (
              <Alert severity="error" role="alert">
                {error}
              </Alert>
            )}
          </Stack>

          <Box
            component="aside"
            data-testid="class-preview-column"
            aria-labelledby="new-class-preview-heading"
            sx={{ minWidth: 0 }}
          >
            <Typography
              id="new-class-preview-heading"
              component="h3"
              variant="subtitle1"
              sx={{ fontWeight: 600 }}
            >
              Class preview
            </Typography>
            <Typography
              variant="body2"
              sx={{
                color: "text.secondary",
                mt: 0.5,
                mb: 2
              }}>
              This is how the class will appear in the list.
            </Typography>
            <ClassCard
              title={className}
              instructor={professorName}
              imageUrl={snippetImageUrl}
              hoverable
            />
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: { xs: 2, sm: 3 }, py: 2, gap: 1 }}>
        <Button
          variant="outlined"
          onClick={handleClose}
          disabled={submitting || uploadingImage}
          sx={{ minHeight: 44, textTransform: "none" }}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          form="add-new-class-form"
          variant="contained"
          startIcon={
            submitting ? (
              <CircularProgress color="inherit" size={18} />
            ) : (
              <AddIcon />
            )
          }
          disabled={submitting || uploadingImage}
          sx={{ minHeight: 44, textTransform: "none" }}
        >
          {submitting ? "Creating…" : CREATE_NEW_CLASS_LABEL}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

/**
 * Keeps the existing /admin/new-class route working while presenting the form
 * with the same modal interaction used by the Classes page.
 */
export const AddNewClass: React.FC = () => {
  const navigate = useNavigate();

  return (
    <AddNewClassDialog
      open
      onClose={() => navigate("/admin/classes")}
      onCreated={() => navigate("/admin/classes")}
    />
  );
};
