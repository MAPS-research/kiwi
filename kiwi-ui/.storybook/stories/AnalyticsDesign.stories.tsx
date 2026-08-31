import type { ReactNode } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { LoaderCircle, RefreshCw } from 'lucide-react';
import { Badge } from '../../src/components/ui/badge.tsx';
import { Button } from '../../src/components/ui/button.tsx';
import { Skeleton } from '../../src/components/ui/skeleton.tsx';
import { DoAvoid } from '../components/DoAvoid.tsx';
import designSystem from '../design-system/catalog.json' with { type: 'json' };

const analyticsContract = designSystem.productGuides.analytics;

const Code = ({ children }: { children: ReactNode }) => (
  <code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.875em]">{children}</code>
);

const GuideSection = ({ title, children }: { title: string; children: ReactNode }) => {
  const id = `analytics-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`;

  return (
    <section aria-labelledby={id} className="border-t py-8 md:py-10">
      <h2 id={id} className="mb-5 text-xl font-bold">
        {title}
      </h2>
      <div className="flex flex-col gap-5">{children}</div>
    </section>
  );
};

const Principle = ({ title, children }: { title: string; children: ReactNode }) => (
  <div className="h-full rounded-xl border bg-card p-4 md:p-5">
    <h3 className="mb-1.5 text-sm font-semibold">{title}</h3>
    <div className="text-sm text-muted-foreground">{children}</div>
  </div>
);

const InfoNote = ({ children }: { children: ReactNode }) => (
  <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm">{children}</div>
);

const MetricExample = ({ loading }: { loading: boolean }) => (
  <div className="box-border h-33 rounded-xl border bg-card p-5">
    <p className="h-5 text-sm leading-5 text-muted-foreground">Primary metric</p>
    <div className="flex h-11 items-center">
      {loading ? (
        <Skeleton className="h-8 w-24" />
      ) : (
        <p className="text-3xl leading-11 font-semibold">1,248</p>
      )}
    </div>
    <p className="block h-4.5 text-xs text-muted-foreground">Unique entities in scope</p>
  </div>
);

const ChartExample = ({ loading }: { loading: boolean }) => (
  <div className="box-border h-80 rounded-xl border bg-card p-5">
    <h3 className="text-sm font-semibold">Daily trend</h3>
    <p className="text-sm text-muted-foreground">Unique entities recorded each day</p>
    <div className="mt-3 h-55.5">
      {loading ? (
        <Skeleton className="h-full w-full rounded-lg" />
      ) : (
        <div
          className="h-full rounded-lg"
          style={{
            background: 'linear-gradient(180deg, rgba(106,27,154,0.24) 0%, rgba(106,27,154,0.04) 100%)',
            clipPath:
              'polygon(0 72%, 16% 52%, 31% 66%, 48% 24%, 63% 42%, 81% 18%, 100% 38%, 100% 100%, 0 100%)',
          }}
        />
      )}
    </div>
  </div>
);

const ContractRow = ({
  metric,
  definition,
  presentation,
}: {
  metric: string;
  definition: string;
  presentation: string;
}) => (
  <div className="grid gap-1 border-t py-3 first:border-t-0 md:gap-4 md:[grid-template-columns:160px_1fr_1fr]">
    <span className="text-sm font-semibold">{metric}</span>
    <span className="text-sm text-muted-foreground">{definition}</span>
    <span className="text-sm text-muted-foreground">{presentation}</span>
  </div>
);

