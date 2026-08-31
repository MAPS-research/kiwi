import React from 'react';
import { Typography, IconButton, Box } from '@mui/material';
import { AccountCircle } from '@mui/icons-material';

const TopNav: React.FC = () => {
  return (
    <Box
      sx={{
        width: '100%',
        paddingX: 3,
        paddingY: 2,
        backgroundColor: '#ffffff', // ✅ force white background
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid #eee', // optional light divider
      }}
    >
      <Typography
        variant="h5"
        sx={{
          fontWeight: 600,
          color: '#572c85',
        }}
      >
        Dashboard
      </Typography>

      <IconButton
        edge="end"
        sx={{
          backgroundColor: '#f1e4ff',
          color: '#572c85',
          '&:hover': {
            backgroundColor: '#e1d4f5',
          },
        }}
      >
        <AccountCircle />
      </IconButton>
    </Box>
  );
};

export default TopNav;
