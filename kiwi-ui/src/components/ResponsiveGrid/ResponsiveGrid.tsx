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
 * cell is at least minWidth wide (default is "310px"), ensuring a clean,
 * consistent layout.
 */
const ResponsiveGrid: React.FC<ResponsiveGridProps> = ({ children, sx = {}, minWidth = '310px' }) => {
  return (
    <Box
      sx={{
        width: '100%',
        display: 'grid',
        gridTemplateColumns: `repeat(auto-fill, minmax(${minWidth}, 1fr))`,
        gap: 5,
        ...sx,
      }}
    >
      {children}
    </Box>
  );
};

export default ResponsiveGrid;
