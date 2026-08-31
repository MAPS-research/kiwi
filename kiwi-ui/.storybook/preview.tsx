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
          'Getting Started',
          ['About'],
          'Foundations',
          ['Colors', 'Typography'],
          'Guidelines',
          ['Analytics', 'Quality', 'User Management'],
          'Patterns',
          ['Forms', 'Small Popups'],
          'Components',
          ['Actions', 'Layout'],
          'Contributing',
          ['Authoring Rules', 'Documentation UIUX', 'Components'],
          'Deprecated',
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
