import React from 'react';
import { useAuth } from '../../auth/AuthContext.tsx';
import { GlobalChatButton } from './GlobalChatButton.tsx';
import { GlobalChatModal } from './GlobalChatModal.tsx';

/**
 * Container component that renders both the floating chat button
 * and the chat modal. Only renders when user is authenticated.
 */
export const GlobalChatContainer: React.FC = () => {
  const { user } = useAuth();

  // Don't render anything if user is not logged in
  if (!user) {
    return null;
  }

  return (
    <>
      <GlobalChatButton />
      <GlobalChatModal />
    </>
  );
};

export default GlobalChatContainer;
