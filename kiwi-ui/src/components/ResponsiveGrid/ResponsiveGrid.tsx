// /src/components/ResponsiveGrid/ResponsiveGrid.tsx
import React from 'react';
import { Box } from '@mui/material';

interface ResponsiveGridProps {
  children: React.ReactNode;
  sx?: object;
  minWidth?: string; // Minimum width of each grid cell; defaults to "310px"
}

/**
 * ResponsiveGrid sets up a CSS grid that automatically adjusts the
 * number of columns based on the available container width. Each grid
 * cell is at least minWidth wide (default is "310px") unless the container
 * is narrower, when one cell takes the full width (the course list, S-01:
 * four columns of 320 px at 1440, one of 358 px at 390).
 */
const ResponsiveGrid: React.FC<ResponsiveGridProps> = ({ children, sx = {}, minWidth = '310px' }) => {
  return (
    <Box
      sx={{
        width: '100%',
        display: 'grid',
        gridTemplateColumns: `repeat(auto-fill, minmax(min(100%, ${minWidth}), 1fr))`,
        gap: 'var(--space-6)',
        ...sx,
      }}
    >
      {children}
    </Box>
  );
};

export default ResponsiveGrid;
