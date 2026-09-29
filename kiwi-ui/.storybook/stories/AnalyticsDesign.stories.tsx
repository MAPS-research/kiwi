import type { ReactNode } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import RefreshOutlinedIcon from '@mui/icons-material/RefreshOutlined';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Grid,
  Paper,
  Skeleton,
  Stack,
  Typography,
} from '@mui/material';
import { DoAvoid } from '../components/DoAvoid.tsx';
import designSystem from '../design-system/catalog.json' with { type: 'json' };

const analyticsContract = designSystem.productGuides.analytics;

const Code = ({ children }: { children: ReactNode }) => (
  <Box
    component="code"
    sx={{
      px: 0.5,
      py: 0.125,
      borderRadius: 0.5,
      bgcolor: 'action.hover',
      fontFamily: 'monospace',
      fontSize: '0.875em',
    }}
  >
    {children}
  </Box>
);

const GuideSection = ({ title, children }: { title: string; children: ReactNode }) => {
  const id = `analytics-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`;

  return (
    <Box
      component="section"
      aria-labelledby={id}
      sx={{
        py: { xs: 4, md: 5 },
        borderTop: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Typography id={id} component="h2" variant="h5" sx={{ mb: 2.5, fontWeight: 700 }}>
        {title}
      </Typography>
      <Stack spacing={2.5}>{children}</Stack>
    </Box>
  );
};

const Principle = ({ title, children }: { title: string; children: ReactNode }) => (
  <Paper variant="outlined" sx={{ p: { xs: 2, md: 2.5 }, height: '100%', borderRadius: 2 }}>
    <Typography component="h3" variant="subtitle1" sx={{ mb: 0.75, fontWeight: 650 }}>
      {title}
    </Typography>
    <Typography component="div" variant="body2" sx={{
      color: "text.secondary"
    }}>
      {children}
    </Typography>
  </Paper>
);

const MetricExample = ({ loading }: { loading: boolean }) => (
  <Paper variant="outlined" sx={{ p: 2.5, height: 132, boxSizing: 'border-box', borderRadius: 2 }}>
    <Typography
      variant="body2"
      sx={{
        color: "text.secondary",
        height: 20,
        lineHeight: '20px'
      }}>
      Primary metric
    </Typography>
    <Box sx={{ height: 44, display: 'flex', alignItems: 'center' }}>
      {loading ? (
        <Skeleton variant="text" width={96} height={44} />
      ) : (
        <Typography component="p" variant="h4" sx={{ fontWeight: 600, lineHeight: '44px' }}>
          1,248
        </Typography>
      )}
    </Box>
    <Typography
      variant="caption"
      sx={{
        color: "text.secondary",
        display: 'block',
        height: 18
      }}>
      Unique entities in scope
    </Typography>
  </Paper>
);

const ChartExample = ({ loading }: { loading: boolean }) => (
  <Card variant="outlined" sx={{ height: 320, borderRadius: 2, boxShadow: 'none' }}>
    <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 }, height: '100%', boxSizing: 'border-box' }}>
      <Typography component="h3" variant="subtitle1" sx={{ fontWeight: 600 }}>
        Daily trend
      </Typography>
      <Typography variant="body2" sx={{
        color: "text.secondary"
      }}>
        Unique entities recorded each day
      </Typography>
      <Box sx={{ mt: 1.5, height: 222 }}>
        {loading ? (
          <Skeleton variant="rounded" width="100%" height="100%" sx={{ borderRadius: 1.5 }} />
        ) : (
          <Box
            sx={{
              height: '100%',
              borderRadius: 1.5,
              background:
                'linear-gradient(180deg, rgba(99,102,241,0.24) 0%, rgba(99,102,241,0.04) 100%)',
              clipPath: 'polygon(0 72%, 16% 52%, 31% 66%, 48% 24%, 63% 42%, 81% 18%, 100% 38%, 100% 100%, 0 100%)',
            }}
          />
        )}
      </Box>
    </CardContent>
  </Card>
);

const ContractRow = ({ metric, definition, presentation }: { metric: string; definition: string; presentation: string }) => (
  <Box
    sx={{
      display: 'grid',
      gridTemplateColumns: { xs: '1fr', md: '160px 1fr 1fr' },
      gap: { xs: 0.5, md: 2 },
      py: 1.5,
      borderTop: '1px solid',
      borderColor: 'divider',
    }}
  >
    <Typography variant="body2" sx={{ fontWeight: 650 }}>
      {metric}
    </Typography>
    <Typography variant="body2" sx={{
      color: "text.secondary"
    }}>
      {definition}
    </Typography>
    <Typography variant="body2" sx={{
      color: "text.secondary"
    }}>
      {presentation}
    </Typography>
  </Box>
);

