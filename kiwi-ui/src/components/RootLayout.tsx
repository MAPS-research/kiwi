import React from 'react';
import { Outlet } from 'react-router-dom';
import { GlobalChatContainer } from './GlobalChat';
import { AgentBridge } from '../agent/AgentBridge.tsx';

/**
 * Root layout that wraps all routes.
 * Renders GlobalChatContainer inside router context so it can use navigation.
 * AgentBridge registers the WebMCP-shaped tools (navigate/observe/click/fill)
 * the chat agent drives, and exposes the executor used by the agent round-trip.
 */
export const RootLayout: React.FC = () => {
  return (
    <>
      <Outlet />
      <GlobalChatContainer />
      <AgentBridge />
    </>
  );
};

export default RootLayout;
