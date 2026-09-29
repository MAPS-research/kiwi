import { describe, it, expect } from 'vitest';
import store, { RootState } from './store.ts';
import { toggleCodeView } from './codePanelSlice.ts';

describe('Redux Store', () => {
  it('should have the correct initial state structure', () => {
    const state = store.getState();
    
    expect(state).toHaveProperty('interactionId');
    expect(state).toHaveProperty('codePanel');
    expect(state.codePanel).toEqual({ isCodeViewVisible: false });
  });

  it('should handle dispatching actions', () => {
    const initialState = store.getState();
    expect(initialState.codePanel.isCodeViewVisible).toBe(false);

    store.dispatch(toggleCodeView());
    
    const newState = store.getState();
    expect(newState.codePanel.isCodeViewVisible).toBe(true);
  });

  it('should have correct RootState type', () => {
    const state: RootState = store.getState();
    
    // TypeScript should not complain about these properties
    expect(typeof state.interactionId).toBeDefined();
    expect(typeof state.codePanel.isCodeViewVisible).toBe('boolean');
  });
});