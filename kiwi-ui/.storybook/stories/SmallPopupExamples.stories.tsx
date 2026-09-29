import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import {
  Box,
  Button,
  Fade,
  MenuItem,
  Paper,
  Popover,
  useMediaQuery,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import {
  AnalyticsDateRangeControl,
  type AnalyticsDateRangeValue,
} from "../../src/components/Analytics/AnalyticsDateRangeControl.tsx";
import ClassSwitcher from "../../src/components/TopNav/ClassSwitcher.tsx";
import { COMPACT_POPUP_TYPOGRAPHY } from "../../src/theme/compactPopup.ts";
import { POPUP_FADE_DURATION_MS } from "../../src/theme/motion.ts";

const ActionMenuPreview = () => {
  const reduceMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [selected, setSelected] = useState("Most recent");

  return (
    <Box sx={{ minHeight: 240 }}>
      <Button
        variant="outlined"
        aria-haspopup="menu"
        aria-expanded={Boolean(anchor)}
        onClick={(event) => setAnchor(event.currentTarget)}
        endIcon={<ExpandMoreRoundedIcon fontSize="small" />}
        sx={COMPACT_POPUP_TYPOGRAPHY.primary}
      >
        Sort: {selected}
      </Button>
      <Popover
        open={Boolean(anchor)}
        anchorEl={anchor}
        onClose={() => setAnchor(null)}
        slots={{ transition: Fade }}
        transitionDuration={reduceMotion ? 0 : POPUP_FADE_DURATION_MS}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
        marginThreshold={12}
        slotProps={{
          paper: {
            sx: {
              mt: 0.75,
              minWidth: 184,
              p: 0.75,
              border: 1,
              borderColor: "divider",
              borderRadius: 1.75,
              boxShadow: (theme) =>
                `0 12px 32px ${alpha(theme.palette.common.black, 0.12)}`,
            },
          },
        }}
      >
        {["Most recent", "Name", "Activity"].map((label) => (
          <MenuItem
            key={label}
            selected={selected === label}
            onClick={() => {
              setSelected(label);
              setAnchor(null);
            }}
            sx={{ minHeight: 40, borderRadius: 1.25, ...COMPACT_POPUP_TYPOGRAPHY.primary }}
          >
            {label}
          </MenuItem>
        ))}
      </Popover>
    </Box>
  );
};

const ClassSelectorPreview = () => {
  const [selectedClassId, setSelectedClassId] = useState("physics-101");
  const options = [
    { id: "physics-101", label: "Physics 101" },
    { id: "chemistry-201", label: "Chemistry 201" },
    { id: "biology-110", label: "Biology 110" },
  ];

  return (
    <Box sx={{ minHeight: 420 }}>
      <ClassSwitcher
        options={options}
        selectedClassId={selectedClassId}
        onClassChange={setSelectedClassId}
      />
    </Box>
  );
};

const DateRangePreview = () => {
  const [range, setRange] = useState<AnalyticsDateRangeValue>({
    startDate: "2026-08-13",
    startTime: "00:00",
    endDate: "2026-08-19",
    endTime: "23:59",
  });

  return (
    <Box sx={{ minHeight: 720 }}>
      <AnalyticsDateRangeControl
        value={range}
        now={new Date("2026-08-19T18:45:00+08:00")}
        timeZone="Asia/Shanghai"
        onApply={setRange}
      />
    </Box>
  );
};

const meta = {
  title: "Kiwi Design System/Popups/Examples",
  parameters: {
    layout: "padded",
  },
  decorators: [
    (Story) => (
      <Paper elevation={0} sx={{ minHeight: 280, p: 3, bgcolor: "background.default" }}>
        <Story />
      </Paper>
    ),
  ],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const ActionMenu: Story = {
  name: "Action menu",
  render: () => <ActionMenuPreview />,
};

export const ClassSelector: Story = {
  name: "Class selector",
  render: () => <ClassSelectorPreview />,
};

export const DateRange: Story = {
  name: "Date range",
  render: () => <DateRangePreview />,
};
