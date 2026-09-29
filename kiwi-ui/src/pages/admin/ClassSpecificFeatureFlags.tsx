import React, { useEffect, useState } from "react";
import { Alert, Grid } from "@mui/material";
import { useParams } from "react-router-dom";
import { FeatureResponse } from "../../services/models/index.ts";
import apiClient from "../../utils/api.ts";
import AddClassFeature from "../../components/FeatureFlags/AddClassFeature.tsx";
import ListClassFeatures from "../../components/FeatureFlags/ListClassFeatures.tsx";
import { AdminPage, AdminPageHeader } from "../../components/AdminPage/index.ts";

export const ClassSpecificFeatureFlags: React.FC = () => {
  const { classID } = useParams<{ classID: string }>();
  const [classFeatures, setClassFeatures] = useState<FeatureResponse[]>([]);
  const [className, setClassName] = useState("");

  useEffect(() => {
    if (!classID) return;

    const fetchClassInfo = async () => {
      try {
        const classEntry = await apiClient.classControllerGetById({ classID });
        setClassName(classEntry.className || classID);
      } catch (error) {
        console.error("Error fetching class info:", error);
        setClassName(classID);
      }
    };

    fetchClassInfo();
    fetchClassFeatures(classID);
  }, [classID]);

  const fetchClassFeatures = async (classId: string) => {
    try {
      const features = await apiClient.featureFlagsControllerListClassFeatures({
        classId,
      });
      setClassFeatures(features);
    } catch (error) {
      console.error("Error fetching class features:", error);
      setClassFeatures([]);
    }
  };

  if (!classID) {
    return (
      <AdminPage>
        <Alert severity="error">No class ID was provided.</Alert>
      </AdminPage>
    );
  }

  return (
    <AdminPage maxWidth="xl">
      <AdminPageHeader
        title="Feature Flags"
        description={`Control staged feature access for ${className || classID}.`}
      />

      <Grid container spacing={3} sx={{
        alignItems: "stretch"
      }}>
        <Grid size={{ xs: 12, lg: 4 }}>
          <AddClassFeature
            classes={[classID]}
            fetchClassFeatures={fetchClassFeatures}
            hideClassSelection
          />
        </Grid>
        <Grid size={{ xs: 12, lg: 8 }}>
          <ListClassFeatures
            classes={[classID]}
            classFeatures={classFeatures}
            fetchClassFeatures={fetchClassFeatures}
            hideClassSelection
          />
        </Grid>
      </Grid>
    </AdminPage>
  );
};

export default ClassSpecificFeatureFlags;
