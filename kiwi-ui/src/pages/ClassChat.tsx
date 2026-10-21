import React, { useContext, useEffect } from "react";
import { Box, Typography } from "@mui/material";
import PDFComponent from "../components/Chat/PDFComponent.tsx";
import { ChatContext } from "./ClassLayout.tsx";
import { useGlobalChat } from "../context/GlobalChatContext.tsx";

/**
 * PDF-only view for class materials.
 * Chat is now accessed via the global floating button.
 */
export const ClassChat: React.FC = () => {
  const { class: myClass, currentPDFID, currentPDFPage, currentPDFMaterialType, pdfContent } = useContext(ChatContext);
  const {
    setCurrentClassId,
    setCurrentPdfId,
    setCurrentPdfPage,
    setCurrentPdfMaterialType,
    setPdfContent,
    setActiveTab,
    setActiveAppSlug,
    setActiveAppName,
    setAppContext,
  } = useGlobalChat();

  // Set active tab to materials and clear app context
  useEffect(() => {
    setActiveTab('materials');
    setActiveAppSlug(undefined);
    setActiveAppName(undefined);
    setAppContext(undefined);
  }, [setActiveTab, setActiveAppSlug, setActiveAppName, setAppContext]);

  // Sync class context to global chat context for modal access
  useEffect(() => {
    if (myClass?.classID) {
      setCurrentClassId(myClass.classID);
    }
  }, [myClass?.classID, setCurrentClassId]);

  useEffect(() => {
    setCurrentPdfId(currentPDFID);
  }, [currentPDFID, setCurrentPdfId]);

  useEffect(() => {
    setCurrentPdfPage(currentPDFPage);
  }, [currentPDFPage, setCurrentPdfPage]);

  useEffect(() => {
    setCurrentPdfMaterialType(currentPDFMaterialType);
  }, [currentPDFMaterialType, setCurrentPdfMaterialType]);

  useEffect(() => {
    setPdfContent(pdfContent);
  }, [pdfContent, setPdfContent]);

  if (!myClass) {
    return (
      <Box role="status" sx={{ p: "var(--space-6)" }}>
        <Typography variant="body2" sx={{ color: "var(--in-progress-text)" }}>
          Loading class…
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ height: "100%", width: "100%" }}>
      <PDFComponent />
    </Box>
  );
};