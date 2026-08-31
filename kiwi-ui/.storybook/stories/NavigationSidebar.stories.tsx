import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import {
  BarChart3,
  GraduationCap,
  Mail,
  PanelLeftClose,
  PanelLeftOpen,
  Users,
} from 'lucide-react';
import NavigationSidebar from '../../src/components/NavigationSidebar/NavigationSidebar.tsx';
import { Button } from '../../src/components/ui/button.tsx';

const SidebarFixture = ({
  initialOpen = true,
  withChildren = false,
}: {
  initialOpen?: boolean;
  withChildren?: boolean;
}) => {
  const [open, setOpen] = useState(initialOpen);
  const [selected, setSelected] = useState('/admin/classes');
  const [childSelected, setChildSelected] = useState('edit-metadata');

  const children = withChildren
    ? [
        { key: 'edit-metadata', label: 'Edit Class' },
        { key: 'manage-materials', label: 'Manage Materials' },
        { key: 'professor-analytics', label: 'Class Analytics' },
      ].map((child) => ({
        ...child,
        icon: null,
        selected: childSelected === child.key,
        onClick: () => setChildSelected(child.key),
      }))
    : undefined;

  return (
    <div className="flex h-120 overflow-hidden rounded-xl border border-border">
      <NavigationSidebar
        ariaLabel="Admin navigation"
        open={open}
        width={220}
        footer={
          <div className="flex justify-start p-2">
            <Button
              variant="ghost"
              size="icon"
              className="size-10 rounded-full text-muted-foreground"
              onClick={() => setOpen((value) => !value)}
              aria-label={
                open ? 'Collapse admin navigation' : 'Expand admin navigation'
              }
            >
              {open ? <PanelLeftClose /> : <PanelLeftOpen />}
            </Button>
          </div>
        }
        sections={[
          {
            items: [
              {
                key: '/admin/classes',
                label: 'Classes',
                icon: <GraduationCap />,
                selected: selected === '/admin/classes',
                active: withChildren,
                expanded: withChildren ? true : undefined,
                children,
                onClick: () => setSelected('/admin/classes'),
              },
              {
                key: '/admin/user-management',
                label: 'User Management',
                icon: <Users />,
                selected: selected === '/admin/user-management',
                onClick: () => setSelected('/admin/user-management'),
              },
              {
                key: '/admin/analytics',
                label: 'System Analytics',
                icon: <BarChart3 />,
                selected: selected === '/admin/analytics',
                onClick: () => setSelected('/admin/analytics'),
              },
              {
                key: '/admin/email',
                label: 'System Email',
                icon: <Mail />,
                selected: selected === '/admin/email',
                onClick: () => setSelected('/admin/email'),
              },
            ],
          },
        ]}
      />
      <div className="grow bg-background p-4 text-sm text-muted-foreground">
        Content area
      </div>
    </div>
  );
};

const meta = {
  title: 'Components/Layout/Navigation Sidebar',
  component: SidebarFixture,
  parameters: {
    layout: 'padded',
    a11y: { test: 'error' },
    docs: {
      description: {
        component:
          'Collapsible admin navigation rail built on the shared semantic tokens. Items keep fixed icon geometry so nothing shifts while the rail animates; collapsed items expose their labels through tooltips and `aria-label`. Nested class navigation animates closed before unmounting.',
      },
    },
  },
} satisfies Meta<typeof SidebarFixture>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Expanded: Story = {};

export const Collapsed: Story = {
  args: { initialOpen: false },
};

export const NestedNavigation: Story = {
  args: { withChildren: true },
};
