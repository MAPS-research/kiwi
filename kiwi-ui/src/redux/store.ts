import { configureStore } from '@reduxjs/toolkit';
import interactionIdReducer from './interactionIdSlice.ts';
import codePanelReducer from './codePanelSlice.ts';

const store = configureStore({
  reducer: {
    interactionId: interactionIdReducer,
    codePanel: codePanelReducer,
  },
});

export default store;

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
