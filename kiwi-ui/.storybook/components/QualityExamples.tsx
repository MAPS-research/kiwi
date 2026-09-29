import type { ReactNode } from 'react';
import { alpha } from '@mui/material/styles';
import { Box, Paper, Stack, Typography } from '@mui/material';

export interface QualityRuleBlockProps {
  contract: readonly ReactNode[];
  visualLabel: string;
  children: ReactNode;
}

export const QualityRuleBlock = ({ contract, visualLabel, children }: QualityRuleBlockProps) => (
  <Box
    component="section"
    sx={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))',
      gap: 2,
      alignItems: 'stretch',
      my: 2.5,
      maxWidth: '100%',
    }}
  >
    <Paper
      component="section"
      data-ai-contract="true"
      aria-labelledby={`${visualLabel.replace(/\s+/g, '-').toLowerCase()}-contract`}
      variant="outlined"
      sx={{ minWidth: 0, p: { xs: 2, sm: 2.5 }, borderRadius: 2 }}
    >
      <Typography
        id={`${visualLabel.replace(/\s+/g, '-').toLowerCase()}-contract`}
        component="h3"
        variant="overline"
        sx={{ color: 'primary.main', fontWeight: 800, letterSpacing: '0.08em' }}
      >
        AI contract
      </Typography>
      <Stack component="ul" spacing={1} sx={{ pl: 2.5, mb: 0, mt: 1.25 }}>
        {contract.map((item, index) => (
          <Typography component="li" variant="body2" key={index} sx={{ lineHeight: 1.6 }}>
            {item}
          </Typography>
        ))}
      </Stack>
    </Paper>

    <Paper
      component="figure"
      aria-label={visualLabel}
      variant="outlined"
      sx={{ minWidth: 0, m: 0, p: { xs: 2, sm: 2.5 }, borderRadius: 2, bgcolor: 'background.default' }}
    >
      <Typography
        component="figcaption"
        variant="overline"
        sx={{ color: 'text.secondary', fontWeight: 800, letterSpacing: '0.08em' }}
      >
        Human visual example
      </Typography>
      <Box sx={{ mt: 1.5 }}>{children}</Box>
    </Paper>
  </Box>
);

const Surface = ({ children, label }: { children: ReactNode; label: string }) => (
  <Paper
    variant="outlined"
    aria-label={label}
    sx={{ minWidth: 0, overflow: 'hidden', borderRadius: 1.5, bgcolor: 'background.paper' }}
  >
    <Box sx={{ px: 1.25, py: 0.75, borderBottom: 1, borderColor: 'divider', bgcolor: 'action.hover' }}>
      <Typography variant="caption" sx={{ fontWeight: 700 }}>
        {label}
      </Typography>
    </Box>
    {children}
  </Paper>
);

const SkeletonLine = ({ width = '100%', height = 10 }: { width?: string; height?: number }) => (
  <Box
    aria-hidden="true"
    sx={{
      width,
      height,
      borderRadius: 99,
      bgcolor: 'action.disabledBackground',
      flex: '0 0 auto',
    }}
  />
);

const DataRow = ({ label, value }: { label: string; value: string }) => (
  <Box
    sx={{
      display: 'grid',
      gridTemplateColumns: 'minmax(58px, 0.8fr) minmax(64px, 1fr)',
      gap: 1,
      alignItems: 'center',
      minWidth: 0,
    }}
  >
    <Typography variant="caption" color="text.secondary" noWrap>
      {label}
    </Typography>
    <Typography variant="caption" sx={{ fontWeight: 700, overflowWrap: 'anywhere' }}>
      {value}
    </Typography>
  </Box>
);

export const AccessibilityExample = () => (
  <Stack spacing={1.25} aria-label="Accessible field states">
    <Typography component="label" variant="caption" sx={{ fontWeight: 800 }}>
      Workspace name
    </Typography>
    <Box
      sx={{
        px: 1.25,
        py: 1,
        borderRadius: 1,
        border: 2,
        borderColor: 'primary.main',
        outline: '2px solid',
        outlineColor: (theme) => alpha(theme.palette.primary.main, 0.22),
        outlineOffset: 2,
      }}
    >
      <Typography variant="body2">Kiwi Analytics</Typography>
    </Box>
    <Typography variant="caption" color="text.secondary">
      Visible label and focus indicator; the control keeps a stable accessible name.
    </Typography>
    <Box
      role="alert"
      sx={{
        display: 'grid',
        gridTemplateColumns: '20px 1fr',
        gap: 0.75,
        alignItems: 'start',
        p: 1,
        borderRadius: 1,
        bgcolor: (theme) => alpha(theme.palette.error.main, 0.08),
        color: 'error.dark',
      }}
    >
      <Typography aria-hidden="true" variant="caption" sx={{ fontWeight: 900 }}>
        !
      </Typography>
      <Typography variant="caption">Name is required. Error is conveyed with text, not color alone.</Typography>
    </Box>
  </Stack>
);

