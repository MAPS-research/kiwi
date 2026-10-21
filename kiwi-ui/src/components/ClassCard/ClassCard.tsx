import { useEffect, useState } from "react";
import { Box, Card, Typography } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import KiwiLogo from "../Brand/KiwiLogo.tsx";

export const CLASS_CARD_HEIGHT = 252;
export const CLASS_CARD_MEDIA_HEIGHT = 152;

export interface SharedClassCardProps {
  title?: string;
  instructor?: string;
  imageUrl?: string | null;
  to?: string;
  routeState?: Record<string, unknown>;
  hoverable?: boolean;
}

/**
 * The class card (JOURNEY S-01, block 3; the Stage 1 preview's `a.class-card`):
 * a 252 px sheet with a 152 px cover, the class image or, without one, Kiwi's
 * logo at 64 px on a flat tile, then the title (two lines at most) and the
 * instructor (one line). A link card or a hoverable preview tints its body on
 * hover and takes the one focus frame on its own border.
 */
const SharedClassCard = ({
  title,
  instructor,
  imageUrl,
  to,
  routeState,
  hoverable = false,
}: SharedClassCardProps) => {
  const [imageFailed, setImageFailed] = useState(false);
  const resolvedTitle = title?.trim() || "Untitled class";
  const resolvedInstructor = instructor?.trim() || "No instructor listed";
  const interactive = Boolean(to || hoverable);
  const showImage = Boolean(imageUrl) && !imageFailed;

  useEffect(() => {
    setImageFailed(false);
  }, [imageUrl]);

  const cardSx = {
    width: "100%",
    height: CLASS_CARD_HEIGHT,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    textDecoration: "none",
    color: "var(--text)",
    ...(interactive && {
      "&:hover .class-card-body": { backgroundColor: "var(--surface-hover)" },
      // One frame on focus (DESIGN.md, Components; the theme's rule for a bordered
      // control): the card recolours its own border, the second pixel drawn inward.
      "&:focus-visible": {
        outline: "none",
        borderColor: "var(--panel-focus-border)",
        boxShadow: "inset 0 0 0 1px var(--panel-focus-border)",
        // Forced colours drop the shadow and repaint the border, so the frame becomes the system ring.
        "@media (forced-colors: active)": {
          outline: "var(--border-width-focus) solid Highlight",
          outlineOffset: "calc(-1 * var(--border-width-focus))",
          boxShadow: "none",
        },
      },
    }),
  } as const;

  const content = (
    <>
      <Box
        data-testid="class-card-media"
        sx={{
          flex: "none",
          height: CLASS_CARD_MEDIA_HEIGHT,
          display: "grid",
          placeItems: "center",
          overflow: "hidden",
          backgroundColor: "var(--surface-hover)",
          borderBottom: "1px solid var(--border-subtle)",
        }}
      >
        {showImage ? (
          <Box
            component="img"
            data-testid="class-card-image"
            src={imageUrl!}
            alt=""
            loading="lazy"
            onError={() => setImageFailed(true)}
            sx={{ display: "block", width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <KiwiLogo size="var(--companion-slot-inline)" />
        )}
      </Box>

      <Box
        className="class-card-body"
        data-testid="class-card-content"
        sx={{
          flex: "1 1 auto",
          minHeight: 0,
          padding: "var(--space-3) var(--space-4) var(--space-4)",
        }}
      >
        <Typography
          component="span"
          variant="subtitle1"
          title={resolvedTitle}
          sx={{
            display: "-webkit-box",
            WebkitBoxOrient: "vertical",
            WebkitLineClamp: 2,
            overflow: "hidden",
            color: "var(--text)",
          }}
        >
          {resolvedTitle}
        </Typography>
        <Typography
          component="span"
          variant="body2"
          noWrap
          title={resolvedInstructor}
          sx={{ display: "block", mt: "var(--space-1)", color: "var(--text-secondary)" }}
        >
          {resolvedInstructor}
        </Typography>
      </Box>
    </>
  );

  if (to) {
    return (
      <Card
        component={RouterLink}
        to={to}
        state={routeState}
        aria-label={`Open ${resolvedTitle}`}
        sx={cardSx}
      >
        {content}
      </Card>
    );
  }

  return (
    <Card tabIndex={hoverable ? 0 : undefined} sx={cardSx}>
      {content}
    </Card>
  );
};

export default SharedClassCard;
