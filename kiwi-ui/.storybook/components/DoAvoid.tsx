import { useId, type ReactNode } from 'react';
import { alpha } from '@mui/material/styles';
import { Box, Paper, Stack, Typography } from '@mui/material';

export interface DoAvoidProps {
  doItems: readonly ReactNode[];
  avoidItems: readonly ReactNode[];
  doTitle?: string;
  avoidTitle?: string;
  headingLevel?: 'h2' | 'h3' | 'h4';
  ariaLabel?: string;
}

interface GuidancePanelProps {
  title: string;
  titleId: string;
  items: readonly ReactNode[];
  tone: 'success' | 'warning';
  headingLevel: NonNullable<DoAvoidProps['headingLevel']>;
}

const GuidancePanel = ({ title, titleId, items, tone, headingLevel }: GuidancePanelProps) => (
  <Paper
    component="section"
    aria-labelledby={titleId}
    variant="outlined"
    sx={{
      minWidth: 0,
      p: { xs: 2, sm: 2.5 },
      borderColor: `${tone}.main`,
      borderLeftWidth: 4,
      borderRadius: 2,
      bgcolor: (theme) => alpha(theme.palette[tone].main, 0.06),
    }}
  >
    <Typography id={titleId} component={headingLevel} variant="subtitle1" sx={{ mb: 1.25, fontWeight: 700 }}>
      {title}
    </Typography>
    <Stack component="ul" spacing={0.875} sx={{ pl: 2.5, my: 0 }}>
      {items.map((item, index) => (
        <Typography
          component="li"
          variant="body2"
          key={index}
          sx={{ lineHeight: 1.6, overflowWrap: 'anywhere' }}
        >
          {item}
        </Typography>
      ))}
    </Stack>
  </Paper>
);

export const DoAvoid = ({
  doItems,
  avoidItems,
  doTitle = 'Do',
  avoidTitle = 'Avoid',
  headingLevel = 'h3',
  ariaLabel = 'Do and avoid guidance',
}: DoAvoidProps) => {
  const id = useId();

  return (
    <Box
      component="section"
      aria-label={ariaLabel}
      sx={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))',
        gap: 2,
        alignItems: 'stretch',
        maxWidth: '100%',
      }}
    >
      <GuidancePanel
        title={doTitle}
        titleId={`${id}-do`}
        items={doItems}
        tone="success"
        headingLevel={headingLevel}
      />
      <GuidancePanel
        title={avoidTitle}
        titleId={`${id}-avoid`}
        items={avoidItems}
        tone="warning"
        headingLevel={headingLevel}
      />
    </Box>
  );
};
