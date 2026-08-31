import React from 'react';
import { Box, useTheme } from '@mui/material';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow, prism } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface ReadOnlyCodeViewerProps {
  code: string;
  language?: string;
  showLineNumbers?: boolean;
  height?: string | number;
  fontSize?: number;
}

const ReadOnlyCodeViewer: React.FC<ReadOnlyCodeViewerProps> = ({
  code,
  language = 'python',
  showLineNumbers = true,
  height = '100%',
  fontSize = 14,
}) => {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';

  return (
    <Box
      sx={{
        height: height,
        overflow: 'auto',
        '& pre': {
          margin: 0,
          height: '100%',
          fontSize: `${fontSize}px !important`,
        },
        '& code': {
          fontSize: `${fontSize}px !important`,
        },
      }}
    >
      <SyntaxHighlighter
        language={language}
        style={isDarkMode ? tomorrow : prism}
        showLineNumbers={showLineNumbers}
        customStyle={{
          margin: 0,
          padding: '1rem',
          height: '100%',
          backgroundColor: isDarkMode ? '#1e1e1e' : '#f5f5f5',
        }}
      >
        {code}
      </SyntaxHighlighter>
    </Box>
  );
};

export default ReadOnlyCodeViewer;