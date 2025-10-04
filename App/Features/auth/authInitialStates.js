const initialState = {
  isAuthenticated: false,
  isLoading: false,
  isError: false,
  error: '',
  token: null,
  user: null,
  authChecked: false, // To track if we've checked for existing token
};

export default initialState;
