import React from 'react';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import authReducer from '@/store/slices/authSlice';
import GoogleSignIn, { GoogleSignInButton } from '@/components/auth/GoogleSignIn';
import googleAuthService from '@/services/googleAuth';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import toast from 'react-hot-toast';

vi.mock('react-hot-toast', () => ({
  default: Object.assign(vi.fn(), {
    success: vi.fn(),
    error: vi.fn(),
    custom: vi.fn(),
  }),
}));

describe('GoogleSignIn Component (#127)', () => {
  const createTestStore = () =>
    configureStore({
      reducer: {
        auth: authReducer,
      },
    });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders disabled state when NEXT_PUBLIC_GOOGLE_CLIENT_ID is missing', () => {
    vi.spyOn(googleAuthService, 'hasClientId').mockReturnValue(false);

    render(
      <Provider store={createTestStore()}>
        <GoogleSignInButton />
      </Provider>
    );

    const disabledBtn = screen.getByTestId('google-signin-disabled');
    expect(disabledBtn).toBeInTheDocument();
    expect(disabledBtn).toBeDisabled();
    expect(disabledBtn).toHaveTextContent(/Missing Client ID/i);
  });

  it('shows error and re-enables button when credential response is rejected', async () => {
    vi.spyOn(googleAuthService, 'hasClientId').mockReturnValue(true);
    vi.spyOn(googleAuthService, 'signIn').mockResolvedValueOnce({
      success: false,
      error: 'Invalid OAuth credential',
    });

    const onErrorMock = vi.fn();

    render(
      <Provider store={createTestStore()}>
        <GoogleSignInButton onError={onErrorMock} />
      </Provider>
    );

    const button = screen.getByRole('button', { name: /continue with google/i });
    expect(button).not.toBeDisabled();

    await act(async () => {
      fireEvent.click(button);
    });

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Invalid OAuth credential');
      expect(onErrorMock).toHaveBeenCalledWith('Invalid OAuth credential');
    });

    // Re-enables the button after terminal outcome
    expect(button).not.toBeDisabled();
  });

  it('shows informational toast when Google sign-in is cancelled by user', async () => {
    vi.spyOn(googleAuthService, 'hasClientId').mockReturnValue(true);
    vi.spyOn(googleAuthService, 'signIn').mockResolvedValueOnce({
      success: false,
      cancelled: true,
      error: 'Google sign-in was cancelled',
    });

    render(
      <Provider store={createTestStore()}>
        <GoogleSignInButton />
      </Provider>
    );

    const button = screen.getByRole('button', { name: /continue with google/i });

    await act(async () => {
      fireEvent.click(button);
    });

    await waitFor(() => {
      expect(toast).toHaveBeenCalledWith('Google sign-in was cancelled', expect.objectContaining({ icon: 'ℹ️' }));
      expect(toast.error).not.toHaveBeenCalled();
    });

    expect(button).not.toBeDisabled();
  });
});
