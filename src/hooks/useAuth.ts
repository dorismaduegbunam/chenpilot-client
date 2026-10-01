import { useEffect, useState } from 'react';
import { useAppSelector } from '@/store';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { getSafeRedirectUrl } from '@/utils/auth';

interface UseAuthOptions {
  requireAuth?: boolean;
  redirectTo?: string;
}

export const useAuth = (options?: UseAuthOptions) => {
  const { isAuthenticated, user, token, isLoading } = useAppSelector((state) => state.auth);
  const [isClient, setIsClient] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (isClient && !isLoading && options?.requireAuth && !isAuthenticated) {
      let currentPath = pathname || '';
      const queryString = searchParams?.toString();
      if (queryString) {
        currentPath += `?${queryString}`;
      }

      if (currentPath && currentPath !== '/auth/login') {
        const safePath = getSafeRedirectUrl(currentPath, '/dashboard');
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('redirect_after_login', safePath);
        }
        router.push(`/auth/login?redirect=${encodeURIComponent(safePath)}`);
      } else {
        router.push(options?.redirectTo || '/auth/login');
      }
    }
  }, [isClient, isLoading, isAuthenticated, options?.requireAuth, options?.redirectTo, pathname, searchParams, router]);

  return {
    isAuthenticated: isClient ? isAuthenticated : false,
    user: isClient ? user : null,
    token: isClient ? token : null,
    isLoading: isClient ? isLoading : false,
    isClient,
  };
};
