import React, { useState } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { FlagOutlined, RefreshOutlined } from "@mui/icons-material";
import { FeatureResponse } from "../../services/index.ts";

interface ListClassFeaturesProps {
  classes: string[];
  classFeatures: FeatureResponse[];
  fetchClassFeatures: (classId: string) => void;
  hideClassSelection?: boolean;
}

const ListClassFeatures: React.FC<ListClassFeaturesProps> = ({
  classes,
  classFeatures,
  fetchClassFeatures,
  hideClassSelection = false,
}) => {
  const [selectedClassId, setSelectedClassId] = useState(
    hideClassSelection && classes.length > 0 ? classes[0] : "",
  );

  const handleClassChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const classId = event.target.value;
    setSelectedClassId(classId);
    fetchClassFeatures(classId);
  };

  const activeClassId = hideClassSelection ? classes[0] : selectedClassId;

  return (
    <Card variant="outlined" sx={{ borderRadius: 2, height: "100%" }}>
      <CardContent sx={{ p: 0, "&:last-child": { pb: 0 } }}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          justifyContent="space-between"
          alignItems={{ xs: "stretch", sm: "center" }}
          spacing={2}
          sx={{ p: 3, pb: 2 }}
        >
          <Stack direction="row" spacing={1.5} alignItems="flex-start">
            <FlagOutlined color="action" />
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Assigned flags
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Features currently available to this class.
              </Typography>
            </Box>
          </Stack>
          {activeClassId && (
            <Button
              variant="outlined"
              startIcon={<RefreshOutlined />}
              onClick={() => fetchClassFeatures(activeClassId)}
            >
              Refresh
            </Button>
          )}
        </Stack>

        {!hideClassSelection && (
          <Box sx={{ px: 3, pb: 2 }}>
            <TextField
              select
              label="Class"
              value={selectedClassId}
              onChange={handleClassChange}
              fullWidth
            >
              {classes.map((classId) => (
                <MenuItem key={classId} value={classId}>
                  {classId}
                </MenuItem>
              ))}
            </TextField>
          </Box>
        )}

        <TableContainer sx={{ borderTop: "1px solid", borderColor: "divider" }}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: "action.hover" }}>
                <TableCell>Feature</TableCell>
                <TableCell>Expiration</TableCell>
                <TableCell width={120}>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {classFeatures.map((feature) => {
                const expired = Boolean(
                  feature.validUntil
                    && new Date(feature.validUntil).getTime() < Date.now(),
                );
                return (
                  <TableRow key={`${feature.targetId}-${feature.featureName}`} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight={500}>
                        {feature.featureName}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {feature.validUntil
                        ? new Date(feature.validUntil).toLocaleString()
                        : "No expiration"}
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        color={expired ? "default" : "success"}
                        variant={expired ? "outlined" : "filled"}
                        label={expired ? "Expired" : "Active"}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
              {classFeatures.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3}>
                    <Box sx={{ py: 5, textAlign: "center" }}>
                      <Typography variant="body2" color="text.secondary">
                        No feature flags are assigned to this class.
                      </Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </Card>
  );
};

export default ListClassFeatures;