export const AnalyticsDesignGuide = ({
  loading = false,
  embedded = false,
}: {
  loading?: boolean;
  embedded?: boolean;
}) => (
  <div className="sb-unstyled mx-auto max-w-[1180px] px-4 sm:px-6 md:px-8">
    {!embedded && (
      <header className="pt-6 pb-8 md:pt-10 md:pb-10">
        <div className="mb-3 flex flex-wrap gap-2">
          <Badge>Analytics</Badge>
          <Badge variant="outline">Design pattern</Badge>
          <Badge variant="outline">Responsive</Badge>
        </div>
        <h1 className="text-4xl font-bold tracking-[-0.03em]">Analytics design</h1>
        <p className="mt-2 max-w-[820px] text-base text-muted-foreground">
          A shared contract for information hierarchy, metric semantics, chart density, responsive behavior, refresh
          coordination, and stable loading states across Kiwi analytics pages.
        </p>
      </header>
    )}

    <GuideSection title="1. Information hierarchy">
      <div className="grid gap-4 md:grid-cols-3">
        <Principle title="Page title">
          Names the product surface: <Code>Analytics</Code>. The page header owns global actions such as Refresh and
          Last updated.
        </Principle>
        <Principle title="Section title">
          Groups related questions, such as <Code>Overview</Code>, <Code>Trends</Code>, <Code>Breakdown</Code>, and{' '}
          <Code>Rankings</Code>. Section titles have no subtitles.
        </Principle>
        <Principle title="Card title">
          Names the exact visualization. Its subtitle is fixed descriptive copy, never a second section title and
          never a changing total.
        </Principle>
      </div>
      <InfoNote>
        Use semantic headings in the same order: page <Code>h1</Code>, section <Code>h2</Code>, card <Code>h3</Code>.
      </InfoNote>
    </GuideSection>

    <GuideSection title="2. Metric contracts before visual design">
      <div className="rounded-xl border bg-card px-4 md:px-5">
        {analyticsContract.metricContracts.map((row) => (
          <ContractRow key={row.metric} metric={row.metric} definition={row.definition} presentation={row.presentation} />
        ))}
      </div>
      <DoAvoid doItems={analyticsContract.metricGuidance.do} avoidItems={analyticsContract.metricGuidance.avoid} />
    </GuideSection>

    <GuideSection title="3. Loading without layout shift">
      <p className="max-w-[820px] text-sm text-muted-foreground">
        Toggle the Storybook <Code>loading</Code> control. Titles, descriptions, card dimensions, and surrounding
        layout remain stable. Only data-bearing regions change to Skeleton.
      </p>
      <div className="grid items-stretch gap-4 md:[grid-template-columns:1fr_2fr]">
        <MetricExample loading={loading} />
        <ChartExample loading={loading} />
      </div>
      <ul className="flex list-disc flex-col gap-2 pl-5 text-sm">
        <li>Fix summary-card height and reserve identical slots for label, value, and description.</li>
        <li>Skeleton dimensions must match the final chart, legend, list row, or dialog table region.</li>
        <li>Keep titles and descriptive subtitles visible; they are orientation, not remote data.</li>
        <li>
          The only spinner on the page belongs in the Refresh icon slot. Keep its width and height equal to the
          refresh icon.
        </li>
      </ul>
    </GuideSection>

    <GuideSection title="4. Date range and refresh are one state machine">
      <div className="rounded-xl border bg-card p-4">
        <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-end">
          <div className="min-w-0 sm:mr-1">
            <span className="block text-xs leading-tight text-muted-foreground">Last updated</span>
            <span className="mt-0.5 block text-sm font-medium whitespace-nowrap">Aug 12, 2026, 6:24 PM</span>
          </div>
          <Button variant="outline" disabled={loading} className="shrink-0 self-start sm:self-center">
            {loading ? (
              <LoaderCircle data-icon="inline-start" aria-hidden="true" className="animate-spin" />
            ) : (
              <RefreshCw data-icon="inline-start" />
            )}
            Refresh
          </Button>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Principle title="Immediate pending state">
          Date input state and loading state change in the same render. The 300ms debounce delays the request, not
          the Skeleton. This prevents old data from briefly redrawing against a new date range.
        </Principle>
        <Principle title="Latest request wins">
          Assign every analytics request an increasing ID. Ignore responses and <Code>finally</Code> handlers from
          stale requests so they cannot replace new data or stop the current loading state.
        </Principle>
        <Principle title="One refresh entry point">
          Refresh all persistent API sources in parallel and update Last updated only after the coordinated refresh
          completes. Detail dialogs remain click-to-load.
        </Principle>
        <Principle title="API scope stays explicit">
          A global endpoint does not become date-filtered because it is displayed below a date picker. Either add a
          backend filter or clearly keep it outside the range contract.
        </Principle>
      </div>
    </GuideSection>

    <GuideSection title="5. Chart density and Recharts spacing">
      <DoAvoid doItems={analyticsContract.chartDensity.do} avoidItems={analyticsContract.chartDensity.avoid} />
    </GuideSection>

    <GuideSection title="6. Responsive composition">
      <div className="grid gap-4 md:grid-cols-3">
        <Principle title="Mixed chart cards">
          Desktop: three equal columns. Tablet: two columns. Mobile: one column. Pie cards use chart-over-legend,
          while category charts use horizontal bars to make equal-width cards useful.
        </Principle>
        <Principle title="Ranked lists">
          Desktop: two columns of five lightweight ranking rows. Mobile: one column. Avoid a dense table nested in a
          card; use whitespace, alignment, and hover to group information.
        </Principle>
        <Principle title="Header and controls">
          Stack the Admin header before content becomes compressed. Keep Last updated left-aligned after the first
          responsive break and let date presets scroll rather than wrap unpredictably.
        </Principle>
      </div>
    </GuideSection>

    <GuideSection title="7. Lists, overflow, and detail dialogs">
      <ul className="flex list-disc flex-col gap-2 pl-5 text-sm">
        <li>Truncate long entity labels and identifiers with ellipsis, then expose the full value in a Tooltip.</li>
        <li>
          Keep values and units on the same line. A label should read as one unit: <Code>48,120 units</Code>.
        </li>
        <li>Ranking numbers need no border or background; hierarchy comes from position, alignment, weight, and color.</li>
        <li>
          Use an upper-right close icon in dialogs. Desktop can use a sortable table; mobile should use a full-screen
          dialog with compact stacked rows and explicit sort controls.
        </li>
        <li>A detail row does not open another modal unless a second level of detail is genuinely necessary.</li>
      </ul>
    </GuideSection>

    <GuideSection title="8. Analytics review checklist">
      <div className="grid gap-3 md:grid-cols-2">
        {analyticsContract.reviewChecklist.map((item, index) => (
          <div key={item} className="flex items-start gap-3">
            <span className="pt-0.5 text-xs font-bold text-primary">{String(index + 1).padStart(2, '0')}</span>
            <span className="text-sm">{item}</span>
          </div>
        ))}
      </div>
    </GuideSection>
  </div>
);

const meta = {
  title: 'Guidelines/Analytics/Examples',
  component: AnalyticsDesignGuide,
  excludeStories: ['AnalyticsDesignGuide'],
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
