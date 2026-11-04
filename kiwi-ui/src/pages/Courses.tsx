import { Box, Typography } from "@mui/material";
import TopNav from "../components/TopNav/TopNav.tsx";
import ClassCard from "../components/ClassCard/ClassCard.tsx";
import ResponsiveGrid from "../components/ResponsiveGrid/ResponsiveGrid.tsx";
import EmptyState from "../components/EmptyState/EmptyState.tsx";

import { useCallback, useEffect, useState } from "react";
import apiClient from "../utils/api.ts";
import { ClassInfoResponse } from "../services/models/ClassInfoResponse.ts";

type LoadState = "loading" | "loaded" | "error";

/**
 * The course list (JOURNEY S-01; the Stage 1 preview's `main.courses`): the
 * "Your classes" header over the grid of class cards. Until the request
 * settles the grid stays empty; then an empty list shows the no-classes frame
 * and a failed request the error frame with Retry.
 */
const Courses = () => {
  const [courseList, setCourseList] = useState<ClassInfoResponse[]>([]);
  const [loadState, setLoadState] = useState<LoadState>("loading");

  // retrieve all courses of this user enrolled in
  const fetchEnrolledClasses = useCallback(async () => {
    try {
      const { classInfoList } =
        await apiClient.studentControllerGetEnrolledClassesInfoByStudentId();
      console.log("classesInfo:", classInfoList);
      if (classInfoList) {
        setCourseList(classInfoList);
      }
      setLoadState("loaded");
    } catch (error) {
      console.error("Error fetching courses:", error);
      setLoadState("error");
    }
  }, []);

  useEffect(() => {
    void fetchEnrolledClasses();
  }, [fetchEnrolledClasses]);

  const retry = () => {
    setLoadState("loading");
    void fetchEnrolledClasses();
  };

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100vh"
      }}>
      <TopNav />
      <Box
        component="main"
        data-testid="courses-surface"
        sx={{
          flexGrow: 1,
          overflow: "auto",
          bgcolor: "background.default",
        }}
      >
        <Box
          sx={{
            width: "100%",
            maxWidth: 1440,
            mx: "auto",
            boxSizing: "border-box",
            pt: "var(--space-6)",
            pb: "var(--space-8)",
            px: { xs: "var(--space-4)", sm: "var(--space-gutter)" },
          }}
        >
          <Typography variant="h1" sx={{ mb: "var(--space-6)" }}>
            Your classes
          </Typography>
          {loadState === "error" ? (
            <EmptyState
              variant="page"
              title="Couldn't load your classes"
              description="The server didn't respond as expected. Select Retry."
              error={{ onRetry: retry }}
            />
          ) : loadState === "loaded" && courseList.length === 0 ? (
            // The no-action variant: nobody adds a class from this page, so the frame has no button.
            <EmptyState variant="page" title="No classes yet" />
          ) : (
            <ResponsiveGrid>
              {courseList.map((course, i) => (
                <ClassCard
                  key={i}
                  title={course.className || "Untitled class"}
                  instructor={course.professorName || "No instructor listed"}
                  imageUrl={course.imageSnippetUrl}
                  to={course.id ? `/${course.id}` : undefined}
                  routeState={{ className: course.className }}
                />
              ))}
            </ResponsiveGrid>
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default Courses;
