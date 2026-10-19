import React, { useEffect, useRef, useState } from "react";
import { useParams, useNavigate, useLocation, Outlet } from "react-router-dom";
import { Box, Tabs, Tab, CircularProgress } from "@mui/material";
import TopNav, { type ClassSwitcherOption } from "../components/TopNav/TopNav.tsx";
import apiClient, { classAppsApiClient } from "../utils/api.ts";

import type { ClassAppResponseDto } from "../services/models/index.ts";
import { useContentResize } from "../hooks/useContentResize.ts";

// Feature checker import
import { useAuth } from "../auth/AuthContext.tsx";
import { featureFlagChecker } from "../utils/featureFlagChecker.ts";

interface KiwiClass {
  className?: string;
  classID: string;
  professorName?: string;
}

export const ChatContext = React.createContext<{
  class?: KiwiClass;
  currentPDFID?: string;
  setCurrentPDFID?: (pdfID: string) => void;
  currentPdfName?: string;
  setCurrentPdfName?: (pdfName: string) => void;
  currentPDFPage?: number;
  currentPDFMaterialType?: string;
  setCurrentPDFMaterialType?: (materialType: string) => void;
  setCurrentPDFPage?: (pageNumber: number) => void;
  pdfNavigationRef?: React.MutableRefObject<((page: number) => void) | undefined>;
  pdfContent?: string;
  setPdfContent?: (content: string) => void;
  multipleCourses?: boolean;
  engineChoice?: string;
  setEngineChoice?: (engine: string) => void;
}>({});

// Static tab configuration
// Note: Chat was moved to global floating modal - default view is now PDF-only
const staticMenuItems = [
  { label: "Materials", path: "", isApp: false },
  { label: "Scratchpad", path: "code", isApp: false },
];

// The one fallback for a class with no name (SR-2.01).
const UNTITLED_CLASS = "Untitled class";

interface MenuItem {
  label: string;
  path: string;
  isApp: boolean;
  appData?: ClassAppResponseDto;
}

