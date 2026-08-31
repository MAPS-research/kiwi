import { useEffect, useState } from "react";
import { Box, Card, CardContent, CardMedia, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { Link as RouterLink } from "react-router-dom";
import KiwiWordmark from "../Brand/KiwiWordmark.tsx";

export const CLASS_CARD_HEIGHT = 252;
export const CLASS_CARD_MEDIA_HEIGHT = 152;
export const CLASS_CARD_CONTENT_OVERLAP = 16;
export const CLASS_CARD_CONTENT_HOVER_OVERLAP = 28;

export interface SharedClassCardProps {
  title?: string;
  instructor?: string;
  imageUrl?: string | null;
  to?: string;
  routeState?: Record<string, unknown>;
  hoverable?: boolean;
}

const SharedClassCard = ({
  title,
  instructor,
  imageUrl,
  to,
  routeState,
  hoverable = false,
}: SharedClassCardProps) => {
  const [imageFailed, setImageFailed] = useState(false);
  const resolvedTitle = title?.trim() || "Unnamed class";
  const resolvedInstructor = instructor?.trim() || "Instructor TBD";
  const canHover = Boolean(to || hoverable);
  const isStandaloneHoverable = !to && canHover;
  const showImage = Boolean(imageUrl) && !imageFailed;

  useEffect(() => {
    setImageFailed(false);
  }, [imageUrl]);

  const card = (
    <Card
      variant="outlined"
      tabIndex={isStandaloneHoverable ? 0 : undefined}
      sx={{
        width: "100%",
        height: CLASS_CARD_HEIGHT,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        borderRadius: 3,
        borderColor: "divider",
        boxShadow: "none",
        bgcolor: "grey.100",
        ...(canHover && {
          ...(to && { cursor: "pointer" }),
          "&:hover": {
            "& .class-card-content": {
              mt: `-${CLASS_CARD_CONTENT_HOVER_OVERLAP}px`,
            },
          },
        }),
        ...(isStandaloneHoverable && {
          "&:focus-visible": {
            outline: "2px solid",
            outlineColor: "primary.main",
            outlineOffset: -2,
            "& .class-card-content": {
              mt: `-${CLASS_CARD_CONTENT_HOVER_OVERLAP}px`,
            },
          },
        }),
      }}
    >
      <Box
        data-testid="class-card-media"
        sx={{
          position: "relative",
          height: CLASS_CARD_MEDIA_HEIGHT,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          background: (theme) =>
            `linear-gradient(135deg, ${theme.palette.grey[100]} 0%, ${theme.palette.grey[300]} 100%)`,
        }}
      >
        {showImage ? (
          <>
            <CardMedia
              component="img"
              data-testid="class-card-image"
              image={imageUrl!}
              alt={`${resolvedTitle} cover`}
              loading="lazy"
              onError={() => setImageFailed(true)}
              sx={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
            <Box
              aria-hidden="true"
              data-testid="class-card-image-gradient"
              sx={{
                position: "absolute",
                inset: 0,
                pointerEvents: "none",
                background: (theme) =>
                  `linear-gradient(180deg, transparent 80%, ${alpha(theme.palette.grey[100], 0.1)} 90%, ${alpha(theme.palette.grey[100], 0.42)} 100%)`,
              }}
            />
          </>
        ) : (
          <Box
            data-testid="class-card-image-fallback"
            sx={{
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: (theme) =>
                `linear-gradient(135deg, ${theme.palette.grey[100]} 0%, ${theme.palette.grey[300]} 100%)`,
            }}
          >
            <KiwiWordmark
              aria-hidden="true"
              data-testid="class-card-placeholder-wordmark"
              sx={{
                color: "grey.500",
                opacity: 0.5,
                fontSize: "3.25rem",
                lineHeight: 1,
                userSelect: "none",
              }}
            />
          </Box>
        )}
      </Box>

      <CardContent
        className="class-card-content"
        data-testid="class-card-content"
        sx={{
          position: "relative",
          zIndex: 1,
          flexGrow: 1,
          minHeight: 0,
          mt: `-${CLASS_CARD_CONTENT_OVERLAP}px`,
          p: 2.5,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: 0.75,
          borderRadius: "16px 16px 0 0",
          bgcolor: (theme) => alpha(theme.palette.background.paper, 0.84),
          backdropFilter: "blur(14px) saturate(120%)",
          WebkitBackdropFilter: "blur(14px) saturate(120%)",
          transition: (theme) =>
            theme.transitions.create("margin-top", {
              duration: theme.transitions.duration.shorter,
            }),
          "@media (prefers-reduced-transparency: reduce)": {
            bgcolor: "background.paper",
            backdropFilter: "none",
            WebkitBackdropFilter: "none",
          },
          "@media (prefers-reduced-motion: reduce)": {
            transition: "none",
          },
          "&:last-child": { pb: 2.5 },
        }}
      >
        <Typography
          variant="h6"
          color="text.primary"
          title={resolvedTitle}
          sx={{
            fontSize: "1.05rem",
            fontWeight: 600,
            lineHeight: 1.35,
            display: "-webkit-box",
            WebkitBoxOrient: "vertical",
            WebkitLineClamp: 2,
            overflow: "hidden",
          }}
        >
          {resolvedTitle}
        </Typography>

        <Typography
          variant="body2"
          color="text.secondary"
          noWrap
          title={resolvedInstructor}
        >
          {resolvedInstructor}
        </Typography>
      </CardContent>
    </Card>
  );

  if (!to) {
    return <Box sx={{ width: "100%" }}>{card}</Box>;
  }

  return (
    <Box
      component={RouterLink}
      to={to}
      state={routeState}
      aria-label={`Open ${resolvedTitle}`}
      sx={{
        width: "100%",
        display: "block",
        textDecoration: "none",
        borderRadius: 3,
        "&:focus-visible": {
          outline: "2px solid",
          outlineColor: "primary.main",
          outlineOffset: 2,
        },
      }}
    >
      {card}
    </Box>
  );
};

export default SharedClassCard;
