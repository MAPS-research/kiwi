import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Paper } from "@mui/material";
import {
  AnalyticsDateRangeControl,
} from "../../src/components/Analytics/AnalyticsDateRangeControl.tsx";
import type { AnalyticsDateRangeValue } from "../../src/components/Analytics/AnalyticsDateRangeControl.tsx";
import { AdminPageHeader } from "../../src/components/AdminPage/index.ts";

const AnalyticsHeaderPreview = () => {
  const [range, setRange] = useState<AnalyticsDateRangeValue>({
    startDate: "2026-08-13",
    startTime: "00:00",
    endDate: "2026-08-19",
    endTime: "23:59",
  });
  const [lastUpdated, setLastUpdated] = useState(new Date("2026-08-19T10:27:00"));

  return (
    <AdminPageHeader
      title="System Analytics"
      description="Usage and engagement across Kiwi."
      actions={
        <AnalyticsDateRangeControl
          value={range}
          now={new Date("2026-08-19T18:45:00+08:00")}
          timeZone="Asia/Shanghai"
          lastUpdated={lastUpdated}
          onApply={setRange}
          onRefresh={() => setLastUpdated(new Date())}
        />
      }
    />
  );
};

const meta = {
  title: "Kiwi Design System/Patterns/Analytics Date Range",
  component: AnalyticsDateRangeControl,
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <Paper square sx={{ minHeight: 760, p: { xs: 2, sm: 4 }, bgcolor: "background.default" }}>
        <Story />
      </Paper>
    ),
  ],
  parameters: {
    docs: {
      description: {
        component:
          "Compact System Analytics header control for preset and custom local-time date ranges. Date edits remain drafts until Apply is pressed.",
      },
    },
  },
} satisfies Meta<typeof AnalyticsDateRangeControl>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Header: Story = {
  args: {
    value: {
      startDate: "2026-08-13",
      startTime: "00:00",
      endDate: "2026-08-19",
      endTime: "23:59",
    },
    onApply: () => undefined,
  },
  render: () => <AnalyticsHeaderPreview />,
};
