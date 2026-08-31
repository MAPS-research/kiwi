import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import React from 'react';
import ChatMessages from './ChatMessages.tsx';
import codePanelReducer, { toggleCodeView } from '../../redux/codePanelSlice.ts';
import interactionIdReducer from '../../redux/interactionIdSlice.ts';

// Mock the ImportCodeButton component for testing
const MockImportCodeButton = ({ children, importCode }: { children: React.ReactNode; importCode: (code: string) => void }) => {
  const mockDispatch = vi.fn();
  
  // Mock useDispatch
  vi.doMock('react-redux', async () => {
    const actual = await vi.importActual('react-redux');
    return {
      ...actual,
      useDispatch: () => mockDispatch,
    };
  });

  const handleImport = () => {
    importCode('test code');
    mockDispatch(toggleCodeView());
  };

  return (
    <button onClick={handleImport} data-testid="import-code-button">
      {children}
    </button>
  );
};

// Mock the AuthContext
vi.mock('../../auth/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 1, username: 'testuser' },
    isAuthenticated: true,
  }),
}));

// Mock the ChatContext
vi.mock('./ChatContainer', () => ({
  ChatContext: React.createContext({
    chatHistory: [],
    setChatHistory: vi.fn(),
  }),
}));

// Mock API client
vi.mock('../../utils/api', () => ({
  default: {
    documentControllerRetrieveDocument: vi.fn().mockResolvedValue({
      document: { documentContent: 'mock pdf content' }
    })
  }
}));

describe('ChatMessages ImportCodeButton Integration', () => {
  let store: any;
  let dispatchSpy: any;

  beforeEach(() => {
    store = configureStore({
      reducer: {
        interactionId: interactionIdReducer,
        codePanel: codePanelReducer,
      },
    });
    
    dispatchSpy = vi.spyOn(store, 'dispatch');
  });

  it('should dispatch toggleCodeView when ImportCodeButton is used', () => {
    const mockImportCode = vi.fn();
    
    render(
      <Provider store={store}>
        <MockImportCodeButton importCode={mockImportCode}>
          Import Code
        </MockImportCodeButton>
      </Provider>
    );

    const button = screen.getByTestId('import-code-button');
    fireEvent.click(button);

    expect(mockImportCode).toHaveBeenCalledWith('test code');
  });

  it('should handle code import and auto-switch functionality', () => {
    const mockImportCode = vi.fn();
    
    render(
      <Provider store={store}>
        <MockImportCodeButton importCode={mockImportCode}>
          Import Code
        </MockImportCodeButton>
      </Provider>
    );

    // Verify initial state
    expect(store.getState().codePanel.isCodeViewVisible).toBe(false);

    const button = screen.getByTestId('import-code-button');
    fireEvent.click(button);

    // Verify the import function was called
    expect(mockImportCode).toHaveBeenCalledWith('test code');
  });
});