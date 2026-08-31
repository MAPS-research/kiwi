import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface InteractionIdState {
  interactionId: string | null;
}

const initialState: InteractionIdState = {
  interactionId: null,
};

const idSlice = createSlice({
  name: 'interactionId',
  initialState,
  reducers: {
    setInteractionId(state, action: PayloadAction<string>) {
      state.interactionId = action.payload;
    },
  },
});

export const { setInteractionId } = idSlice.actions;
export default idSlice.reducer;