export const AsyncStateExample = () => (
  <Box
    sx={{
      display: 'grid',
      gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, minmax(0, 1fr))' },
      gap: 1.25,
    }}
  >
    <Surface label="Weak network · Loading">
      <Stack spacing={1.2} sx={{ p: 1.5, minHeight: 132 }}>
        <SkeletonLine width="58%" height={14} />
        <SkeletonLine />
        <SkeletonLine width="86%" />
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, pt: 0.5 }}>
          <SkeletonLine height={36} />
          <SkeletonLine height={36} />
        </Box>
      </Stack>
    </Surface>
    <Surface label="Settled · Same geometry">
      <Stack spacing={1.2} sx={{ p: 1.5, minHeight: 132 }}>
        <Typography variant="subtitle2" sx={{ lineHeight: '14px' }}>
          Usage summary
        </Typography>
        <DataRow label="Requests" value="12,480" />
        <DataRow label="Success" value="99.4%" />
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, pt: 0.5 }}>
          <Box sx={{ height: 36, borderRadius: 1, bgcolor: 'action.hover' }} />
          <Box sx={{ height: 36, borderRadius: 1, bgcolor: 'action.hover' }} />
        </Box>
      </Stack>
    </Surface>
    <Surface label="Offline · Recovery">
      <Stack spacing={1} sx={{ p: 1.5, minHeight: 132, justifyContent: 'center' }}>
        <Typography variant="subtitle2">Couldn’t load usage</Typography>
        <Typography variant="caption" color="text.secondary">
          Check your connection. Your previous filters are preserved.
        </Typography>
        <Box
          component="span"
          sx={{ alignSelf: 'flex-start', px: 1.25, py: 0.6, borderRadius: 1, bgcolor: 'primary.main', color: 'primary.contrastText', fontSize: 12, fontWeight: 700 }}
        >
          Retry
        </Box>
      </Stack>
    </Surface>
  </Box>
);

const ViewportFrame = ({ label, columns }: { label: string; columns: string }) => (
  <Surface label={label}>
    <Box sx={{ p: 1, display: 'grid', gridTemplateColumns: columns, gap: 0.75, minHeight: 112 }}>
      <Box sx={{ borderRadius: 1, bgcolor: 'action.selected', minHeight: 28 }} />
      <Stack spacing={0.75} sx={{ minWidth: 0 }}>
        <SkeletonLine width="65%" height={11} />
        <SkeletonLine />
        <SkeletonLine width="82%" />
        <Box sx={{ display: 'grid', gridTemplateColumns: columns === '1fr' ? '1fr' : '1fr 1fr', gap: 0.75 }}>
          <Box sx={{ height: 34, borderRadius: 1, bgcolor: 'action.hover' }} />
          <Box sx={{ height: 34, borderRadius: 1, bgcolor: 'action.hover' }} />
        </Box>
      </Stack>
    </Box>
  </Surface>
);

export const ViewportExample = () => (
  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, minmax(0, 1fr))' }, gap: 1.25 }}>
    <ViewportFrame label="390 px · stacked" columns="1fr" />
    <ViewportFrame label="768 px · adaptive" columns="0.7fr 1.3fr" />
    <ViewportFrame label="1440 px · bounded" columns="0.55fr 1.45fr" />
  </Box>
);

const DensityCard = ({ label, rows, gap, tone }: { label: string; rows: number; gap: number; tone: 'warning' | 'success' }) => (
  <Paper
    variant="outlined"
    sx={{
      p: 1.25,
      minWidth: 0,
      borderColor: `${tone}.main`,
      bgcolor: (theme) => alpha(theme.palette[tone].main, 0.045),
    }}
  >
    <Typography variant="caption" sx={{ display: 'block', mb: 1, fontWeight: 800 }}>
      {label}
    </Typography>
    <Stack spacing={`${gap}px`}>
      {Array.from({ length: rows }, (_, index) => (
        <Box key={index} sx={{ display: 'grid', gridTemplateColumns: '34% 1fr', gap: 0.75 }}>
          <SkeletonLine height={7} />
          <SkeletonLine width={index % 2 ? '72%' : '100%'} height={7} />
        </Box>
      ))}
    </Stack>
  </Paper>
);

export const DensityExample = () => (
  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, minmax(0, 1fr))' }, gap: 1.25 }}>
    <DensityCard label="Too sparse" rows={3} gap={22} tone="warning" />
    <DensityCard label="Balanced" rows={6} gap={9} tone="success" />
    <DensityCard label="Too dense" rows={10} gap={2} tone="warning" />
  </Box>
);

const FieldList = ({ expanded }: { expanded: boolean }) => {
  const rows = expanded
    ? [
        ['Status', 'Active'],
        ['Owner', 'Operations'],
        ['Region', 'Asia Pacific'],
        ['Plan', 'Enterprise'],
        ['Created', '13 Aug 2026'],
        ['Renewal', '30 Sep 2026'],
        ['Seats', '128'],
      ]
    : [
        ['Status', 'Active'],
        ['Owner', 'Operations'],
        ['Region', 'Asia Pacific'],
      ];

  return (
    <Surface label={expanded ? 'Future · 7 fields · scroll' : 'Today · 3 fields'}>
      <Stack
        spacing={0.8}
        tabIndex={expanded ? 0 : undefined}
        aria-label={expanded ? 'Scrollable details region' : 'Details region'}
        sx={{
          p: 1.25,
          height: 118,
          overflowY: expanded ? 'auto' : 'hidden',
          scrollbarGutter: 'stable',
          scrollbarWidth: 'thin',
          '&::-webkit-scrollbar': { width: 6 },
          '&::-webkit-scrollbar-thumb': { borderRadius: 99, bgcolor: 'action.disabled' },
          outlineOffset: -2,
          '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.main' },
        }}
      >
        {rows.map(([label, value]) => (
          <DataRow key={label} label={label} value={value} />
        ))}
      </Stack>
      <Box sx={{ px: 1.25, py: 0.8, borderTop: 1, borderColor: 'divider' }}>
        <Typography variant="caption" sx={{ fontWeight: 700 }}>
          Stable action area
        </Typography>
      </Box>
    </Surface>
  );
};

export const FieldGrowthExample = () => (
  <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 180px), 1fr))', gap: 1.25 }}>
    <FieldList expanded={false} />
    <FieldList expanded />
  </Box>
);
