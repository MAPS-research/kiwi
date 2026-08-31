import React from 'react';
import { useAuth } from '../../auth/AuthContext';
import { GlobalChatButton } from './GlobalChatButton';
import { GlobalChatModal } from './GlobalChatModal';

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
