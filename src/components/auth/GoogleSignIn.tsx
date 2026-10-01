'use client';

import React, { useEffect, useRef, useState } from 'react';
import googleAuthService from '@/services/googleAuth';
import { useAppDispatch } from '@/store';
import { googleAuth } from '@/store/slices/authSlice';
import toast from 'react-hot-toast';

interface GoogleSignInProps {
  onSuccess?: () => void;
  onError?: (error: string) => void;
  buttonText?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
  theme?: 'outline' | 'filled_blue' | 'filled_black';
  size?: 'large' | 'medium' | 'small';
  className?: string;
}

export default function GoogleSignIn({
  onSuccess,
  onError,
  buttonText = 'signin_with',
  theme = 'outline',
  size = 'large',
  className = '',
}: GoogleSignInProps) {
  const dispatch = useAppDispatch();
  const buttonRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);

  const hasClientId = googleAuthService.hasClientId();

  useEffect(() => {
    if (!hasClientId) {
      setInitError('Google Client ID is not configured (missing NEXT_PUBLIC_GOOGLE_CLIENT_ID)');
      return;
    }

    const initializeGoogleAuth = async () => {
      try {
        await googleAuthService.initialize();
        setIsInitialized(true);
      } catch (error: any) {
        const msg = error?.message || 'Failed to initialize Google authentication';
        setInitError(msg);
        onError?.(msg);
      }
    };

    initializeGoogleAuth();
  }, [hasClientId, onError]);

  useEffect(() => {
    if (isInitialized && buttonRef.current && hasClientId) {
      googleAuthService.renderButton(buttonRef.current.id, {
        theme,
        size,
        text: buttonText,
        shape: 'rectangular',
        logo_alignment: 'left',
        width: 250,
      });
    }
  }, [isInitialized, theme, size, buttonText, hasClientId]);

  const handleGoogleSignIn = async () => {
    if (isLoading || !hasClientId || initError) return;
    
    setIsLoading(true);
    try {
      const result = await googleAuthService.signIn();
      
      if (result.success && result.token) {
        await dispatch(googleAuth(result.token)).unwrap();
        toast.success('Successfully signed in with Google!');
        onSuccess?.();
      } else if (result.cancelled) {
        toast('Google sign-in was cancelled', { icon: 'ℹ️' });
      } else {
        const errorMessage = result.error || 'Google authentication failed';
        toast.error(errorMessage);
        onError?.(errorMessage);
      }
    } catch (error: any) {
      const errorMessage = error.message || 'Google authentication failed';
      toast.error(errorMessage);
      onError?.(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  if (!hasClientId || initError) {
    return (
      <div className={`p-3 text-center border border-amber-500/20 rounded-lg bg-amber-500/10 text-amber-300 text-xs font-light ${className}`} data-testid="google-signin-disabled">
        Google Sign-In disabled: missing NEXT_PUBLIC_GOOGLE_CLIENT_ID
      </div>
    );
  }

  if (!isInitialized) {
    return (
      <div className={`flex items-center justify-center ${className}`}>
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900 dark:border-white"></div>
        <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
          Loading Google Sign-in...
        </span>
      </div>
    );
  }

  return (
    <div className={`google-signin-container relative ${className}`}>
      {isLoading && (
        <div className="absolute inset-0 bg-black/40 backdrop-blur-xs rounded-lg flex items-center justify-center z-10">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
          <span className="ml-2 text-xs text-white">Signing in...</span>
        </div>
      )}
      <div
        ref={buttonRef}
        id="google-signin-button"
        className={`w-full ${isLoading ? 'pointer-events-none opacity-60' : ''}`}
        onClick={handleGoogleSignIn}
      />
    </div>
  );
}

// Alternative custom button component
export function GoogleSignInButton({
  onSuccess,
  onError,
  className = '',
  children,
}: {
  onSuccess?: () => void;
  onError?: (error: string) => void;
  className?: string;
  children?: React.ReactNode;
}) {
  const dispatch = useAppDispatch();
  const [isLoading, setIsLoading] = useState(false);
  const hasClientId = googleAuthService.hasClientId();

  const handleClick = async () => {
    if (isLoading || !hasClientId) return;
    
    setIsLoading(true);
    try {
      const result = await googleAuthService.signIn();
      
      if (result.success && result.token) {
        await dispatch(googleAuth(result.token)).unwrap();
        toast.success('Successfully signed in with Google!');
        onSuccess?.();
      } else if (result.cancelled) {
        toast('Google sign-in was cancelled', { icon: 'ℹ️' });
      } else {
        const errorMessage = result.error || 'Google authentication failed';
        toast.error(errorMessage);
        onError?.(errorMessage);
      }
    } catch (error: any) {
      const errorMessage = error.message || 'Google authentication failed';
      toast.error(errorMessage);
      onError?.(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  if (!hasClientId) {
    return (
      <button
        disabled
        title="Missing NEXT_PUBLIC_GOOGLE_CLIENT_ID"
        className={`
          flex items-center justify-center w-full px-4 py-3 border border-red-500/30 
          rounded-full bg-red-500/10 text-red-300 text-xs font-light
          cursor-not-allowed opacity-60
          ${className}
        `}
        data-testid="google-signin-disabled"
      >
        Google Sign-In unavailable (Missing Client ID)
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isLoading}
      aria-disabled={isLoading}
      className={`
        flex items-center justify-center w-full px-4 py-2 border border-gray-300 
        rounded-lg shadow-sm bg-white text-gray-700 hover:bg-gray-50 
        focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
        disabled:opacity-50 disabled:cursor-not-allowed
        dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:hover:bg-gray-700
        ${className}
      `}
    >
      {isLoading ? (
        <div className="flex items-center justify-center gap-2">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-900 dark:border-white"></div>
          <span>Signing in...</span>
        </div>
      ) : (
        <>
          <svg
            className="w-5 h-5 mr-2"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          {children || 'Continue with Google'}
        </>
      )}
    </button>
  );
}
