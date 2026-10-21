import {
  CloudUploadOutlined as CloudUploadIcon,
  SaveOutlined as SaveIcon
} from "@mui/icons-material";
import {
  Alert,
  Box,
  Button,
  FormControlLabel,
  SvgIcon,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import React, { useEffect, useId, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ClassCard from "../../components/ClassCard/ClassCard.tsx";
import apiClient from "../../utils/api.ts";
import {
  AdminFormSection,
  AdminPage,
  AdminPageHeader,
  AdminToast,
} from "../../components/AdminPage/index.ts";

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

const PAGE_TITLE = "Edit class";
const PAGE_DESCRIPTION = "Update the class details, cover image and instructions for Kiwi.";

/** Labels sit above the fields and carry no asterisk; the inputs stay required for assistive technology. */
const REQUIRED_LABEL = { inputLabel: { required: false } } as const;

/** The static dashed ring of the neutral in-progress status, beside its words (never a spinner). */
const InProgressRing = () => (
  <SvgIcon aria-hidden viewBox="0 0 16 16" sx={{ fontSize: "var(--size-icon-sm)" }}>
    <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2.4 2" />
  </SvgIcon>
);

export const ClassEdit: React.FC = () => {
  const { classID } = useParams<{ classID: string }>();
  const navigate = useNavigate();
  const previewHeadingId = useId();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedToastOpen, setSavedToastOpen] = useState(false);

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

        // Only defaultSystemMessage reaches the chat prompt; the other two
        // fields were read by the retired v1 chat and are kept as-is on save.
        setHasCustomSystemPrompts(
          !!classMetadata.systemPrompts?.defaultSystemMessage,
        );

        if (imageSnippetServerUrl) {
          setSnippetImageUrl(imageSnippetServerUrl);
          // Don't set snippetImageServerKey - we'll only set it when user uploads a new image
          // The original imageSnippetUrl in metadata should be preserved for resubmission
        }
      } catch (error) {
        console.error("Error fetching class data:", error);
        setError("Couldn't load the class. The server didn't respond as expected. Reload the page to try again.");
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
        const res = await apiClient.classControllerUploadImage({ file });
        if (res) {
          const imageUrl = URL.createObjectURL(file);
          setSnippetImageUrl(imageUrl);
          setSnippetImageServerKey(res.key);
        }
      } catch (error) {
        console.error("Error uploading document", error);
        setError(
          "Couldn't upload the cover image. The server didn't respond as expected. Your changes are still in the form. Try again, or choose a different image."
        );
      }
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    // Busy: Save says "Saving…" and ignores presses until the request settles.
    if (!classID || saving) return;

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

      setSavedToastOpen(true);
      setTimeout(() => {
        navigate(`/admin/class/${classID}`);
      }, 1500);
    } catch (error) {
      console.error("Error updating class metadata:", error);
      setError(
        "Couldn't save the class. The server didn't respond as expected. Your changes are still in the form. Check the details and try again."
      );
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
        <AdminPageHeader title={PAGE_TITLE} description={PAGE_DESCRIPTION} />
        <Box
          role="status"
          aria-live="polite"
          sx={{
            display: "flex",
            alignItems: "center",
            gap: "var(--space-2)",
            py: "var(--space-5)",
            color: "var(--in-progress-text)",
          }}
        >
          <InProgressRing />
          <Typography variant="body2" sx={{ color: "inherit" }}>
            Loading class details…
          </Typography>
        </Box>
      </AdminPage>
    );
  }

  return (
    <AdminPage maxWidth="lg">
      <AdminPageHeader title={PAGE_TITLE} description={PAGE_DESCRIPTION} />

      {error && (
        <Alert severity="error" sx={{ mb: "var(--space-5)" }}>
          {error}
        </Alert>
      )}

      {/* The form frame: one column, and from 1200 px the form beside a 320 px preview. */}
      <Box
        component="form"
        onSubmit={handleSubmit}
        noValidate
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "minmax(0, 1fr)", lg: "minmax(0, 1fr) 320px" },
          gap: "var(--space-6)",
          alignItems: "start",
        }}
      >
        <Box data-testid="class-form-column" sx={{ minWidth: 0 }}>
          {/* Sections on the canvas: a rule above the group and one under each section. */}
          <Box sx={{ borderTop: "1px solid var(--border-subtle)" }}>
            <AdminFormSection
              title="Basic information"
              description="The details shown to students and instructors."
            >
              <Box sx={{ display: "grid", gap: "var(--space-stack)" }}>
                <TextField
                  fullWidth
                  required
                  label="Class name"
                  value={metadata.className}
                  onChange={(e) => setMetadata(prev => ({ ...prev, className: e.target.value }))}
                  slotProps={REQUIRED_LABEL}
                />
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: { xs: "minmax(0, 1fr)", md: "minmax(0, 1fr) minmax(0, 1fr)" },
                    gap: "var(--space-stack)",
                  }}
                >
                  <TextField
                    fullWidth
                    required
                    label="Instructor name"
                    value={metadata.professorName}
                    onChange={(e) => setMetadata(prev => ({ ...prev, professorName: e.target.value }))}
                    slotProps={REQUIRED_LABEL}
                  />
                  <TextField
                    fullWidth
                    required
                    type="email"
                    label="Instructor email"
                    autoComplete="email"
                    value={metadata.professorEmail}
                    onChange={(e) => setMetadata(prev => ({ ...prev, professorEmail: e.target.value }))}
                    slotProps={REQUIRED_LABEL}
                  />
                </Box>
                <TextField
                  fullWidth
                  label="Description"
                  value={metadata.description}
                  onChange={(e) => setMetadata(prev => ({ ...prev, description: e.target.value }))}
                  multiline
                  rows={3}
                />
              </Box>
            </AdminFormSection>

            <AdminFormSection
              title="Cover image"
              description="Used as the cover image on the class card."
            >
              <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "var(--space-3)" }}>
                <Button
                  component="label"
                  variant="outlined"
                  startIcon={<CloudUploadIcon />}
                >
                  {snippetImageUrl ? "Replace image" : "Upload image"}
                  <input
                    accept=".png, .jpg, .jpeg, .webp"
                    type="file"
                    hidden
                    onChange={handleDocumentUpload}
                  />
                </Button>
                <Typography variant="caption" sx={{ color: "text.secondary" }}>
                  PNG, JPG, JPEG, or WebP. The preview updates after upload.
                </Typography>
              </Box>
            </AdminFormSection>

            <AdminFormSection
              title="Class-specific instructions"
              description="Added to Kiwi's built-in instructions in every chat for this class."
            >
              <Box sx={{ display: "grid", gap: "var(--space-stack)", justifyItems: "start" }}>
                {/* A selection control: the theme draws it with the selection tint, never a status colour. */}
                <FormControlLabel
                  sx={{ m: 0, columnGap: "var(--space-3)" }}
                  control={
                    <Switch
                      checked={hasCustomSystemPrompts}
                      onChange={(e) => handleSystemPromptsToggle(e.target.checked)}
                    />
                  }
                  label="Add class-specific instructions"
                  slotProps={{ typography: { variant: "subtitle2" } }}
                />

                {hasCustomSystemPrompts ? (
                  <TextField
                    fullWidth
                    label="Instructions"
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
                    helperText="Appended after Kiwi's built-in teaching and tool guidance. While an experiment is active, its variant's instructions are used instead."
                  />
                ) : (
                  <Typography variant="body2" sx={{ color: "text.secondary" }}>
                    Kiwi uses only its built-in instructions for this class.
                  </Typography>
                )}
              </Box>
            </AdminFormSection>
          </Box>

          {/* Actions: right-aligned, the tertiary Cancel and the page's one filled primary. */}
          <Box
            sx={{
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "flex-end",
              gap: "var(--space-inline)",
              pt: "var(--space-5)",
            }}
          >
            <Button
              variant="text"
              onClick={() => navigate(classManagementPath)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              startIcon={<SaveIcon />}
              aria-busy={saving || undefined}
            >
              {saving ? "Saving…" : "Save changes"}
            </Button>
          </Box>
        </Box>

        <Box
          component="aside"
          data-testid="class-preview-column"
          aria-labelledby={previewHeadingId}
          sx={{ position: { lg: "sticky" }, top: { lg: "var(--space-5)" }, minWidth: 0 }}
        >
          <Typography id={previewHeadingId} component="h2" variant="subtitle1" sx={{ mb: "var(--space-1)" }}>
            Class preview
          </Typography>
          <Typography variant="body2" sx={{ color: "text.secondary", mb: "var(--space-3)" }}>
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

      <AdminToast
        open={savedToastOpen}
        severity="success"
        message="Class saved"
        onClose={() => setSavedToastOpen(false)}
      />
    </AdminPage>
  );
};
