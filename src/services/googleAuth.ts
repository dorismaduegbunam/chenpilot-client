// Google Authentication Service
import apiService from './api';
import { logger } from '@/utils/logger';

interface GoogleCredentialResponse {
  credential: string;
  select_by: string;
}

interface GoogleAuthConfig {
  client_id: string;
  callback: (response: GoogleCredentialResponse) => void;
  auto_select?: boolean;
  cancel_on_tap_outside?: boolean;
}

class GoogleAuthService {
  private isInitialized = false;
  private clientId: string;

  constructor() {
    this.clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';
  }

  hasClientId(): boolean {
    return typeof this.clientId === 'string' && this.clientId.trim() !== '';
  }

  async initialize(): Promise<void> {
    if (this.isInitialized || typeof window === 'undefined') {
      return;
    }

    if (!this.hasClientId()) {
      logger.warn('Google Auth Service: NEXT_PUBLIC_GOOGLE_CLIENT_ID is not configured');
      throw new Error('Google Client ID not configured');
    }

    return new Promise((resolve, reject) => {
      // Load Google Identity Services script
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      
      script.onload = () => {
        if (window.google && window.google.accounts) {
          this.isInitialized = true;
          resolve();
        } else {
          const err = new Error('Google Identity Services failed to load');
          logger.error('[GoogleAuth] Script load failed');
          reject(err);
        }
      };
      
      script.onerror = () => {
        const err = new Error('Failed to load Google Identity Services script');
        logger.error('[GoogleAuth] Script network error');
        reject(err);
      };
      
      document.head.appendChild(script);
    });
  }

  async signIn(): Promise<{ success: boolean; token?: string; error?: string; cancelled?: boolean }> {
    if (!this.hasClientId()) {
      logger.warn('[GoogleAuth] Cannot sign in: NEXT_PUBLIC_GOOGLE_CLIENT_ID missing');
      return { success: false, error: 'Google Client ID not configured' };
    }

    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      return new Promise((resolve) => {
        let isResolved = false;

        const config: GoogleAuthConfig = {
          client_id: this.clientId,
          callback: async (response: GoogleCredentialResponse) => {
            if (isResolved) return;
            try {
              if (!response || !response.credential) {
                isResolved = true;
                logger.info('[GoogleAuth] Sign in cancelled or empty credential response');
                resolve({ success: false, cancelled: true, error: 'Google sign-in was cancelled' });
                return;
              }

              // Send the credential to our backend without logging raw tokens
              logger.info('[GoogleAuth] Credential received, sending to backend...');
              const result = await apiService.googleAuth(response.credential);
              
              isResolved = true;
              if (result.success && result.data?.token) {
                resolve({ success: true, token: result.data.token });
              } else {
                logger.error('[GoogleAuth] Backend google-auth failed:', result.message || 'Authentication error');
                resolve({ success: false, error: result.message || 'Google authentication failed' });
              }
            } catch (error: any) {
              logger.error('[GoogleAuth] Callback exception:', error?.message || 'Authentication exception');
              isResolved = true;
              resolve({ 
                success: false, 
                error: error?.message || 'Failed to authenticate with Google' 
              });
            }
          },
          auto_select: false,
          cancel_on_tap_outside: true,
        };

        if (window.google && window.google.accounts) {
          window.google.accounts.id.initialize(config);
          window.google.accounts.id.prompt((notification: any) => {
            if (isResolved) return;
            if (notification?.isDismissedMoment && notification.isDismissedMoment()) {
              const reason = notification.getDismissedReason ? notification.getDismissedReason() : '';
              if (reason !== 'credential_returned') {
                isResolved = true;
                logger.info('[GoogleAuth] Prompt dismissed:', reason);
                resolve({ success: false, cancelled: true, error: 'Google sign-in was cancelled' });
              }
            } else if (notification?.isNotDisplayed && notification.isNotDisplayed()) {
              const reason = notification.getNotDisplayedReason ? notification.getNotDisplayedReason() : '';
              if (reason === 'opt_out_or_dismiss' || reason === 'suppressed_by_user') {
                isResolved = true;
                logger.info('[GoogleAuth] Prompt not displayed:', reason);
                resolve({ success: false, cancelled: true, error: 'Google sign-in was cancelled' });
              }
            }
          });
        } else {
          logger.error('[GoogleAuth] Google Identity Services not available on window');
          resolve({ success: false, error: 'Google Identity Services not available' });
        }
      });
    } catch (error: any) {
      logger.error('[GoogleAuth] signIn exception:', error?.message || 'Google Auth error');
      return { success: false, error: error?.message || 'Google authentication failed' };
    }
  }

  renderButton(elementId: string, options?: {
    theme?: 'outline' | 'filled_blue' | 'filled_black';
    size?: 'large' | 'medium' | 'small';
    text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
    shape?: 'rectangular' | 'pill' | 'circle' | 'square';
    logo_alignment?: 'left' | 'center';
    width?: number;
  }): void {
    if (!this.isInitialized || typeof window === 'undefined') {
      console.error('Google Auth not initialized');
      return;
    }

    const defaultOptions = {
      theme: 'outline' as const,
      size: 'large' as const,
      text: 'signin_with' as const,
      shape: 'rectangular' as const,
      logo_alignment: 'left' as const,
      width: 250,
      ...options,
    };

    if (window.google && window.google.accounts) {
      window.google.accounts.id.renderButton(
        document.getElementById(elementId),
        defaultOptions
      );
    }
  }

  signOut(): void {
    if (this.isInitialized && window.google && window.google.accounts) {
      window.google.accounts.id.disableAutoSelect();
    }
  }
}

// Extend Window interface for Google Identity Services
declare global {
  interface Window {
    google: {
      accounts: {
        id: {
          initialize: (config: GoogleAuthConfig) => void;
          prompt: () => void;
          renderButton: (element: HTMLElement | null, options: any) => void;
          disableAutoSelect: () => void;
        };
      };
    };
  }
}

// Create and export a singleton instance
export const googleAuthService = new GoogleAuthService();
export default googleAuthService;
