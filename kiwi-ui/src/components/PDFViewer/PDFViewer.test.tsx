import { render, screen } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { PDFViewer } from './PDFViewer.tsx';

// Mock react-pdf-viewer components
vi.mock('@react-pdf-viewer/core', () => ({
  Viewer: ({ fileUrl, theme, onPageChange, renderPage }: any) => (
    <div data-testid="pdf-viewer">
      <div data-testid="pdf-file">{fileUrl}</div>
      <div data-testid="pdf-theme">{theme}</div>
      <button 
        data-testid="page-change-button"
        onClick={() => onPageChange && onPageChange({ currentPage: 1 })}
      >
        Change Page
      </button>
      {renderPage && <div data-testid="custom-render">Custom Render</div>}
    </div>
  ),
  Worker: ({ children }: any) => <div data-testid="pdf-worker">{children}</div>,
  ScrollMode: {
    Horizontal: 'horizontal',
    Vertical: 'vertical'
  }
}));

vi.mock('@react-pdf-viewer/default-layout', () => ({
  defaultLayoutPlugin: () => ({
    toolbarPluginInstance: {},
    sidebarPluginInstance: {}
  })
}));

// Mock highlight plugin
vi.mock('@react-pdf-viewer/highlight', () => ({
  HighlightArea: {}
}));

// Mock CSS imports
vi.mock('@react-pdf-viewer/default-layout/lib/styles/index.css', () => ({}));
vi.mock('@react-pdf-viewer/toolbar/lib/styles/index.css', () => ({}));
vi.mock('./PDFViewer.css', () => ({}));

const theme = createTheme();

const renderWithTheme = (component: React.ReactElement) => {
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  );
};

