import React from 'react';
import type { Preview } from '@storybook/react-vite';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { MemoryRouter } from 'react-router-dom';
import theme from '../src/Theme.ts';
import '../src/index.css';

const preview: Preview = {
  parameters: {
    options: {
      storySort: {
        order: [
          'Storybook Guide',
          ['Welcome', 'Authoring Rules', 'UIUX Rules', 'Components'],
          'Kiwi Design System',
          ['Foundations', 'Components', 'Forms', 'Popups', 'Patterns', 'Product Guides', 'Quality'],
          '*',
        ],
      },
    },
    docs: {
      toc: {
        headingSelector: 'h2',
      },
    },
    controls: {
      expanded: true,
      sort: 'requiredFirst',
    },
    a11y: {
      test: 'error',
    },
  },
  decorators: [
    (Story) => (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <MemoryRouter>
          <Story />
        </MemoryRouter>
      </ThemeProvider>
    ),
  ],
};

export default preview;
