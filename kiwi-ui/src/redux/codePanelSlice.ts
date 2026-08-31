import { createSlice } from '@reduxjs/toolkit';

interface CodePanelState {
  isCodeViewVisible: boolean;
}

const initialState: CodePanelState = {
  isCodeViewVisible: false,
};

const codePanelSlice = createSlice({
  name: 'codePanel',
  initialState,
  reducers: {
    toggleCodeView: (state) => {
      state.isCodeViewVisible = !state.isCodeViewVisible;
    },
    setCodeViewVisible: (state, action) => {
      state.isCodeViewVisible = action.payload;
    },
  },
});

export const { toggleCodeView, setCodeViewVisible } = codePanelSlice.actions;
export default codePanelSlice.reducer;
