import {
  CloudUploadOutlined as CloudUploadIcon,
  SaveOutlined as SaveIcon
} from "@mui/icons-material";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Divider,
  FormControlLabel,
  Snackbar,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ClassCard from "../../components/ClassCard/ClassCard.tsx";
import apiClient from "../../utils/api.ts";
import { AdminPage, AdminPageHeader } from "../../components/AdminPage/index.ts";

interface ClassMetadata {
  className: string;
  professorName: string;
  professorEmail: string;
  description: string;
  imageSnippetUrl?: string;
  systemPrompts?: {
    defaultSystemMessage?: string;
    classMaterialsPrompt?: string;
    recitationPrompt?: string;
  };
}

export const ClassEdit: React.FC = () => {
  const { classID } = useParams<{ classID: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [metadata, setMetadata] = useState<ClassMetadata>({
    className: "",
    professorName: "",
    professorEmail: "",
    description: "",
    systemPrompts: {
      defaultSystemMessage: "",
      classMaterialsPrompt: "",
      recitationPrompt: "",
    },
  });

  const [hasCustomSystemPrompts, setHasCustomSystemPrompts] = useState(false);
  const [snippetImageUrl, setSnippetImageUrl] = useState<string | null>(null);
  const [snippetImageServerKey, setSnippetImageServerKey] = useState<string | null>(null);

  useEffect(() => {
    const fetchClassData = async () => {
      if (!classID) return;

      try {
        setLoading(true);
        setError(null);
        const response = await apiClient.classControllerGetByIdComplete({ classID });

        console.log("Fetched complete class data:", response);

        const { classInfo, imageSnippetServerUrl } = response;
        const { classMetadata } = classInfo;

        setMetadata({
          className: classMetadata.className || "",
          professorName: classMetadata.professorName || "",
          professorEmail: classMetadata.professorEmail || "",
          description: classMetadata.description || "",
          imageSnippetUrl: classMetadata.imageSnippetUrl,
          systemPrompts: classMetadata.systemPrompts || {
            defaultSystemMessage: "",
            classMaterialsPrompt: "",
            recitationPrompt: "",
          },
        });

        setHasCustomSystemPrompts(!!classMetadata.systemPrompts && (
          !!classMetadata.systemPrompts.defaultSystemMessage ||
          !!classMetadata.systemPrompts.classMaterialsPrompt ||
          !!classMetadata.systemPrompts.recitationPrompt
        ));

        if (imageSnippetServerUrl) {
          setSnippetImageUrl(imageSnippetServerUrl);
          // Don't set snippetImageServerKey - we'll only set it when user uploads a new image
          // The original imageSnippetUrl in metadata should be preserved for resubmission
        }
      } catch (error) {
        console.error("Error fetching class data:", error);
        setError("Failed to load class data. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchClassData();
  }, [classID]);

  const handleDocumentUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      try {
        const res = await apiClient.documentControllerUploadNoMaterialId({
          file: file,
          classMaterialId: "",
        });
        if (res) {
          const imageUrl = URL.createObjectURL(file);
          setSnippetImageUrl(imageUrl);
          setSnippetImageServerKey(res.document.id);
        }
      } catch (error) {
        console.error("Error uploading document", error);
        setError("Failed to upload image. Please try again.");
      }
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!classID) return;

    try {
      setSaving(true);
      setError(null);

      const classDetails: any = {
        className: metadata.className,
        professorName: metadata.professorName,
        professorEmail: metadata.professorEmail,
        description: metadata.description,
      };

      // Handle image: use new upload if available, otherwise preserve existing
      if (snippetImageServerKey) {
        // User uploaded a new image
        classDetails.imageSnippetUrl = snippetImageServerKey;
      } else if (metadata.imageSnippetUrl) {
        // No new image, preserve existing imageSnippetUrl from metadata
        classDetails.imageSnippetUrl = metadata.imageSnippetUrl;
      }

      if (hasCustomSystemPrompts) {
        classDetails.systemPrompts = {
          defaultSystemMessage: metadata.systemPrompts?.defaultSystemMessage || "",
          classMaterialsPrompt: metadata.systemPrompts?.classMaterialsPrompt || "",
          recitationPrompt: metadata.systemPrompts?.recitationPrompt || "",
        };
      }

      await apiClient.classControllerUpdateMetadata({
        classUpdateMetadataRequest: {
          classId: classID,
          classDetails,
        },
      });

      setSuccessMessage("Class metadata updated successfully!");
      setTimeout(() => {
        navigate(`/admin/class/${classID}`);
      }, 1500);
    } catch (error) {
      console.error("Error updating class metadata:", error);
      setError("Failed to update class metadata. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleSystemPromptsToggle = (enabled: boolean) => {
    setHasCustomSystemPrompts(enabled);
    if (!enabled) {
      setMetadata(prev => ({
        ...prev,
        systemPrompts: {
          defaultSystemMessage: "",
          classMaterialsPrompt: "",
          recitationPrompt: "",
        },
      }));
    }
  };

  const classManagementPath = classID ? `/admin/class/${classID}` : "/admin/classes";

  if (loading) {
    return (
      <AdminPage maxWidth="lg">
        <AdminPageHeader
          title="Edit Class"
          description="Update course details, imagery, and assistant behavior."
        />
        <Box
          role="status"
          aria-live="polite"
          sx={{ display: "flex", alignItems: "center", gap: 1.5, py: 4 }}
        >
          <CircularProgress size={24} />
          <Typography color="text.secondary">Loading class data...</Typography>
        </Box>
      </AdminPage>
    );
  }

  return (
    <AdminPage maxWidth="lg">
      <AdminPageHeader
        title="Edit Class"
        description="Update course details, imagery, and assistant behavior."
      />

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Box component="form" onSubmit={handleSubmit} noValidate>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "minmax(0, 1fr)", lg: "minmax(0, 1fr) 320px" },
            gap: { xs: 5, lg: 7 },
            alignItems: "start",
          }}
        >
          <Box data-testid="class-form-column" sx={{ minWidth: 0 }}>
            <Box
              component="section"
              aria-labelledby="basic-information-heading"
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "minmax(0, 1fr)", md: "190px minmax(0, 1fr)" },
                gap: { xs: 2, md: 4 },
                pb: 4,
              }}
            >
              <Box>
                <Typography
                  id="basic-information-heading"
                  component="h2"
                  variant="subtitle1"
                  sx={{ fontWeight: 600 }}
                >
                  Basic information
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  The details shown to students and instructors.
                </Typography>
              </Box>

              <Stack spacing={2.5}>
                <TextField
                  fullWidth
                  required
                  label="Class Name"
                  value={metadata.className}
                  onChange={(e) => setMetadata(prev => ({ ...prev, className: e.target.value }))}
                />
                <TextField
                  fullWidth
                  required
                  label="Professor Name"
                  value={metadata.professorName}
                  onChange={(e) => setMetadata(prev => ({ ...prev, professorName: e.target.value }))}
                />
                <TextField
                  fullWidth
                  required
                  type="email"
                  label="Professor Email"
                  autoComplete="email"
                  value={metadata.professorEmail}
                  onChange={(e) => setMetadata(prev => ({ ...prev, professorEmail: e.target.value }))}
                />
                <TextField
                  fullWidth
                  label="Description"
                  value={metadata.description}
                  onChange={(e) => setMetadata(prev => ({ ...prev, description: e.target.value }))}
                  multiline
                  rows={4}
                />
              </Stack>
            </Box>

            <Divider />

            <Box
              component="section"
              aria-labelledby="course-image-heading"
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "minmax(0, 1fr)", md: "190px minmax(0, 1fr)" },
                gap: { xs: 2, md: 4 },
                py: 4,
              }}
            >
              <Box>
                <Typography
                  id="course-image-heading"
                  component="h2"
                  variant="subtitle1"
                  sx={{ fontWeight: 600 }}
                >
                  Course image
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  Used as the cover image on the class card.
                </Typography>
              </Box>

              <Box>
                <Button
                  component="label"
                  variant="outlined"
                  startIcon={<CloudUploadIcon />}
                  sx={{ textTransform: "none" }}
                >
                  {snippetImageUrl ? "Replace image" : "Upload image"}
                  <input
                    accept=".png, .jpg, .jpeg, .webp"
                    type="file"
                    hidden
                    onChange={handleDocumentUpload}
                  />
                </Button>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  PNG, JPG, JPEG, or WebP. The preview updates after upload.
                </Typography>
              </Box>
            </Box>

            <Divider />

            <Box
              component="section"
              aria-labelledby="system-prompts-heading"
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "minmax(0, 1fr)", md: "190px minmax(0, 1fr)" },
                gap: { xs: 2, md: 4 },
                py: 4,
              }}
            >
              <Box>
                <Typography
                  id="system-prompts-heading"
                  component="h2"
                  variant="subtitle1"
                  sx={{ fontWeight: 600 }}
                >
                  Custom system prompts
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  Override the default assistant instructions for this class.
                </Typography>
              </Box>

              <Box sx={{ minWidth: 0 }}>
                <FormControlLabel
                  sx={{ m: 0, mb: hasCustomSystemPrompts ? 2.5 : 0 }}
                  control={
                    <Switch
                      checked={hasCustomSystemPrompts}
                      onChange={(e) => handleSystemPromptsToggle(e.target.checked)}
                    />
                  }
                  label="Enable custom prompts"
                />

                {hasCustomSystemPrompts ? (
                  <Stack spacing={2.5}>
                    <TextField
                      fullWidth
                      label="Default System Message"
                      value={metadata.systemPrompts?.defaultSystemMessage || ""}
                      onChange={(e) => setMetadata(prev => ({
                        ...prev,
                        systemPrompts: {
                          ...prev.systemPrompts,
                          defaultSystemMessage: e.target.value,
                        },
                      }))}
                      multiline
                      rows={4}
                      helperText="Sets the default behavior for the AI assistant."
                    />
                    <TextField
                      fullWidth
                      label="Class Materials Prompt"
                      value={metadata.systemPrompts?.classMaterialsPrompt || ""}
                      onChange={(e) => setMetadata(prev => ({
                        ...prev,
                        systemPrompts: {
                          ...prev.systemPrompts,
                          classMaterialsPrompt: e.target.value,
                        },
                      }))}
                      multiline
                      rows={4}
                      helperText="Controls how the AI should use class materials."
                    />
                    <TextField
                      fullWidth
                      label="Recitation Prompt"
                      value={metadata.systemPrompts?.recitationPrompt || ""}
                      onChange={(e) => setMetadata(prev => ({
                        ...prev,
                        systemPrompts: {
                          ...prev.systemPrompts,
                          recitationPrompt: e.target.value,
                        },
                      }))}
                      multiline
                      rows={4}
                      helperText="Provides instructions for recitation and discussion sessions."
                    />
                  </Stack>
                ) : (
                  <Typography color="text.secondary" variant="body2" sx={{ mt: 1 }}>
                    Custom system prompts are disabled. The system will use default prompts.
                  </Typography>
                )}
              </Box>
            </Box>

            <Divider />
            <Box
              sx={{
                display: "flex",
                flexDirection: { xs: "column-reverse", sm: "row" },
                gap: 1.5,
                justifyContent: "flex-end",
                pt: 3,
                "& .MuiButton-root": { minHeight: 44 },
              }}
            >
              <Button
                variant="outlined"
                onClick={() => navigate(classManagementPath)}
                disabled={saving}
                sx={{ textTransform: "none" }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="contained"
                startIcon={<SaveIcon />}
                disabled={saving}
                sx={{ textTransform: "none" }}
              >
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </Box>
          </Box>

          <Box
            component="aside"
            data-testid="class-preview-column"
            aria-labelledby="class-preview-heading"
            sx={{ position: { lg: "sticky" }, top: { lg: 24 }, minWidth: 0 }}
          >
            <Typography
              id="class-preview-heading"
              component="h2"
              variant="subtitle1"
              sx={{ fontWeight: 600 }}
            >
              Class preview
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 2 }}>
              This is how the class appears in the class list.
            </Typography>
            <ClassCard
              title={metadata.className}
              instructor={metadata.professorName}
              imageUrl={snippetImageUrl}
              hoverable
            />
          </Box>
        </Box>
      </Box>

      <Snackbar
        open={!!successMessage}
        autoHideDuration={3000}
        onClose={() => setSuccessMessage(null)}
      >
        <Alert
          elevation={6}
          variant="filled"
          onClose={() => setSuccessMessage(null)}
          severity="success"
        >
          {successMessage}
        </Alert>
      </Snackbar>
    </AdminPage>
  );
};
