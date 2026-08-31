import { CloudUploadOutlined as CloudUpload } from "@mui/icons-material";
import {
  Button,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Alert,
  Chip,
  Box,
  Typography,
} from "@mui/material";
import React, { useCallback, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { DocumentForListing } from "../../services/models/DocumentForListing.ts";
import apiClient from "../../utils/api.ts";
import { ThumbnailViewer } from "../../components/ThumbnailViewer/ThumbnailViewer.tsx";
import { Material } from "../../services/models/Material.ts";
import { MaterialEditRequestMaterialTypeEnum } from "../../services/models/MaterialEditRequest.ts";
import { AdminPage, AdminPageHeader } from "../../components/AdminPage/index.ts";

type DocWithFlags = DocumentForListing & {
  isStudent?: boolean;
  isLlm?: boolean;
};

export const ProfessorInterface: React.FC = () => {
  const [documentUploaded, setDocumentUploaded] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [materialType, setMaterialType] =
    useState<MaterialEditRequestMaterialTypeEnum>("class materials");
  const [availableDate, setAvailableDate] = useState<Date>(new Date());
  const classID = useLocation().pathname.split("/")[2];
  const materialID = useLocation().pathname.split("/").pop() || "";
  const [documents, setDocuments] = React.useState<DocWithFlags[]>();
  const [materialInfo, setMaterialInfo] = React.useState<Material>();
  console.log("classID", classID);
  console.log("materialID", materialID);

  const navigate = useNavigate();

  const handleDocumentUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (file) {
      // Handle the file upload logic here
      console.log("file uploaded by the professor", file);
      try {
        const res = await apiClient.documentControllerUpload({
          file: file,
          classMaterialId: materialID,
        });
        if (res) {
          console.log(res);
          setDocumentUploaded(true);
          fetchDocumentList();
        }
      } catch (error) {
        console.error("Error uploading document", error);
      }
    }
  };

  const fetchDocumentList = useCallback(async () => {
    try {
      const { documents } =
        await apiClient.materialControllerGetListByMaterialId({
          materialID: materialID,
        });
      console.log("documents: ", documents);
      setDocuments(documents as DocWithFlags[]);
    } catch (error) {
      console.log("error fetching class material", error);
    }
  }, [materialID]);

  // Get details of the class material
  const fetchMaterialInfo = useCallback(
    async (materialID: string) => {
      try {
        const materials = await apiClient.materialControllerList({
          materialListRequest: { classId: classID },
        });
        const material = materials.materials.find(
          (material) => material.id === materialID
        );
        setMaterialInfo(material);
        if (material) {
          setAvailableDate(material.availableDate);
          setMaterialType(
            material.materialType as MaterialEditRequestMaterialTypeEnum
          );
        }
      } catch (error) {
        console.error("Error fetching class material", error);
      }
    },
    [classID]
  );

  React.useEffect(() => {
    fetchDocumentList();

    fetchMaterialInfo(materialID);
  }, [fetchDocumentList, fetchMaterialInfo, materialID]);

  const handleEditMaterial = async () => {
    try {
      const res = await apiClient.materialControllerEdit({
        materialEditRequest: {
          materialId: materialID,
          materialType: materialType,
          availableDate: availableDate,
        },
      });
      if (res) {
        console.log(res);
        setEditMode(false);
        fetchMaterialInfo(materialID);
      }
    } catch (error) {
      console.error("Error editing material", error);
    }
  };

  const handleDeleteMaterial = async () => {
    try {
      await apiClient.materialControllerDelete({
        materialDeleteRequest: {
          materialId: materialID,
        },
      });
      // Redirect to class material list page
      navigate(`/admin/class/${classID}`);
    } catch (error) {
      console.error("Error deleting material", error);
    }
  };

  const handleDeleteDocument = async (documentId: string) => {
    try {
      await apiClient.documentControllerDelete({
        documentDeleteRequestDto: {
          documentId: documentId,
        },
      });
      // Refresh document list
      fetchDocumentList();
    } catch (error) {
      console.error("Error deleting document", error);
    }
  };

  // PATCH /document/{id}/flags
  const patchDocumentFlags = async (
    docId: string,
    payload: { materialId: string; isStudent: boolean; isLlm: boolean }
  ) => {
    return apiClient.documentControllerSetFlags({
      id: docId,
      setDocumentFlagsDto: payload,
    });
  };

  const handleFlagChange = async (
    doc: { id: string; isStudent?: boolean; isLlm?: boolean },
    field: "isStudent" | "isLlm",
    nextValue: boolean
  ) => {
    const nextPayload = {
      materialId: materialID,
      isStudent: field === "isStudent" ? nextValue : !!doc.isStudent,
      isLlm:     field === "isLlm"     ? nextValue : !!doc.isLlm,
    };

    try {
      // Optimistic UI: if enabling isStudent here, disable it elsewhere
      setDocuments(prev =>
        prev?.map(d => {
          if (d.id !== doc.id) {
            return field === "isStudent" && nextValue ? { ...d, isStudent: false } : d;
          }
          return { ...d, ...nextPayload };
        })
      );

      await patchDocumentFlags(doc.id, nextPayload);

      // Re-sync with backend (guarantees we reflect server rules)
      fetchDocumentList();
    } catch (e) {
      console.error("Error patching document flags", e);
      // Revert by re-fetching on error
      fetchDocumentList();
    }
  };



  return (
    <AdminPage maxWidth="xl">
      <AdminPageHeader
        title="Material Management"
        description={`Manage documents for material ${materialInfo?.id || materialID}.`}
        back={{ label: "Class overview", onClick: () => navigate(`/admin/class/${classID}`) }}
      />
      {editMode ? (
        <div>
          <FormControl>
            <InputLabel id="material-type-label">Material Type</InputLabel>
            <Select
              labelId="material-type-label"
              label="Material Type"
              value={materialType}
              onChange={(e) =>
                setMaterialType(
                  e.target.value as MaterialEditRequestMaterialTypeEnum
                )
              }
            >
              {Object.values(MaterialEditRequestMaterialTypeEnum).map(
                (value) => (
                  <MenuItem key={value} value={value}>
                    {value}
                  </MenuItem>
                )
              )}
            </Select>
          </FormControl>
          <TextField
            label="Available Date"
            type="date"
            value={availableDate.toISOString().split("T")[0]}
            onChange={(e) => setAvailableDate(new Date(e.target.value))}
          />
          <Button variant="contained" onClick={handleEditMaterial}>
            Save Changes
          </Button>
        </div>
      ) : (
        <div>
          <Button variant="contained" onClick={() => setEditMode(true)}>
            Edit Material
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleDeleteMaterial}
          >
            Delete Material
          </Button>
        </div>
      )}
      <Typography variant="h6" component="h2" sx={{ mt: 3, mb: 1 }}>
        Upload file for {materialInfo?.materialType || "this material"}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        This class material will be available after{" "}
        {materialInfo?.availableDate.toDateString()}
      </Typography>
      <Button
        component="label"
        variant="contained"
        startIcon={<CloudUpload />}
      >
        Upload file
        <input
          accept=".pdf, .doc, .docx. .ppt, .pptx .png, .jpg, .jpeg"
          type="file"
          style={{ display: "none" }}
          onChange={handleDocumentUpload}
        />
      </Button>
      <div className="documents">
        <Typography variant="subtitle1" component="h2" sx={{ mt: 3, mb: 2 }}>
          Documents
        </Typography>
        <Grid container columns={{ xs: 4, sm: 8, md: 12 }}>
          {documents &&
            documents.map((document, index) => {
              return (
                <Grid
                  key={index}
                  size={{
                    xs: 2,
                    sm: 4,
                    md: 4
                  }}>
                <div style={{ position: "relative", textAlign: "center" }}>
                  {/* Top-right flags */}
                  <Box
                    onClick={(e) => { e.stopPropagation(); }}
                    sx={{
                      position: "absolute",
                      top: 8,
                      right: 8,
                      display: "flex",
                      gap: 1,
                      zIndex: 1,
                    }}
                  >
                    {/* Student Visible */}
                    <FormControl size="small" sx={{ minWidth: 160 }}>
                      <InputLabel id={`student-visible-${document.id}`}>Student Visible</InputLabel>
                      <Select
                        labelId={`student-visible-${document.id}`}
                        label="Student Visible"
                        value={String(!!document.isStudent)}
                        onChange={(e) => handleFlagChange(document, "isStudent", e.target.value === "true")}
                        renderValue={(v) => (
                          <Chip
                            size="small"
                            color={v === "true" ? "success" : "default"}
                            label={v === "true" ? "Student Visible: Enabled" : "Student Visible: Disabled"}
                          />
                        )}
                      >
                        <MenuItem value="true">Enable</MenuItem>
                        <MenuItem value="false">Disable</MenuItem>
                      </Select>
                    </FormControl>

                    {/* LLM Retrieval */}
                    <FormControl size="small" sx={{ minWidth: 160 }}>
                      <InputLabel id={`llm-retrieval-${document.id}`}>LLM Retrieval</InputLabel>
                      <Select
                        labelId={`llm-retrieval-${document.id}`}
                        label="LLM Retrieval"
                        value={String(!!document.isLlm)}
                        onChange={(e) => handleFlagChange(document, "isLlm", e.target.value === "true")}
                        renderValue={(v) => (
                          <Chip
                            size="small"
                            color={v === "true" ? "success" : "default"}
                            label={v === "true" ? "LLM Retrieval: Enabled" : "LLM Retrieval: Disabled"}
                          />
                        )}
                      >
                        <MenuItem value="true">Enable</MenuItem>
                        <MenuItem value="false">Disable</MenuItem>
                      </Select>
                    </FormControl>
                  </Box>

                  {/* Keep Link ONLY around preview + title so menus/buttons are clickable */}
                  <Link
                    to={`/admin/document/${classID}/${document.id}`}
                    target="_blank"
                    style={{ textDecoration: "none", color: "inherit" }}
                  >
                    <ThumbnailViewer pdfFile={document.file} />
                    <Typography variant="subtitle2" component="h3">
                      {document.fileName}
                    </Typography>
                  </Link>

                  {/* Buttons outside the Link */}
                  <Button component="label" variant="contained">
                    Annotate PDF
                  </Button>
                  <Button
                    variant="outlined"
                    color="error"
                    style={{ marginTop: "8px" }}
                    onClick={() => handleDeleteDocument(document.id)}
                  >
                    Delete Document
                  </Button>
                </div>
                </Grid>
              );
            })}
        </Grid>
      </div>
      {documentUploaded && (
        <Alert
          severity="success"
          onClose={() => setDocumentUploaded(false)}
          style={{ position: "fixed", top: "20px", right: "700px" }}
        >
          Document uploaded successfully!
        </Alert>
      )}
    </AdminPage>
  );
};
