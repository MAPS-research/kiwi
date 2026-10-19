import React, { useEffect, useState } from "react";
import {
  Box,
  ButtonBase,
  Skeleton,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import { ChevronRightOutlined as ChevronRightIcon } from "@mui/icons-material";
import { ChatGroup, classAnalyticsApi } from "../../utils/classAnalyticsApi.ts";
import { ChatDetailDialog } from "./ChatDetailDialog.tsx";
import { numeric, tokens, typeRole } from "./tokens.ts";

interface ChatBrowserProps {
  classId: string;
  lectureId?: string;
  lectureNameByPdfId: Map<string, string>;
  onPageClick: (pdfId: string, pdfPage: number) => void;
}

type GroupMode = "student" | "page";

/**
 * Vertical, scrollable list of students / pages; clicking a row opens a popup
 * with that group's full chat history.
 */
export const ChatBrowser: React.FC<ChatBrowserProps> = ({
  classId,
  lectureId,
  lectureNameByPdfId,
  onPageClick,
}) => {
  const [mode, setMode] = useState<GroupMode>("student");
  const [groups, setGroups] = useState<ChatGroup[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(true);
  const [openGroup, setOpenGroup] = useState<ChatGroup | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setGroupsLoading(true);
        const response = await classAnalyticsApi.getChatGroups(
          classId,
          mode,
          lectureId,
        );
        if (!cancelled) setGroups(response.groups);
      } catch {
        if (!cancelled) setGroups([]);
      } finally {
        if (!cancelled) setGroupsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [classId, mode, lectureId]);

  return (
    <Box
      sx={{
        border: `1px solid ${tokens.edge}`,
        borderRadius: "var(--radius-sheet)",
        backgroundColor: tokens.paper,
        display: "flex",
        flexDirection: "column",
        minHeight: 420,
        maxHeight: 620,
        overflow: "hidden",
      }}
    >
      <Box
        sx={{
          px: 3,
          pt: 2.25,
          pb: 1.5,
          borderBottom: `1px solid ${tokens.rule}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 1,
          flexWrap: "wrap",
          flexShrink: 0,
        }}
      >
        <Box>
          <Typography sx={{ ...typeRole("group-title"), color: tokens.ink }}>
            Student chats
          </Typography>
          <Typography sx={{ ...typeRole("small"), color: tokens.slate, mt: 0.25 }}>
            Open a {mode === "student" ? "student" : "page"} to read the full
            conversation
          </Typography>
        </Box>
        <ToggleButtonGroup
          size="small"
          exclusive
          value={mode}
          onChange={(_, value) => value && setMode(value)}
          sx={{
            // A segmented control: the interactive edge; the selected half is the selection tint.
            "& .MuiToggleButton-root": {
              px: 1.5,
              py: 0.5,
              ...typeRole("label"),
              fontWeight: "var(--type-weight-regular)",
              textTransform: "none",
              color: tokens.ink,
              borderColor: "var(--border-interactive)",
              "&:hover": { backgroundColor: tokens.hover },
              "&.Mui-selected": {
                backgroundColor: "var(--selection-bg)",
                color: "var(--selection-text)",
                fontWeight: "var(--type-weight-emphasis)",
                "&:hover": { backgroundColor: "var(--selection-bg)" },
              },
            },
          }}
        >
          <ToggleButton value="student">By student</ToggleButton>
          <ToggleButton value="page">By page</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* Vertical scrolling list */}
      <Box sx={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
        {groupsLoading ? (
          <Box sx={{ px: 3, py: 2 }}>
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} height={48} sx={{ transform: "none", mb: 1 }} />
            ))}
          </Box>
        ) : groups.length === 0 ? (
          <Typography sx={{ px: 3, py: 4, ...typeRole("small"), color: tokens.slate }}>
            No chats yet{lectureId ? " for this lecture" : ""}.
          </Typography>
        ) : (
          groups.map((group) => (
            <ButtonBase
              key={group.key}
              onClick={() => setOpenGroup(group)}
              sx={{
                width: "100%",
                px: 3,
                py: 1.5,
                display: "flex",
                alignItems: "center",
                gap: 1.5,
                textAlign: "left",
                borderBottom: `1px solid ${tokens.rule}`,
                "&:hover": { backgroundColor: tokens.hover },
                // The global ring, drawn inside the scrolling list so it is never clipped.
                "&:focus-visible, &.Mui-focusVisible": {
                  outlineOffset: "calc(-1 * var(--size-focus-ring))",
                },
              }}
            >
              {/* Badge */}
              <Box
                sx={{
                  width: 36,
                  height: 36,
                  // A student is an avatar (a true circle); a page is a small square tile.
                  borderRadius: mode === "student" ? "50%" : "var(--radius-small)",
                  backgroundColor: "var(--surface-active)",
                  color: tokens.ink,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  ...typeRole("caption"),
                  ...numeric,
                  fontWeight: "var(--type-weight-emphasis)",
                  flexShrink: 0,
                }}
              >
                {mode === "student"
                  ? (group.key ?? "s?").toUpperCase()
                  : `p.${group.pdfPage ?? "?"}`}
              </Box>

              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography
                  sx={{
                    ...typeRole("label"),
                    color: tokens.ink,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {mode === "student"
                    ? group.label ?? group.key
                    : `Page ${group.pdfPage ?? "?"}`}
                </Typography>
                <Typography
                  sx={{
                    ...typeRole("caption"),
                    color: tokens.slate,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {mode === "page"
                    ? group.fileName ?? ""
                    : group.lastActivity
                      ? `last active ${new Date(
                          group.lastActivity,
                        ).toLocaleDateString()}`
                      : ""}
                </Typography>
              </Box>

              <Typography
                sx={{
                  ...typeRole("label"),
                  ...numeric,
                  color: tokens.ink,
                  flexShrink: 0,
                }}
              >
                {group.questionCount}
              </Typography>
              <ChevronRightIcon
                sx={{ fontSize: 18, color: tokens.icon, flexShrink: 0 }}
              />
            </ButtonBase>
          ))
        )}
      </Box>

      <ChatDetailDialog
        open={!!openGroup}
        onClose={() => setOpenGroup(null)}
        classId={classId}
        group={openGroup}
        mode={mode}
        lectureId={lectureId}
        lectureNameByPdfId={lectureNameByPdfId}
        onPageClick={onPageClick}
      />
    </Box>
  );
};
