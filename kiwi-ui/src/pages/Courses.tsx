import { Box, Container, Paper } from "@mui/material";
import TopNav from "../components/TopNav/TopNav.tsx";
import ClassCard from "../components/ClassCard/ClassCard.tsx";
import ResponsiveGrid from "../components/ResponsiveGrid/ResponsiveGrid.tsx";
import HeroCarousel from "../components/HeroCarousel/HeroCarousel.tsx"; // Adjust path if needed

import React, { useState } from "react";
import apiClient from "../utils/api.ts";
import { ClassInfoResponse } from "../services/models/ClassInfoResponse.ts";

const Courses = () => {
  const [courseList, setCourseList] = useState<ClassInfoResponse[]>([]);

  React.useEffect(() => {
    // retrieve all courses of this user enrolled in
    const fetchEnrolledClasses = async () => {
      try {
        const { classInfoList } =
          await apiClient.studentControllerGetEnrolledClassesInfoByStudentId();
        console.log("classesInfo:", classInfoList);
        if (!classInfoList) {
          return;
        }
        setCourseList(classInfoList);
      } catch (error) {
        console.error("Error fetching courses:", error);
      }
    };
    fetchEnrolledClasses();
  }, []);

  return (
    <Box display="flex" flexDirection="column" height="100vh">
      <TopNav />
      <Paper
        data-testid="courses-surface"
        square
        sx={{
          flexGrow: 1,
          backgroundColor: "grey.100",
          overflow: "auto",
        }}
      >
        <Container
          maxWidth={false}
          sx={{
            mt: 4,
            maxWidth: "1440px",
            mx: "auto",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <HeroCarousel />
          <ResponsiveGrid sx={{ mt: "48px" }}>
            {courseList.map((course, i) => (
              <ClassCard
                key={i}
                title={course.className || "Class"}
                instructor={course.professorName || "TBD"}
                imageUrl={course.imageSnippetUrl}
                to={course.id ? `/${course.id}` : undefined}
                routeState={{ className: course.className }}
              />
            ))}
          </ResponsiveGrid>
        </Container>
        <Box sx={{ height: "120px" }} />
      </Paper>
    </Box>
  );
};

export default Courses;
