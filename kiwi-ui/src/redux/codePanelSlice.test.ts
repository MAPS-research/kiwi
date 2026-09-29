import { describe, it, expect } from 'vitest';
import codePanelReducer, { toggleCodeView, setCodeViewVisible } from './codePanelSlice.ts';

describe('codePanelSlice', () => {
  const initialState = {
    isCodeViewVisible: false,
  };

  it('should return the initial state', () => {
    expect(codePanelReducer(undefined, { type: 'unknown' })).toEqual(initialState);
  });

  it('should handle toggleCodeView', () => {
    const actual = codePanelReducer(initialState, toggleCodeView());
    expect(actual.isCodeViewVisible).toBe(true);
  });

  it('should toggle from true to false', () => {
    const stateWithCodeVisible = { isCodeViewVisible: true };
    const actual = codePanelReducer(stateWithCodeVisible, toggleCodeView());
    expect(actual.isCodeViewVisible).toBe(false);
  });

  it('should handle setCodeViewVisible with true', () => {
    const actual = codePanelReducer(initialState, setCodeViewVisible(true));
    expect(actual.isCodeViewVisible).toBe(true);
  });

  it('should handle setCodeViewVisible with false', () => {
    const stateWithCodeVisible = { isCodeViewVisible: true };
    const actual = codePanelReducer(stateWithCodeVisible, setCodeViewVisible(false));
    expect(actual.isCodeViewVisible).toBe(false);
  });
});