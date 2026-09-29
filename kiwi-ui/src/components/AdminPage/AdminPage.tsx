import type { ReactNode } from 'react';
import { Container } from '@mui/material';
import type { ContainerProps } from '@mui/material';

export interface AdminPageProps {
  children: ReactNode;
  maxWidth?: ContainerProps['maxWidth'];
}

const AdminPage = ({ children, maxWidth = 'lg' }: AdminPageProps) => (
  <Container
    maxWidth={maxWidth}
    disableGutters
    sx={{ px: { xs: 2, md: 3 }, pt: { xs: 2, md: 3 }, pb: 4 }}
  >
    {children}
  </Container>
);

export default AdminPage;
