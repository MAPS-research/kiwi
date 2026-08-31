import {
  createContext,
  useContext,
  type Dispatch,
  type SetStateAction,
} from 'react';
import type { NavigationSidebarItem } from '../components/NavigationSidebar/NavigationSidebar.tsx';

export interface AdminClassNavigation {
  items: NavigationSidebarItem[];
  className?: string;
  classNameLoading?: boolean;
}

export interface AdminAppNavigation {
  appSlug: string;
  items: NavigationSidebarItem[];
}

interface AdminNavigationContextValue {
  setClassNavigation: Dispatch<SetStateAction<AdminClassNavigation | null>>;
  setAppNavigation: Dispatch<SetStateAction<AdminAppNavigation | null>>;
}

export const AdminNavigationContext = createContext<AdminNavigationContextValue | null>(null);

export const useAdminNavigation = () => {
  const context = useContext(AdminNavigationContext);

  if (!context) {
    throw new Error('useAdminNavigation must be used inside AdminLayout');
  }

  return context;
};
