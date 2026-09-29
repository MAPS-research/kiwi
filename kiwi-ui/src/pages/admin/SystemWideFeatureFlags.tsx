import React, { useEffect, useState } from "react";
import { Grid, Stack, Typography } from "@mui/material";
import apiClient from "../../utils/api.ts";
import AddClassFeature from "../../components/FeatureFlags/AddClassFeature.tsx";
import AddUserFeature from "../../components/FeatureFlags/AddUserFeature.tsx";
import ListAllFeatures from "../../components/FeatureFlags/ListAllFeatures.tsx";
import { AdminPage, AdminPageHeader } from "../../components/AdminPage/index.ts";

export const SystemWideFeatureFlags: React.FC = () => {
  const [classes, setClasses] = useState<string[]>([]);
  const [listRefreshKey, setListRefreshKey] = useState(0);

  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const response = await apiClient.classControllerList();
        setClasses(response.classIds);
      } catch (error) {
        console.error("Error fetching classes:", error);
      }
    };

    fetchClasses();
  }, []);

  const refreshAssignments = () => {
    setListRefreshKey((current) => current + 1);
  };

  return (
    <AdminPage>
      <AdminPageHeader
        title="Feature Flags"
        description="Control staged feature access for classes and individual users."
      />

      <Stack spacing={1} sx={{ mb: 2 }}>
        <Typography variant="h6" component="h2" sx={{ fontWeight: 600 }}>
          Add an assignment
        </Typography>
        <Typography variant="body2" sx={{
          color: "text.secondary"
        }}>
          Choose the narrowest scope possible and add an expiration for temporary access.
        </Typography>
      </Stack>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, lg: 6 }}>
          <AddClassFeature
            classes={classes}
            fetchClassFeatures={refreshAssignments}
          />
        </Grid>
        <Grid size={{ xs: 12, lg: 6 }}>
          <AddUserFeature onAdded={refreshAssignments} />
        </Grid>
      </Grid>

      <ListAllFeatures refreshKey={listRefreshKey} />
    </AdminPage>
  );
};

export default SystemWideFeatureFlags;
