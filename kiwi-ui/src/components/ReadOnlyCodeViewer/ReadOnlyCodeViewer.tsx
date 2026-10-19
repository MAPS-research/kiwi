import React from 'react';
import { Box, useTheme } from '@mui/material';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { kiwiPrism } from '../../theme/codeThemes.ts';

interface ReadOnlyCodeViewerProps {
  code: string;
  language?: string;
  showLineNumbers?: boolean;
  height?: string | number;
  /** A size in px that overrides the code role (14/24, --type-code); omit it to keep the role. */
  fontSize?: number;
}

/**
 * Highlighted code that cannot be edited (DESIGN.md, Code surfaces): the
 * generated Kiwi Prism style for the colour mode (code is not paper, so it follows
 * the mode) on --editor-bg. It is not a control, so it keeps the 1 px
 * --editor-border hairline; line numbers are --editor-gutter-text.
 */
const ReadOnlyCodeViewer: React.FC<ReadOnlyCodeViewerProps> = ({
  code,
  language = 'python',
  showLineNumbers = true,
  height = '100%',
  fontSize,
}) => {
  const colorMode = useTheme().palette.mode;

  return (
    <Box
      sx={{
        height: height,
        overflow: 'auto',
        border: '1px solid var(--editor-border)',
        borderRadius: 'var(--radius-sheet)',
        backgroundColor: 'var(--editor-bg)',
        '& pre': {
          margin: 0,
          height: '100%',
        },
        ...(fontSize === undefined
          ? {}
          : { '& pre, & code': { fontSize: `${fontSize}px !important` } }),
      }}
    >
      <SyntaxHighlighter
        language={language}
        style={{
          ...kiwiPrism(colorMode),
          // WHY: the highlighter gives line numbers the classes "comment linenumber" and
          // merges the stylesheet over lineNumberStyle, so only a `linenumber` entry
          // (applied after `comment`) keeps them upright in the gutter colour.
          linenumber: { color: 'var(--editor-gutter-text)', fontStyle: 'normal' },
        }}
        showLineNumbers={showLineNumbers}
        customStyle={{
          margin: 0,
          padding: 'var(--space-3)',
          height: '100%',
          background: 'transparent',
        }}
      >
        {code}
      </SyntaxHighlighter>
    </Box>
  );
};

export default ReadOnlyCodeViewer;
