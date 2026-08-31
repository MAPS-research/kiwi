import React, { useCallback, useEffect, useState, useMemo } from "react";
import {
  Typography,
  TextField,
  Box,
  InputAdornment,
  Skeleton,
  Button,
  Alert,
  Collapse
} from "@mui/material";
import {
  SearchOutlined as SearchIcon,
  AddOutlined as AddIcon,
  SchoolOutlined as EmptySchoolIcon
} from "@mui/icons-material";
import Grid from "@mui/material/Grid";
import ClassCard, { CLASS_CARD_HEIGHT } from "../../components/ClassCard/ClassCard.tsx";
import apiClient from "../../utils/api.ts";
import { AdminPage, AdminPageHeader } from "../../components/AdminPage/index.ts";
import { AddNewClassDialog } from "./AddNewClass.tsx";
import { CREATE_NEW_CLASS_LABEL } from "../../constants/classCopy.ts";

interface ClassInfo {
  classID: string;
  className?: string;
  professorName?: string;
  imageSnippetUrl?: string;
}

export const Classes: React.FC = () => {
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [roleLoading, setRoleLoading] = useState(true);
  const [addClassDialogOpen, setAddClassDialogOpen] = useState(false);
  const canCreateClass = userRole !== 'instructor';

  const convertToClassInfo = useCallback(async (id: string): Promise<ClassInfo | null> => {
    try {
      const classEntry = await apiClient.classControllerGetById({ classID: id });
      return {
        classID: classEntry.id,
        className: classEntry.className,
        professorName: classEntry.professorName,
        imageSnippetUrl: classEntry.imageSnippetUrl
      };
    } catch (error) {
      console.error("Error fetching class data:", error);
      return null;
    }
  }, []);

  // Fetch user role first
  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        const response = await apiClient.authControllerGetUserRole();
        setUserRole(response.role || null);
      } catch (error) {
        console.error('Error fetching user role:', error);
        setUserRole(null);
      } finally {
        setRoleLoading(false);
      }
    };

    fetchUserRole();
  }, []);

  // Fetch classes based on user role
  const fetchClassList = useCallback(async () => {
    if (roleLoading) return;

    const fetchClassInfoArray = async (classIds: string[]): Promise<ClassInfo[]> => {
      const all = await Promise.all(classIds.map(convertToClassInfo));
      return all.filter((c): c is ClassInfo => c !== null);
    };

    try {
      setLoading(true);
      setError(null);

      let classIds: string[];

      if (userRole === 'instructor') {
        // Fetch instructor-specific classes
        const response = await apiClient.instructorClassControllerGetInstructorClasses();
        // Ensure we extract class IDs if response contains objects instead of strings
        classIds = response.classes.map(cls => typeof cls === 'string' ? cls : (cls as any).classID || (cls as any).id || cls);
      } else {
        // Fetch all classes for admin/user
        const response = await apiClient.classControllerList();
        classIds = response.classIds;
      }

      const classInfoArray = await fetchClassInfoArray(classIds);
      setClasses(classInfoArray);
    } catch (error) {
      console.error("Error fetching class list", error);
      setError("Failed to load classes. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [convertToClassInfo, roleLoading, userRole]);

  useEffect(() => {
    if (roleLoading) return; // Wait for role to be determined

    fetchClassList();
  }, [fetchClassList, roleLoading]);

  const filteredClasses = useMemo(() => {
    return classes.filter(
      (c) =>
        c.className?.toLowerCase().includes(search.toLowerCase()) ||
        c.professorName?.toLowerCase().includes(search.toLowerCase())
    );
  }, [search, classes]);

  return (
    <AdminPage>
      <AdminPageHeader
        title={userRole === 'instructor' ? 'My Classes' : 'All Classes'}
        description={userRole === 'instructor' ? 'View and open your assigned classes.' : 'Create classes and manage existing course spaces.'}
        actions={canCreateClass ? (
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={() => setAddClassDialogOpen(true)}
              sx={{
                borderRadius: 2,
                textTransform: 'none',
                fontWeight: 600,
                px: 3,
                py: 1
              }}
            >
              {CREATE_NEW_CLASS_LABEL}
            </Button>
        ) : undefined}
      />
        {/* Class list toolbar - Search is disabled when there's an error */}
        <Box
          sx={{
            mb: 3,
            width: '100%',
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            alignItems: { xs: 'stretch', sm: 'center' },
            justifyContent: 'space-between',
            gap: 2
          }}
        >
          <TextField
            variant="outlined"
            placeholder={userRole === 'instructor' ? "Search your classes..." : "Search classes or professors..."}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            disabled={!!error}
            sx={{
              width: { xs: '100%', sm: 420 },
            }}
            slotProps={{
              input: {
                sx: {
                  height: 44,
                  borderRadius: 3,
                  '& .MuiOutlinedInput-input': {
                    typography: 'body2',
                  },
                },
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                  </InputAdornment>
                )
              }
            }}
          />

          {!error && !loading && !roleLoading && (
            <Typography
              variant="subtitle1"
              color="text.secondary"
              sx={{ whiteSpace: 'nowrap' }}
            >
              Showing {filteredClasses.length} of {classes.length} classes
            </Typography>
          )}
        </Box>

        {/* Error Bar */}
        <Collapse in={!!error} sx={{ width: '100%', mb: error ? 2 : 0 }}>
          <Alert 
            severity="error"
            sx={{ mb: 2 }}
            action={
              <Button 
                color="inherit" 
                size="small"
                onClick={() => window.location.reload()}
                sx={{ textTransform: 'none' }}
              >
                Retry
              </Button>
            }
          >
            <Typography variant="body2" component="span">
              <strong>Error Loading Classes:</strong> {error}
            </Typography>
          </Alert>
        </Collapse>

        {/* Class Cards or Empty/Skeleton - Only show when no error */}
        {!error && (
          <Box sx={{ width: '100%' }}>
          {(loading || roleLoading) ? (
            <Grid container spacing={3}>
              {[...Array(6)].map((_, index) => (
                <Grid
                  key={index}
                  size={{
                    xs: 12,
                    md: 4
                  }}>
                  <Skeleton
                    variant="rectangular"
                    animation="wave"
                    height={CLASS_CARD_HEIGHT}
                    sx={{ borderRadius: "12px" }}
                  />
                </Grid>
              ))}
            </Grid>
          ) : (
            <>
              {filteredClasses.length > 0 ? (
                <Grid container spacing={3}>
                  {filteredClasses.map((classInfo) => (
                    <Grid
                      key={classInfo.classID}
                      size={{
                        xs: 12,
                        md: 4
                      }}>
                      <ClassCard
                        title={classInfo.className}
                        instructor={classInfo.professorName}
                        imageUrl={classInfo.imageSnippetUrl}
                        to={`/admin/class/${classInfo.classID}`}
                        routeState={{ className: classInfo.className }}
                      />
                    </Grid>
                  ))}
                </Grid>
              ) : (
                <Box 
                  className="admin-empty-state"
                  sx={{ 
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    py: 8,
                    textAlign: 'center'
                  }}
                >
                  <EmptySchoolIcon 
                    sx={{ 
                      fontSize: 120, 
                      color: 'text.disabled',
                      mb: 3 
                    }} 
                  />
                  <Typography variant="h6" color="text.secondary" gutterBottom>
                    {userRole === 'instructor' ? 'No classes assigned' : 'No classes found'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    {userRole === 'instructor' 
                      ? (search ? 'Try adjusting your search terms' : 'You have not been assigned to any classes yet')
                      : (search ? 'Try adjusting your search or creating a new class' : 'Get started by creating your first class')
                    }
                  </Typography>
                  {!search && canCreateClass && (
                    <Button
                      variant="contained"
                      color="primary"
                      startIcon={<AddIcon />}
                      onClick={() => setAddClassDialogOpen(true)}
                      sx={{
                        borderRadius: 2,
                        textTransform: 'none',
                        fontWeight: 600,
                        px: 3,
                        py: 1
                      }}
                    >
                      Create First Class
                    </Button>
                  )}
                </Box>
              )}
            </>
          )}
          </Box>
        )}
        <AddNewClassDialog
          open={addClassDialogOpen}
          onClose={() => setAddClassDialogOpen(false)}
          onCreated={fetchClassList}
        />
    </AdminPage>
  );
};