describe('PDFViewer', () => {
  const mockPageChangeCallback = vi.fn();
  const mockCustomRenderPage = vi.fn(() => <div>Custom Page</div>);
  
  const mockHighlights = [
    {
      id: 1,
      image: 'highlight1.png',
      selectionRegion: {
        pageIndex: 0,
        left: 10,
        top: 20,
        width: 100,
        height: 50
      }
    },
    {
      id: 2,
      image: 'highlight2.png',
      selectionRegion: {
        pageIndex: 1,
        left: 30,
        top: 40,
        width: 120,
        height: 60
      }
    }
  ];

  const basicProps = {
    pdfFile: 'test-document.pdf'
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    renderWithTheme(<PDFViewer {...basicProps} />);
    expect(screen.getByTestId('pdf-viewer')).toBeInTheDocument();
  });

  it('wraps viewer in Worker component', () => {
    renderWithTheme(<PDFViewer {...basicProps} />);
    expect(screen.getByTestId('pdf-worker')).toBeInTheDocument();
  });

  it('passes pdfFile prop to viewer', () => {
    renderWithTheme(<PDFViewer {...basicProps} />);
    expect(screen.getByTestId('pdf-file')).toHaveTextContent('test-document.pdf');
  });

  it('applies light theme by default', () => {
    renderWithTheme(<PDFViewer {...basicProps} />);
    expect(screen.getByTestId('pdf-theme')).toHaveTextContent('light');
  });

  it('applies dark theme when theme mode is dark', () => {
    const darkTheme = createTheme({
      palette: {
        mode: 'dark'
      }
    });
    
    render(
      <ThemeProvider theme={darkTheme}>
        <PDFViewer {...basicProps} />
      </ThemeProvider>
    );
    
    expect(screen.getByTestId('pdf-theme')).toHaveTextContent('dark');
  });

  it('calls onPageChangeCallback when page changes', () => {
    const propsWithCallback = {
      ...basicProps,
      onPageChangeCallback: mockPageChangeCallback
    };
    
    renderWithTheme(<PDFViewer {...propsWithCallback} />);
    
    const pageChangeButton = screen.getByTestId('page-change-button');
    pageChangeButton.click();
    
    expect(mockPageChangeCallback).toHaveBeenCalledWith({ currentPage: 1 });
  });

  it('renders with highlight selection plugin', () => {
    const mockHighlightSelectionPlugin = {
      install: vi.fn(),
      uninstall: vi.fn()
    };
    
    const propsWithHighlightSelection = {
      ...basicProps,
      highlightSelectionPlugin: mockHighlightSelectionPlugin
    };
    
    renderWithTheme(<PDFViewer {...propsWithHighlightSelection} />);
    expect(screen.getByTestId('pdf-viewer')).toBeInTheDocument();
  });

  it('renders with highlight plugin', () => {
    const mockHighlightPlugin = {
      highlightAreas: mockHighlights
    };
    
    const propsWithHighlight = {
      ...basicProps,
      highlightPlugin: mockHighlightPlugin
    };
    
    renderWithTheme(<PDFViewer {...propsWithHighlight} />);
    expect(screen.getByTestId('pdf-viewer')).toBeInTheDocument();
  });

  it('renders with previous highlights', () => {
    const previousHighlights = [
      { id: 'prev1', area: { x: 10, y: 20 } },
      { id: 'prev2', area: { x: 30, y: 40 } }
    ];
    
    const propsWithPreviousHighlights = {
      ...basicProps,
      previousHighlights
    };
    
    renderWithTheme(<PDFViewer {...propsWithPreviousHighlights} />);
    expect(screen.getByTestId('pdf-viewer')).toBeInTheDocument();
  });

  it('renders with highlights prop', () => {
    const propsWithHighlights = {
      ...basicProps,
      highlights: mockHighlights
    };
    
    renderWithTheme(<PDFViewer {...propsWithHighlights} />);
    expect(screen.getByTestId('pdf-viewer')).toBeInTheDocument();
  });

  it('renders with custom render page function', () => {
    const propsWithCustomRender = {
      ...basicProps,
      customRenderPage: mockCustomRenderPage
    };
    
    renderWithTheme(<PDFViewer {...propsWithCustomRender} />);
    expect(screen.getByTestId('custom-render')).toBeInTheDocument();
  });

  it('handles empty highlights array', () => {
    const propsWithEmptyHighlights = {
      ...basicProps,
      highlights: []
    };
    
    renderWithTheme(<PDFViewer {...propsWithEmptyHighlights} />);
    expect(screen.getByTestId('pdf-viewer')).toBeInTheDocument();
  });

  it('handles all props together', () => {
    const allProps = {
      pdfFile: 'comprehensive-test.pdf',
      onPageChangeCallback: mockPageChangeCallback,
      highlightSelectionPlugin: { install: vi.fn() },
      highlightPlugin: { highlightAreas: mockHighlights },
      previousHighlights: [{ id: 'prev1' }],
      highlights: mockHighlights,
      customRenderPage: mockCustomRenderPage
    };
    
    renderWithTheme(<PDFViewer {...allProps} />);
    
    expect(screen.getByTestId('pdf-viewer')).toBeInTheDocument();
    expect(screen.getByTestId('pdf-file')).toHaveTextContent('comprehensive-test.pdf');
    expect(screen.getByTestId('custom-render')).toBeInTheDocument();
  });

  it('maintains current page state internally', () => {
    renderWithTheme(<PDFViewer {...basicProps} />);
    
    // The component should manage its own page state
    const pageChangeButton = screen.getByTestId('page-change-button');
    pageChangeButton.click();
    
    // Component should still be rendered after state change
    expect(screen.getByTestId('pdf-viewer')).toBeInTheDocument();
  });

  it('works without optional props', () => {
    const minimalProps = {
      pdfFile: 'minimal-test.pdf'
    };
    
    renderWithTheme(<PDFViewer {...minimalProps} />);
    expect(screen.getByTestId('pdf-viewer')).toBeInTheDocument();
    expect(screen.getByTestId('pdf-file')).toHaveTextContent('minimal-test.pdf');
  });

  it('handles different file formats', () => {
    const pdfFormats = [
      'document.pdf',
      'report.PDF',
      'file-with-dashes.pdf',
      'file_with_underscores.pdf'
    ];
    
    pdfFormats.forEach(pdfFile => {
      const { unmount } = renderWithTheme(<PDFViewer pdfFile={pdfFile} />);
      expect(screen.getByTestId('pdf-file')).toHaveTextContent(pdfFile);
      unmount();
    });
  });
});