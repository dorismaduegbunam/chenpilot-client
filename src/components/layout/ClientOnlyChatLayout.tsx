'use client';

import React, { useState, useEffect } from 'react';
import { ChatLayout } from './ChatLayout';
import { useAuth } from '@/hooks/useAuth';

interface ClientOnlyChatLayoutProps {
  children: React.ReactNode;
}

export function ClientOnlyChatLayout({ children }: ClientOnlyChatLayoutProps) {
  const { isAuthenticated, isLoading, isClient } = useAuth({ requireAuth: true });

  if (!isClient || isLoading || !isAuthenticated) {
    return (
      <div className="h-screen flex bg-gray-50 dark:bg-gray-900">
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-hidden flex flex-col">
            <div className="flex-1 overflow-y-auto">
              <div className="h-full flex flex-col items-center justify-center p-8">
                <div className="text-center">
                  <p className="text-gray-300">Loading...</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <ChatLayout>{children}</ChatLayout>;
}
