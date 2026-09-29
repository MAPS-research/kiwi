import React from 'react';
import {
  IconButton,
  Stack,
  Typography,
  Box,
  Tooltip,
} from '@mui/material';
import {Terminal} from '@mui/icons-material';

interface PanelHeaderProps {
  label: string;
  // onShareClick?: () => void; // Add a callback for the ShareIcon click
  onCodeToggle: () => void; // Add a callback for the code icon click
  isCodeActive: boolean;
}

const PanelHeader: React.FC<PanelHeaderProps> = ({
  label,
  onCodeToggle,
  isCodeActive,
}) => {
  return (
    <Box
      sx={{
        width: '100%',
      }}
    >
      <Stack
        direction="row"
        sx={{
          alignItems: "center",
          justifyContent: "space-between",
          py: 1,
          px: 2,
          maxWidth: '100%',
          margin: '0 auto'
        }}>
        {/* Left: Label */}
        <Stack direction="row" spacing={1} sx={{
          alignItems: "center"
        }}>
          <Typography variant="subtitle1" sx={{
            fontWeight: "bold"
          }}>
            {label}
          </Typography>
        </Stack>

        {/* Right: Buttons with Tooltips */}
        <Stack direction="row" spacing={1}>
          {/* Code Button */}
          <Tooltip title="Code" arrow>
            <IconButton
              aria-label="code"
              onClick={onCodeToggle}
              sx={{
                color: isCodeActive ? 'primary.main' : 'text.secondary',
                backgroundColor: isCodeActive ? 'action.selected' : 'transparent',
                '&:hover': {
                  backgroundColor: 'action.hover',
                },
              }}
            >
              <Terminal />
            </IconButton>
          </Tooltip>

        </Stack>
      </Stack>
    </Box>
  );
};

export default PanelHeader;
