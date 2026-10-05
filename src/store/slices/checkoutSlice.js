import { createSlice } from '@reduxjs/toolkit';

const checkoutSlice = createSlice({
  name: 'checkout',
  initialState: { validation: null, status: 'idle', error: null },
  reducers: {
    validationReceived(state, action) { state.validation = action.payload; state.status = 'succeeded'; state.error = null; },
    validationStarted(state) { state.status = 'loading'; state.error = null; },
    validationFailed(state, action) { state.status = 'failed'; state.error = action.payload || 'Checkout validation failed'; },
    checkoutReset() { return { validation: null, status: 'idle', error: null }; },
  },
});

export const checkoutActions = checkoutSlice.actions;
export default checkoutSlice.reducer;