export const StudentClassLayout: React.FC = () => {
  const { classID } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const navigationClassName = (location.state as { className?: string } | null)
    ?.className;
  const hasUserChangedTabRef = useRef(false);

  // class data
  const [myClass, setMyClass] = useState<KiwiClass>();
  const [classContext, setClassContext] = useState({
    classID,
    className: navigationClassName,
  });
  const [classLoading, setClassLoading] = useState(!navigationClassName);
  const [multipleCourses, setMultipleCourses] = useState(false);
  const [classOptions, setClassOptions] = useState<ClassSwitcherOption[]>([]);
  const [classOptionsLoading, setClassOptionsLoading] = useState(true);

  // enabled apps for this class
  const [enabledApps, setEnabledApps] = useState<ClassAppResponseDto[]>([]);

  // chat engine — Qwen is available to everyone now (no QwenModel flag gate).
  const qwenEnabled = true;
  const [engineChoice, setEngineChoice] = useState(
    localStorage.getItem("engineChoice") || "openai",
  );

  // pdf data
  const [currentPDFID, setCurrentPDFID] = useState<string>("");
  const [pdfContent, setPdfContent] = useState<string>("");
  const [currentPdfName, setCurrentPdfName] = useState<string>("");
  const [currentPDFPage, setCurrentPDFPage] = useState<number>(0);
  const [currentPDFMaterialType, setCurrentPDFMaterialType] =
    useState<string>("");
  const pdfNavigationRef = useRef<((page: number) => void) | undefined>(undefined);
  const contentResizeStyles = useContentResize();

  const activePath = location.pathname.split("/").pop();

  // Combine static menu items and enabled apps
  const menuItems: MenuItem[] = [
    ...staticMenuItems,
    ...enabledApps.map((app) => ({
      label: app.tabLabel || app.name,
      path: `app/${app.slug}`,
      isApp: true,
      appData: app,
    })),
  ];

  // Find the current tab index based on the active path
  const currentTabIndex = menuItems.findIndex((item) => {
    if (item.path === "" && activePath === classID) return true;
    if (item.isApp) {
      // For app paths, check if URL matches app/{slug}
      const pathParts = location.pathname.split("/");
      const appIndex = pathParts.indexOf("app");
      if (appIndex !== -1 && pathParts[appIndex + 1] === item.appData?.slug) {
        return true;
      }
    }
    return activePath === item.path;
  });

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    hasUserChangedTabRef.current = true;
    const selectedItem = menuItems[newValue];
    navigate(
      selectedItem.path ? `/${classID}/${selectedItem.path}` : `/${classID}`,
    );
  };

  const handleClassChange = (nextClassId: string) => {
    hasUserChangedTabRef.current = false;
    const selectedOption = classOptions.find(
      (option) => option.id === nextClassId,
    );
    const routeMatch = location.pathname.match(/^\/[^/]+(\/.*)?$/);
    const routeSuffix = routeMatch?.[1] ?? "";

    navigate(
      {
        pathname: `/${encodeURIComponent(nextClassId)}${routeSuffix}`,
        search: location.search,
        hash: location.hash,
      },
      { state: { className: selectedOption?.label } },
    );
  };

  useEffect(() => {
    let cancelled = false;

    const fetchClassOptions = async () => {
      setClassOptionsLoading(true);

      try {
        const { classInfoList } =
          await apiClient.studentControllerGetEnrolledClassesInfoByStudentId();

        if (!cancelled) {
          setMultipleCourses(classInfoList.length > 1);
          setClassOptions(
            classInfoList
              .map((classInfo) => ({
                id: classInfo.id,
                label: classInfo.className || UNTITLED_CLASS,
              }))
              .sort((a, b) => a.label.localeCompare(b.label)),
          );
        }
      } catch (error) {
        console.error("Error fetching enrolled class options:", error);
        if (!cancelled) setClassOptions([]);
      } finally {
        if (!cancelled) setClassOptionsLoading(false);
      }
    };

    fetchClassOptions();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!classID || menuItems.length === 0 || hasUserChangedTabRef.current) {
      return;
    }

    const basePath = `/${classID}`;
    const firstItem = menuItems[0];
    const firstPath = firstItem.path
      ? `/${classID}/${firstItem.path}`
      : basePath;
    const isBaseRoute = location.pathname === basePath;

    if ((isBaseRoute && firstPath !== basePath) || currentTabIndex === -1) {
      navigate(firstPath, { replace: true });
    }
  }, [classID, currentTabIndex, location.pathname, menuItems, navigate]);

  useEffect(() => {
    const fetchClass = async () => {
      console.log("ClassLayout: fetchClass called with classID:", classID); // debug log
      if (!classID) {
        console.error("No classID provided in URL");
        setClassLoading(false);
        return;
      }

      setClassLoading(true);
      setMyClass(undefined);
      setClassContext({ classID, className: navigationClassName });

      try {
        console.log("ClassLayout: Fetching specific class by ID:", classID); // debug log
        // Fetch the specific class by ID
        const classEntry = await apiClient.classControllerGetById({
          classID: classID,
        });
        console.log("ClassLayout: Class entry result:", classEntry); // debug log

        const classData: KiwiClass = {
          classID: classEntry.id,
          className: classEntry.className,
          professorName: classEntry.professorName,
        };

        console.log("ClassLayout: Setting myClass to:", classData); // debug log
        setMyClass(classData);
        setClassContext({ classID, className: classData.className });

        // Notify server of the selected class
        const response = await apiClient.classControllerSetSelectedClass({
          setSelectedClassRequest: {
            classId: classID,
          },
        });

        if (response) {
          console.log("Selected class set successfully");
        } else {
          console.error("Failed to set selected class");
        }
      } catch (error) {
        console.error("Error fetching class:", error);
        // Optionally redirect to a not found page or show error message
      } finally {
        setClassLoading(false);
      }
    };

    fetchClass();

    // Fetch enabled apps for this class
    const fetchEnabledApps = async () => {
      if (!classID) return;
      try {
        const apps =
          await classAppsApiClient.classKiwiAppControllerGetClassApps({
            classId: classID,
          });
        // Sort by tabOrder
        apps.sort((a, b) => a.tabOrder - b.tabOrder);
        setEnabledApps(apps);
      } catch (error) {
        console.error("Error fetching enabled apps:", error);
      }
    };

    fetchEnabledApps();
  }, [classID]);

  const contextData = {
    class: myClass,
    currentPDFID,
    setCurrentPDFID,
    currentPdfName,
    setCurrentPdfName,
    currentPDFPage,
    setCurrentPDFPage,
    currentPDFMaterialType,
    setCurrentPDFMaterialType,
    pdfNavigationRef,
    pdfContent,
    setPdfContent,
    multipleCourses,
    engineChoice,
    setEngineChoice,
  };
  const topNavClassName =
    classContext.classID === classID
      ? classContext.className
      : navigationClassName;

  return (
    <ChatContext.Provider value={contextData}>
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          height: "100vh",
          ...contentResizeStyles,
        }}
      >
        {/* Top bar: on a class page the logo is followed by the divider and the
            class switch (no brand column: that aligns the admin sidebar only). */}
        <TopNav
          contextLabel={
            topNavClassName || (!classLoading ? UNTITLED_CLASS : undefined)
          }
          contextLoading={classLoading && !topNavClassName}
          classOptions={classOptions}
          classOptionsLoading={classOptionsLoading}
          selectedClassId={classID}
          onClassChange={handleClassChange}
        />

        {/* Class bar (SR-2): the tab row on the sheet, one tab tall plus its
            bottom rule. The theme draws the tabs (44 px, label type, 2 px marker). */}
        <Box
          sx={{
            flex: "none",
            display: "flex",
            alignItems: "stretch",
            height: "calc(var(--size-tab) + 1px)",
            px: { xs: "var(--space-2)", sm: "var(--space-3)" },
            bgcolor: "var(--surface)",
            borderBottom: "1px solid var(--border-subtle)",
          }}
        >
          <Tabs
            value={currentTabIndex >= 0 ? currentTabIndex : 0}
            onChange={handleTabChange}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              flex: "1 1 auto",
              minWidth: 0,
            }}
          >
            {menuItems.map((item) => (
              <Tab key={item.label} label={item.label} />
            ))}
          </Tabs>
        </Box>

        {/* Main content on the canvas: it takes the rest of the viewport, so
            pages that fill it (height: 100%) get a definite height. */}
        <Box
          sx={{
            flex: "1 1 auto",
            minHeight: 0,
            bgcolor: "background.default",
          }}
        >
          {myClass ? (
            <Outlet />
          ) : (
            <Box
              sx={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                minHeight: "400px",
              }}
            >
              <CircularProgress />
            </Box>
          )}
        </Box>
      </Box>
    </ChatContext.Provider>
  );
};
