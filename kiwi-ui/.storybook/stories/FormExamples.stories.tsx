import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import SaveOutlinedIcon from "@mui/icons-material/SaveOutlined";
import {
  Box,
  Button,
  FormControlLabel,
  MenuItem,
  Paper,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import {
  AdminFormActions,
  AdminFormSection,
  AdminFormSurface,
  AdminPage,
  AdminPageHeader,
} from "../../src/components/AdminPage/index.ts";

const BasicFormPreview = () => (
  <Box
    component="form"
    onSubmit={(event) => event.preventDefault()}
    sx={{ width: "min(100%, 560px)" }}
  >
    <Stack spacing={3}>
      <Box>
        <Typography component="h2" variant="h6">
          Create profile
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Add the information people will use to identify you.
        </Typography>
      </Box>
      <Stack spacing={2.5}>
        <TextField required fullWidth label="Display name" autoComplete="name" />
        <TextField
          required
          fullWidth
          label="Email"
          type="email"
          autoComplete="email"
          helperText="Used for account notifications."
        />
      </Stack>
      <Stack direction={{ xs: "column-reverse", sm: "row" }} spacing={1} justifyContent="flex-end">
        <Button variant="text">Cancel</Button>
        <Button variant="contained" type="submit">Create profile</Button>
      </Stack>
    </Stack>
  </Box>
);

const AdminFormPreview = () => {
  const [customPrompts, setCustomPrompts] = useState(false);

  return (
    <AdminPage maxWidth="md">
      <AdminPageHeader
        title="Edit class"
        description="Update course details and assistant behavior."
      />

      <AdminFormSurface>
        <Box component="form" onSubmit={(event) => event.preventDefault()}>
          <Box sx={{ px: { xs: 2, sm: 3 } }}>
            <AdminFormSection
              title="Basic information"
              description="The details shown to students and instructors."
            >
              <Stack spacing={2.5}>
                <TextField required fullWidth label="Class name" defaultValue="Interaction Design" />
                <TextField required fullWidth label="Professor email" type="email" defaultValue="alex@example.edu" />
                <TextField
                  fullWidth
                  select
                  label="Term"
                  defaultValue="fall"
                  helperText="Used to organize the class list."
                >
                  <MenuItem value="fall">Fall 2026</MenuItem>
                  <MenuItem value="spring">Spring 2027</MenuItem>
                </TextField>
              </Stack>
            </AdminFormSection>

            <AdminFormSection
              title="Assistant behavior"
              description="Reveal advanced controls only when this class needs an override."
              divided={false}
            >
              <Stack spacing={2.5}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={customPrompts}
                      onChange={(event) => setCustomPrompts(event.target.checked)}
                    />
                  }
                  label="Enable custom system prompt"
                />
                {customPrompts && (
                  <TextField
                    fullWidth
                    multiline
                    minRows={4}
                    label="System prompt"
                    helperText="Explain the assistant behavior in clear, testable language."
                  />
                )}
              </Stack>
            </AdminFormSection>
          </Box>

          <AdminFormActions>
            <Button variant="outlined">Cancel</Button>
            <Button variant="contained" type="submit" startIcon={<SaveOutlinedIcon />}>
              Save changes
            </Button>
          </AdminFormActions>
        </Box>
      </AdminFormSurface>
    </AdminPage>
  );
};

const meta = {
  title: "Kiwi Design System/Forms/Examples",
  parameters: {
    layout: "padded",
  },
  decorators: [
    (Story) => (
      <Paper square elevation={0} sx={{ minHeight: 720, p: { xs: 2, sm: 4 }, bgcolor: "background.default" }}>
        <Story />
      </Paper>
    ),
  ],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const BasicForm: Story = {
  name: "Basic form",
  render: () => <BasicFormPreview />,
};

export const AdminFormComposition: Story = {
  name: "Admin form composition",
  render: () => <AdminFormPreview />,
};

export const FieldStates: Story = {
  name: "Field states",
  render: () => (
    <Box sx={{ width: "min(100%, 560px)" }}>
      <Stack spacing={2.5}>
        <TextField
          label="Professor email"
          type="email"
          defaultValue="alex@example.edu"
          helperText="Used for course ownership notifications."
        />
        <TextField
          error
          label="Webhook URL"
          defaultValue="example"
          helperText="Enter a complete HTTPS URL, for example https://example.com/webhooks."
        />
        <TextField disabled label="Generated identifier" defaultValue="class_2026_fall" />
      </Stack>
    </Box>
  ),
};