export const AnalyticsDesignGuide = ({
  loading = false,
  embedded = false,
}: {
  loading?: boolean;
  embedded?: boolean;
}) => (
  <Box sx={{ px: { xs: 2, sm: 3, md: 4 }, maxWidth: 1180, mx: 'auto' }}>
    {!embedded && (
      <Box component="header" sx={{ pt: { xs: 3, md: 5 }, pb: { xs: 4, md: 5 } }}>
        <Stack direction="row" spacing={1} sx={{ mb: 1.5, flexWrap: 'wrap' }} useFlexGap>
          <Chip label="Analytics" color="primary" size="small" />
          <Chip label="Design pattern" variant="outlined" size="small" />
          <Chip label="Responsive" variant="outlined" size="small" />
        </Stack>
        <Typography component="h1" variant="h3" sx={{ fontWeight: 750, letterSpacing: '-0.03em' }}>
          Analytics design
        </Typography>
        <Typography
          variant="body1"
          sx={{
            color: "text.secondary",
            mt: 1,
            maxWidth: 820
          }}>
          A shared contract for information hierarchy, metric semantics, chart density, responsive behavior, refresh
          coordination, and stable loading states across Kiwi analytics pages.
        </Typography>
      </Box>
    )}

    <GuideSection title="1. Information hierarchy">
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 4 }}>
          <Principle title="Page title">
            Names the product surface: <Code>Analytics</Code>. The page header owns global actions such as Refresh and
            Last updated.
          </Principle>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <Principle title="Section title">
            Groups related questions, such as <Code>Overview</Code>, <Code>Trends</Code>, <Code>Breakdown</Code>, and{' '}
            <Code>Rankings</Code>. Section titles have no subtitles.
          </Principle>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <Principle title="Card title">
            Names the exact visualization. Its subtitle is fixed descriptive copy, never a second section title and
            never a changing total.
          </Principle>
        </Grid>
      </Grid>
      <Alert severity="info">
        Use semantic headings in the same order: page <Code>h1</Code>, section <Code>h2</Code>, card <Code>h3</Code>.
      </Alert>
    </GuideSection>

    <GuideSection title="2. Metric contracts before visual design">
      <Paper
        variant="outlined"
        sx={{ px: { xs: 2, md: 2.5 }, borderRadius: 2, '& > div:first-of-type': { borderTop: 0 } }}
      >
        {analyticsContract.metricContracts.map((row) => (
          <ContractRow key={row.metric} metric={row.metric} definition={row.definition} presentation={row.presentation} />
        ))}
      </Paper>
      <DoAvoid doItems={analyticsContract.metricGuidance.do} avoidItems={analyticsContract.metricGuidance.avoid} />
    </GuideSection>

    <GuideSection title="3. Loading without layout shift">
      <Typography
        variant="body2"
        sx={{
          color: "text.secondary",
          maxWidth: 820
        }}>
        Toggle the Storybook <Code>loading</Code> control. Titles, descriptions, card dimensions, and surrounding
        layout remain stable. Only data-bearing regions change to Skeleton.
      </Typography>
      <Grid container spacing={2} sx={{
        alignItems: "stretch"
      }}>
        <Grid size={{ xs: 12, md: 4 }}>
          <MetricExample loading={loading} />
        </Grid>
        <Grid size={{ xs: 12, md: 8 }}>
          <ChartExample loading={loading} />
        </Grid>
      </Grid>
      <Stack spacing={1.25}>
        <Typography variant="body2">
          • Fix summary-card height and reserve identical slots for label, value, and description.
        </Typography>
        <Typography variant="body2">
          • Skeleton dimensions must match the final chart, legend, list row, or dialog table region.
        </Typography>
        <Typography variant="body2">
          • Keep titles and descriptive subtitles visible; they are orientation, not remote data.
        </Typography>
        <Typography variant="body2">
          • The only spinner on the page belongs in the Refresh icon slot. Keep its width and height equal to the
          refresh icon.
        </Typography>
      </Stack>
    </GuideSection>

    <GuideSection title="4. Date range and refresh are one state machine">
      <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1.5}
          sx={{
            alignItems: { xs: 'flex-start', sm: 'center' },
            justifyContent: "flex-end"
          }}>
          <Box sx={{ minWidth: 0, mr: { sm: 0.5 } }}>
            <Typography
              variant="caption"
              sx={{
                color: "text.secondary",
                display: 'block',
                lineHeight: 1.2
              }}>
              Last updated
            </Typography>
            <Typography variant="body2" sx={{ mt: 0.25, fontWeight: 550, whiteSpace: 'nowrap' }}>
              Aug 12, 2026, 6:24 PM
            </Typography>
          </Box>
          <Button
            variant="outlined"
            disabled={loading}
            startIcon={
              <Box sx={{ width: 24, height: 24, display: 'grid', placeItems: 'center' }}>
                {loading ? <CircularProgress size={18} color="inherit" /> : <RefreshOutlinedIcon />}
              </Box>
            }
            sx={{ flex: '0 0 auto', alignSelf: { xs: 'flex-start', sm: 'center' } }}
          >
            Refresh
          </Button>
        </Stack>
      </Paper>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Principle title="Immediate pending state">
            Date input state and loading state change in the same render. The 300ms debounce delays the request, not
            the Skeleton. This prevents old data from briefly redrawing against a new date range.
          </Principle>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Principle title="Latest request wins">
            Assign every analytics request an increasing ID. Ignore responses and <Code>finally</Code> handlers from
            stale requests so they cannot replace new data or stop the current loading state.
          </Principle>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Principle title="One refresh entry point">
            Refresh all persistent API sources in parallel and update Last updated only after the coordinated refresh
            completes. Detail dialogs remain click-to-load.
          </Principle>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Principle title="API scope stays explicit">
            A global endpoint does not become date-filtered because it is displayed below a date picker. Either add a
            backend filter or clearly keep it outside the range contract.
          </Principle>
        </Grid>
      </Grid>
    </GuideSection>

    <GuideSection title="5. Chart density and Recharts spacing">
      <DoAvoid doItems={analyticsContract.chartDensity.do} avoidItems={analyticsContract.chartDensity.avoid} />
    </GuideSection>

    <GuideSection title="6. Responsive composition">
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 4 }}>
          <Principle title="Mixed chart cards">
            Desktop: three equal columns. Tablet: two columns. Mobile: one column. Pie cards use chart-over-legend,
            while category charts use horizontal bars to make equal-width cards useful.
          </Principle>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <Principle title="Ranked lists">
            Desktop: two columns of five lightweight ranking rows. Mobile: one column. Avoid a dense table nested in a
            card; use whitespace, alignment, and hover to group information.
          </Principle>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <Principle title="Header and controls">
            Stack the Admin header before content becomes compressed. Keep Last updated left-aligned after the first
            responsive break and let date presets scroll rather than wrap unpredictably.
          </Principle>
        </Grid>
      </Grid>
    </GuideSection>

    <GuideSection title="7. Lists, overflow, and detail dialogs">
      <Stack spacing={1.25}>
        <Typography variant="body2">
          • Truncate long entity labels and identifiers with ellipsis, then expose the full value in a Tooltip.
        </Typography>
        <Typography variant="body2">
          • Keep values and units on the same line. A label should read as one unit: <Code>48,120 units</Code>.
        </Typography>
        <Typography variant="body2">
          • Ranking numbers need no border or background; hierarchy comes from position, alignment, weight, and color.
        </Typography>
        <Typography variant="body2">
          • Use an upper-right close icon in dialogs. Desktop can use a sortable table; mobile should use a full-screen
          dialog with compact stacked rows and explicit sort controls.
        </Typography>
        <Typography variant="body2">
          • A detail row does not open another modal unless a second level of detail is genuinely necessary.
        </Typography>
      </Stack>
    </GuideSection>

    <GuideSection title="8. Analytics review checklist">
      <Grid container spacing={1.5}>
        {analyticsContract.reviewChecklist.map((item, index) => (
          <Grid key={item} size={{ xs: 12, md: 6 }}>
            <Stack direction="row" spacing={1.25} sx={{
              alignItems: "flex-start"
            }}>
              <Typography variant="caption" color="primary" sx={{ pt: 0.25, fontWeight: 700 }}>
                {String(index + 1).padStart(2, '0')}
              </Typography>
              <Typography variant="body2">{item}</Typography>
            </Stack>
          </Grid>
        ))}
      </Grid>
    </GuideSection>
  </Box>
);

const meta = {
  title: 'Kiwi Design System/Product Guides/Analytics/Examples',
  component: AnalyticsDesignGuide,
  tags: [],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'A reusable design and implementation contract for analytics pages. Metric contracts, chart-density guidance, and the review checklist are rendered from the machine-readable catalog (`.storybook/design-system/catalog.json`), which is the single source for these lists.',
      },
    },
  },
  args: {
    embedded: false,
    loading: false,
  },
  argTypes: {
    loading: {
      control: 'boolean',
      description: 'Demonstrates layout-stable Skeleton states and the Refresh spinner.',
    },
    embedded: {
      control: false,
      table: { disable: true },
    },
  },
} satisfies Meta<typeof AnalyticsDesignGuide>;

export default meta;
type Story = StoryObj<typeof meta>;

export const InteractiveContract: Story = {
  name: 'Interactive contract',
};
