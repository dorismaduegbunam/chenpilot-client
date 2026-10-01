import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import authReducer, { login } from '@/store/slices/authSlice';
import LoginForm from '@/components/auth/(login)/loginform';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import apiService from '@/services/api';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
    custom: vi.fn(),
  },
}));

describe('LoginForm - Throttling feedback (#128)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  const createTestStore = () =>
    configureStore({
      reducer: {
        auth: authReducer,
      },
    });

  it('fake-timer test that the countdown unlocks the submit button after 429 rate limit', async () => {
    const store = createTestStore();

    // Mock api.login to reject with 429 and Retry-After header
    const error429: any = new Error('Too many attempts');
    error429.response = {
      status: 429,
      headers: { 'retry-after': '5' },
      data: { message: 'Rate limit exceeded' },
    };
    vi.spyOn(apiService, 'login').mockRejectedValueOnce(error429);

    render(
      <Provider store={store}>
        <LoginForm />
      </Provider>
    );

    const emailInput = screen.getByPlaceholderText('your@email.com');
    const passwordInput = screen.getByPlaceholderText('Enter your password');
    const submitBtn = screen.getByRole('button', { name: /sign in/i });

    fireEvent.change(emailInput, { target: { value: 'user@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });

    await act(async () => {
      fireEvent.click(submitBtn);
    });

    // Submit button should now be disabled and show countdown
    expect(screen.getByText(/Retry in 5s/i)).toBeInTheDocument();
    const disabledBtn = screen.getByRole('button', { name: /Retry in 5s/i });
    expect(disabledBtn).toBeDisabled();

    // Advance fake timers by 5 seconds
    await act(async () => {
      vi.advanceTimersByTime(5000);
    });

    // Submit button should unlock and return to 'Sign In'
    const unlockedBtn = screen.getByRole('button', { name: /sign in/i });
    expect(unlockedBtn).not.toBeDisabled();
  });

  it('non-429 error leaves the form interactive', async () => {
    const store = createTestStore();

    const error401: any = new Error('Invalid credentials');
    error401.response = {
      status: 401,
      data: { message: 'Invalid credentials' },
    };
    vi.spyOn(apiService, 'login').mockRejectedValueOnce(error401);

    render(
      <Provider store={store}>
        <LoginForm />
      </Provider>
    );

    const emailInput = screen.getByPlaceholderText('your@email.com') as HTMLInputElement;
    const passwordInput = screen.getByPlaceholderText('Enter your password') as HTMLInputElement;
    const submitBtn = screen.getByRole('button', { name: /sign in/i });

    fireEvent.change(emailInput, { target: { value: 'user@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'wrongpassword' } });

    await act(async () => {
      fireEvent.click(submitBtn);
    });

    // Submit button remains enabled (interactive) and entered input is preserved
    expect(submitBtn).not.toBeDisabled();
    expect(emailInput.value).toBe('user@example.com');
    expect(passwordInput.value).toBe('wrongpassword');
  });
});
