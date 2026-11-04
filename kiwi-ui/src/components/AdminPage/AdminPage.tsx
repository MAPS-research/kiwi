import type { ReactNode } from 'react';
import { Container } from '@mui/material';
import type { ContainerProps } from '@mui/material';

export interface AdminPageProps {
  children: ReactNode;
  maxWidth?: ContainerProps['maxWidth'];
}

/**
 * The admin page frame (SR-4): a column centred in the main area at `md` 900 px
 * or `lg` 1200 px, padded 24 / 16 / 32 px below 600 px and 24 / gutter / 32 px
 * from 600 px (the compact gutter is 24 px). The canvas behind it is the admin
 * shell's `background.default`; the page draws no surface of its own.
 */
const AdminPage = ({ children, maxWidth = 'lg' }: AdminPageProps) => (
  <Container
    maxWidth={maxWidth}
    disableGutters
    sx={{
      px: { xs: 'var(--space-4)', sm: 'var(--space-gutter)' },
      pt: 'var(--space-5)',
      pb: 'var(--space-6)',
    }}
  >
    {children}
  </Container>
);

export default AdminPage;
