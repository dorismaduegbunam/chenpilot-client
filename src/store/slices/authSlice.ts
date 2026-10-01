import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { User, LoginRequest, RegisterRequest } from '@/types';
import apiService from '@/services/api';
import authService from '@/services/auth.service';
import authStorage from '@/utils/authStorage';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  throttleSeconds: number | null;
}

const initialState: AuthState = {
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  throttleSeconds: null,
};

// Async thunks
export const login = createAsyncThunk(
  'auth/login',
  async (credentials: LoginRequest & { rememberMe?: boolean }, { rejectWithValue }) => {
    try {
      if (process.env.NEXT_PUBLIC_USE_MOCK_AUTH === 'true') {
        const mockUser: User = {
          id: 'mock-user-id',
          email: credentials.email,
          name: 'Mock User',
          address: '0x1234567890abcdef',
          publicKey: '0xabcdef1234567890',
          isDeployed: true,
          isFunded: true,
          tokenType: "STRK",
          authProvider: "email",
          isEmailVerified: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        const mockToken = 'mock-jwt-token';
        return { user: mockUser, token: mockToken, rememberMe: credentials.rememberMe };
      }
      const response = await apiService.login(credentials);
      if (response.success && response.data) {
        return { user: response.data.user, token: response.data.token, rememberMe: credentials.rememberMe };
      }
      return rejectWithValue(response.message || 'Login failed');
    } catch (error: any) {
      if (error?.response?.status === 429) {
        const retryAfter = authService.getRetryAfterSeconds(error);
        return rejectWithValue({
          message: error?.response?.data?.message || 'Too many login attempts. Please try again later.',
          status: 429,
          retryAfter: retryAfter || 60,
        });
      }
      return rejectWithValue(
        error?.response?.data?.message || error?.message || 'Login failed'
      );
    }
  }
);

export const register = createAsyncThunk(
  'auth/register',
  async (userData: RegisterRequest) => {
    // Mock register - always succeed
    const mockUser: User = {
      id: 'mock-user-id',
      email: userData.email,
      name: userData.name || 'Mock User',
      address: '0x1234567890abcdef',
      publicKey: '0xabcdef1234567890',
      isDeployed: true,
      isFunded: true,
      tokenType: "STRK",
      authProvider: "email",
      isEmailVerified: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const mockToken = 'mock-jwt-token';
    return { user: mockUser, token: mockToken };
  }
);

export const logout = createAsyncThunk(
  'auth/logout',
  async () => {
    try {
      await apiService.logout();
    } catch (error: unknown) {
      // Even if logout fails on server, clear local state
      console.error('Logout error:', error);
    }
  }
);

export const loadUser = createAsyncThunk(
  'auth/loadUser',
  async () => {
    // Mock load user - return mock user
    const mockUser: User = {
      id: 'mock-user-id',
      email: 'mock@example.com',
      name: 'Mock User',
      address: '0x1234567890abcdef',
      publicKey: '0xabcdef1234567890',
      isDeployed: true,
      isFunded: true,
      tokenType: "STRK",
      authProvider: "email",
      isEmailVerified: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    return mockUser;
  }
);

export const updateProfile = createAsyncThunk(
  'auth/updateProfile',
  async (userData: Partial<User>) => {
    // Mock update profile - return updated mock user
    const mockUser: User = {
      id: 'mock-user-id',
      email: userData.email || 'mock@example.com',
      name: userData.name || 'Mock User',
      address: '0x1234567890abcdef',
      publicKey: '0xabcdef1234567890',
      isDeployed: true,
      isFunded: true,
      tokenType: "STRK",
      authProvider: "email",
      isEmailVerified: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    return mockUser;
  }
);

export const changePassword = createAsyncThunk(
  'auth/changePassword',
  async () => {
    // Mock change password - always succeed
    return { success: true };
  }
);

export const googleAuth = createAsyncThunk(
  'auth/googleAuth',
  async () => {
    // Mock google auth - always succeed
    const mockUser: User = {
      id: 'mock-google-user-id',
      email: 'mockgoogle@example.com',
      name: 'Mock Google User',
      address: '0x1234567890abcdef',
      publicKey: '0xabcdef1234567890',
      isDeployed: true,
      isFunded: true,
      tokenType: "STRK",
      authProvider: "google",
      isEmailVerified: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const mockToken = 'mock-google-jwt-token';
    return { user: mockUser, token: mockToken };
  }
);

export const refreshToken = createAsyncThunk(
  'auth/refreshToken',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiService.refreshToken();
      return { token: response.token };
    } catch (error: unknown) {
      return rejectWithValue((error as { message?: string }).message || 'Token refresh failed');
    }
  }
);

export const fetchProfile = createAsyncThunk(
  'auth/fetchProfile',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiService.getMe();
      if (response.success) return response.data;
      return rejectWithValue((response as { message?: string }).message);
    } catch (error: unknown) {
      return rejectWithValue((error as { message?: string }).message || 'Failed to fetch profile');
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearThrottle: (state) => {
      state.throttleSeconds = null;
    },
    setToken: (state, action: PayloadAction<string>) => {
      state.token = action.payload;
      state.isAuthenticated = true;
    },
    clearAuth: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.error = null;
      state.throttleSeconds = null;
    },
    initializeAuth: (state) => {
      // Restore persisted auth state from authStorage (localStorage or sessionStorage)
      if (typeof window === 'undefined') return;

      const useMock = process.env.NEXT_PUBLIC_USE_MOCK_AUTH === 'true';

      const storedToken = authStorage.getToken();
      const storedUser  = authStorage.getUser();

      if (storedToken && storedUser) {
        state.token           = storedToken;
        state.user            = storedUser;
        state.isAuthenticated = true;
      } else if (useMock) {
        const mockUser: User = {
          id: 'mock-user-id',
          email: 'mock@example.com',
          name: 'Mock User',
          address: '0x1234567890abcdef',
          publicKey: '0xabcdef1234567890',
          isDeployed: true,
          isFunded: true,
          tokenType: 'STRK',
          authProvider: 'email',
          isEmailVerified: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        state.user            = mockUser;
        state.token           = 'mock-jwt-token';
        state.isAuthenticated = true;
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // Login
      .addCase(login.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.isAuthenticated = true;
        state.error = null;
        state.throttleSeconds = null;
        const remember = action.payload.rememberMe !== false;
        authStorage.setToken(action.payload.token, remember);
        authStorage.setUser(action.payload.user, remember);
      })
      .addCase(login.rejected, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = false;
        if (typeof action.payload === 'object' && action.payload !== null && (action.payload as any).status === 429) {
          state.error = (action.payload as any).message;
          state.throttleSeconds = (action.payload as any).retryAfter;
        } else if (typeof action.payload === 'string') {
          state.error = action.payload;
          state.throttleSeconds = null;
        } else {
          state.error = (action.payload as any)?.message || 'Login failed';
          state.throttleSeconds = null;
        }
      })
      // Register
      .addCase(register.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(register.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.isAuthenticated = true;
        state.error = null;
        authStorage.setToken(action.payload.token, true);
        authStorage.setUser(action.payload.user, true);
      })
      .addCase(register.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
        state.isAuthenticated = false;
      })
      // Logout
      .addCase(logout.fulfilled, (state) => {
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
        state.error = null;
        state.throttleSeconds = null;
        authStorage.clearAuth();
      })
      // Load User
      .addCase(loadUser.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(loadUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload;
        state.error = null;
      })
      .addCase(loadUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
        state.isAuthenticated = false;
        state.token = null;
      })
      // Update Profile
      .addCase(updateProfile.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateProfile.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload;
        state.error = null;
      })
      .addCase(updateProfile.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Change Password
      .addCase(changePassword.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(changePassword.fulfilled, (state) => {
        state.isLoading = false;
        state.error = null;
      })
      .addCase(changePassword.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Google Auth
      .addCase(googleAuth.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(googleAuth.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.isAuthenticated = true;
        state.error = null;
        authStorage.setToken(action.payload.token, true);
        authStorage.setUser(action.payload.user, true);
      })
      .addCase(googleAuth.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
        state.isAuthenticated = false;
      })
      // Refresh Token
      .addCase(refreshToken.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(refreshToken.fulfilled, (state, action) => {
        state.isLoading = false;
        state.token = action.payload.token;
        state.isAuthenticated = true;
        state.error = null;
        authStorage.setToken(action.payload.token);
      })
      .addCase(refreshToken.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
        state.isAuthenticated = false;
        state.token = null;
        authStorage.clearAuth();
      })
      // Fetch Profile
      .addCase(fetchProfile.fulfilled, (state, action) => {
        state.user = action.payload;
      });
  },
});

export const { clearError, clearThrottle, setToken, clearAuth, initializeAuth } = authSlice.actions;
export { login, register, logout, loadUser, updateProfile, changePassword, googleAuth, refreshToken, fetchProfile };
export default authSlice.reducer;
