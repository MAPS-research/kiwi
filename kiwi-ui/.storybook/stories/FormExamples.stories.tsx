import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Save } from 'lucide-react';
import { AdminPage, AdminPageHeader } from '../../src/components/AdminPage/index.ts';
import { Button } from '../../src/components/ui/button.tsx';
import { Input } from '../../src/components/ui/input.tsx';
import { Label } from '../../src/components/ui/label.tsx';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../src/components/ui/select.tsx';
import { Switch } from '../../src/components/ui/switch.tsx';
import { Textarea } from '../../src/components/ui/textarea.tsx';

const Field = ({
  id,
  label,
  helper,
  error,
  children,
}: {
  id: string;
  label: string;
  helper?: string;
  error?: string;
  children: React.ReactNode;
}) => (
  <div className="flex flex-col gap-2">
    <Label htmlFor={id}>{label}</Label>
    {children}
    {helper && !error && (
      <p id={`${id}-helper`} className="text-sm text-muted-foreground">
        {helper}
      </p>
    )}
    {error && (
      <p id={`${id}-error`} className="text-sm text-destructive">
        {error}
      </p>
    )}
  </div>
);

const BasicFormPreview = () => (
  <form onSubmit={(event) => event.preventDefault()} className="w-full max-w-[560px]">
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold">Create profile</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Add the information people will use to identify you.
        </p>
      </div>
      <div className="flex flex-col gap-5">
        <Field id="basic-name" label="Display name">
          <Input id="basic-name" required autoComplete="name" />
        </Field>
        <Field id="basic-email" label="Email" helper="Used for account notifications.">
          <Input
            id="basic-email"
            required
            type="email"
            autoComplete="email"
            aria-describedby="basic-email-helper"
          />
        </Field>
      </div>
      <div className="flex flex-col-reverse justify-end gap-2 sm:flex-row">
        <Button variant="ghost" type="button">
          Cancel
        </Button>
        <Button type="submit">Create profile</Button>
      </div>
    </div>
  </form>
);

const TERM_OPTIONS = { fall: 'Fall 2026', spring: 'Spring 2027' };

const AdminFormPreview = () => {
  const [customPrompts, setCustomPrompts] = useState(false);
  const [term, setTerm] = useState('fall');

  return (
    <AdminPage maxWidth="md">
      <AdminPageHeader title="Edit class" description="Update course details and assistant behavior." />

      <div className="rounded-xl border bg-card">
        <form onSubmit={(event) => event.preventDefault()}>
          <div className="px-4 sm:px-6">
            <section className="border-b py-6">
              <h3 className="text-sm font-semibold">Basic information</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                The details shown to students and instructors.
              </p>
              <div className="mt-5 flex flex-col gap-5">
                <Field id="admin-class-name" label="Class name">
                  <Input id="admin-class-name" required defaultValue="Interaction Design" />
                </Field>
                <Field id="admin-professor-email" label="Professor email">
                  <Input id="admin-professor-email" required type="email" defaultValue="alex@example.edu" />
                </Field>
                <Field id="admin-term" label="Term" helper="Used to organize the class list.">
                  <Select value={term} onValueChange={(value) => setTerm(value ?? 'fall')} items={TERM_OPTIONS}>
                    <SelectTrigger id="admin-term" aria-describedby="admin-term-helper" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(TERM_OPTIONS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </div>
            </section>

            <section className="py-6">
              <h3 className="text-sm font-semibold">Assistant behavior</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Reveal advanced controls only when this class needs an override.
              </p>
              <div className="mt-5 flex flex-col gap-5">
                <Label className="gap-3">
                  <Switch checked={customPrompts} onCheckedChange={setCustomPrompts} />
                  Enable custom system prompt
                </Label>
                {customPrompts && (
                  <Field
                    id="admin-system-prompt"
                    label="System prompt"
                    helper="Explain the assistant behavior in clear, testable language."
                  >
                    <Textarea
                      id="admin-system-prompt"
                      rows={4}
                      aria-describedby="admin-system-prompt-helper"
                    />
                  </Field>
                )}
              </div>
            </section>
          </div>

          <div className="flex justify-end gap-2 border-t px-4 py-4 sm:px-6">
            <Button variant="outline" type="button">
              Cancel
            </Button>
            <Button type="submit">
              <Save data-icon="inline-start" />
              Save changes
            </Button>
          </div>
        </form>
      </div>
    </AdminPage>
  );
};

const meta = {
  title: 'Patterns/Forms/Examples',
  parameters: {
    layout: 'padded',
  },
  decorators: [
    (Story) => (
      <div className="min-h-[720px] bg-background p-4 sm:p-8">
        <Story />
      </div>
    ),
  ],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const BasicForm: Story = {
  name: 'Basic form',
  render: () => <BasicFormPreview />,
};

export const AdminFormComposition: Story = {
  name: 'Admin form composition',
  render: () => <AdminFormPreview />,
};

export const FieldStates: Story = {
  name: 'Field states',
  render: () => (
    <div className="w-full max-w-[560px]">
      <div className="flex flex-col gap-5">
        <Field
          id="state-default"
          label="Professor email"
          helper="Used for course ownership notifications."
        >
          <Input
            id="state-default"
            type="email"
            defaultValue="alex@example.edu"
            aria-describedby="state-default-helper"
          />
        </Field>
        <Field
          id="state-error"
          label="Webhook URL"
          error="Enter a complete HTTPS URL, for example https://example.com/webhooks."
        >
          <Input
            id="state-error"
            defaultValue="example"
            aria-invalid="true"
            aria-describedby="state-error-error"
          />
        </Field>
        <Field id="state-disabled" label="Generated identifier">
          <Input id="state-disabled" disabled defaultValue="class_2026_fall" />
        </Field>
      </div>
    </div>
  ),
};
