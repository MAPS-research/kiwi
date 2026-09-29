/**
 * Kiwi Apps Framework - Registry Exports
 */

export { default as AppRegistry, getAppRegistry } from './AppRegistry.ts';
export type { RegistryListener } from './AppRegistry.ts';

export {
  AppRegistryProvider,
  AppRegistryContext,
  useAppRegistry,
  useApp,
  useAppTools,
  useAppWidgets,
  useActiveApps,
} from './AppRegistryContext.tsx';
export type {
  AppRegistryContextValue,
  AppRegistryProviderProps,
} from './AppRegistryContext.tsx';
