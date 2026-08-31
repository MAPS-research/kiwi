import { render, screen } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CodeInterpreter } from './CodeInterpreter.tsx';

// Mock the IDE component
vi.mock('./IDE', () => ({
  IDE: ({ pdfInfo, Messages, exportCode, handleSendMessage }: any) => (
    <div data-testid="ide-component">
      <div data-testid="pdf-info">{pdfInfo}</div>
      <div data-testid="messages-count">{Messages.length}</div>
      <button 
        data-testid="export-button" 
        onClick={() => exportCode('test code')}
      >
        Export Code
      </button>
      <button 
        data-testid="send-button" 
        onClick={() => handleSendMessage('test message')}
      >
        Send Message
      </button>
    </div>
  )
}));

const theme = createTheme();

const renderWithTheme = (component: React.ReactElement) => {
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  );
};

describe('CodeInterpreter', () => {
  const mockHandleSendMessage = vi.fn();
  const mockExportCode = vi.fn();
  
  const mockMessages = [
    {
      isAi: false,
      content: 'Hello, can you help me with Python?',
      error: false
    },
    {
      isAi: true,
      content: 'Sure! I can help you with Python programming.',
      error: false
    },
    {
      isAi: true,
      content: 'Here is some code:\n```python\nprint("Hello World")\n```',
      error: false,
      imgURLs: ['chart1.png']
    }
  ];

  const mockProps = {
    pdfInfo: 'Introduction to Programming - Chapter 3',
    handleSendMessage: mockHandleSendMessage,
    Messages: mockMessages,
    exportCode: mockExportCode
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    renderWithTheme(<CodeInterpreter {...mockProps} />);
    expect(screen.getByTestId('ide-component')).toBeInTheDocument();
  });

  it('passes pdfInfo prop to IDE component', () => {
    renderWithTheme(<CodeInterpreter {...mockProps} />);
    expect(screen.getByTestId('pdf-info')).toHaveTextContent('Introduction to Programming - Chapter 3');
  });

  it('passes Messages prop to IDE component', () => {
    renderWithTheme(<CodeInterpreter {...mockProps} />);
    expect(screen.getByTestId('messages-count')).toHaveTextContent('3');
  });

  it('passes handleSendMessage function to IDE component', () => {
    renderWithTheme(<CodeInterpreter {...mockProps} />);
    
    const sendButton = screen.getByTestId('send-button');
    sendButton.click();
    
    expect(mockHandleSendMessage).toHaveBeenCalledWith('test message');
  });

  it('passes exportCode function to IDE component', () => {
    renderWithTheme(<CodeInterpreter {...mockProps} />);
    
    const exportButton = screen.getByTestId('export-button');
    exportButton.click();
    
    expect(mockExportCode).toHaveBeenCalledWith('test code');
  });

  it('handles empty messages array', () => {
    const propsWithEmptyMessages = {
      ...mockProps,
      Messages: []
    };
    
    renderWithTheme(<CodeInterpreter {...propsWithEmptyMessages} />);
    expect(screen.getByTestId('messages-count')).toHaveTextContent('0');
  });

  it('handles empty pdfInfo', () => {
    const propsWithEmptyPdfInfo = {
      ...mockProps,
      pdfInfo: ''
    };
    
    renderWithTheme(<CodeInterpreter {...propsWithEmptyPdfInfo} />);
    expect(screen.getByTestId('pdf-info')).toHaveTextContent('');
  });

  it('renders with different message types', () => {
    const messagesWithErrors = [
      {
        isAi: false,
        content: 'This will cause an error',
        error: false
      },
      {
        isAi: true,
        content: 'Error occurred',
        error: true
      }
    ];
    
    const propsWithErrors = {
      ...mockProps,
      Messages: messagesWithErrors
    };
    
    renderWithTheme(<CodeInterpreter {...propsWithErrors} />);
    expect(screen.getByTestId('messages-count')).toHaveTextContent('2');
  });

  it('accepts messages with various properties', () => {
    const complexMessages = [
      {
        isAi: true,
        content: 'Complex message',
        error: false,
        typing: true,
        uniqueId: 'msg-1',
        imgURLs: ['image1.png', 'image2.png'],
        comment: 'This is a comment'
      }
    ];
    
    const propsWithComplexMessages = {
      ...mockProps,
      Messages: complexMessages
    };
    
    renderWithTheme(<CodeInterpreter {...propsWithComplexMessages} />);
    expect(screen.getByTestId('ide-component')).toBeInTheDocument();
  });

  it('maintains props interface compatibility', () => {
    // Test that all required props are passed correctly
    const requiredProps = {
      pdfInfo: 'Test PDF Info',
      handleSendMessage: vi.fn(),
      Messages: [],
      exportCode: vi.fn()
    };
    
    renderWithTheme(<CodeInterpreter {...requiredProps} />);
    expect(screen.getByTestId('ide-component')).toBeInTheDocument();
  });

  it('functions are called with correct parameters', async () => {
    const handleSendMessageSpy = vi.fn().mockResolvedValue(undefined);
    const exportCodeSpy = vi.fn();
    
    const spyProps = {
      ...mockProps,
      handleSendMessage: handleSendMessageSpy,
      exportCode: exportCodeSpy
    };
    
    renderWithTheme(<CodeInterpreter {...spyProps} />);
    
    // Simulate function calls through the IDE component
    const sendButton = screen.getByTestId('send-button');
    const exportButton = screen.getByTestId('export-button');
    
    sendButton.click();
    exportButton.click();
    
    expect(handleSendMessageSpy).toHaveBeenCalledWith('test message');
    expect(exportCodeSpy).toHaveBeenCalledWith('test code');
  });
});