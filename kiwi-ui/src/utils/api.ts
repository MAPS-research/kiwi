import {
  DefaultApi,
  EmailApi,
  EmailAuditApi,
  WebhooksApi,
  APITokensApi,
  MCPAdminApi,
  MCPUserApi,
  ToolConfigurationApi,
  KiwiAppsApi,
  ClassAppsApi,
  PermissionsApi,
  Configuration,
} from "../services/index.ts";
import handleUnauthorized from "./middleware.ts";

const basePath = import.meta.env.VITE_BASE_PATH || "http://localhost:3000";
const getToken = () => {
  return localStorage.getItem("authToken");
};

const apiConfig = new Configuration({
  basePath: basePath,
  credentials: "include",
  accessToken: () => {
    const token = getToken();
    return token ? Promise.resolve(`Bearer ${token}`) : Promise.resolve("");
  },
  middleware: [handleUnauthorized],
});

const apiClient = new DefaultApi(apiConfig);
const emailApiClient = new EmailApi(apiConfig);
const emailAuditApiClient = new EmailAuditApi(apiConfig);
const webhooksApiClient = new WebhooksApi(apiConfig);
const apiTokensApiClient = new APITokensApi(apiConfig);
const mcpAdminApiClient = new MCPAdminApi(apiConfig);
const mcpUserApiClient = new MCPUserApi(apiConfig);
const toolConfigApiClient = new ToolConfigurationApi(apiConfig);
const kiwiAppsApiClient = new KiwiAppsApi(apiConfig);
const classAppsApiClient = new ClassAppsApi(apiConfig);
const permissionsApiClient = new PermissionsApi(apiConfig);

const apiConfigWithoutMiddleWare = new Configuration({
  basePath: basePath,
  credentials: "include",
  accessToken: () => {
    const token = getToken();
    return token ? Promise.resolve(token) : Promise.resolve("");
  },
});

const apiClientWithoutMiddleWare = new DefaultApi(apiConfigWithoutMiddleWare);

// Dedicated client for HOST-PROXIED external-app calls (the kiwi:apiRequest
// bridge). It carries the APP token per call (injected via initOverrides), not
// the user token, and deliberately OMITS `handleUnauthorized`: on an expired
// app token that middleware would retry with the *user* token — a silent
// privilege escalation past the app-scope model — plus alert()/redirect side
// effects that don't belong to an app call. A plain 401 must surface so the
// proxy can refresh the app token. No `accessToken` and no `credentials`, so no
// user session cookie rides along with an app-token call.
const bridgeApiConfig = new Configuration({ basePath: basePath });
const bridgeKiwiAppsApiClient = new KiwiAppsApi(bridgeApiConfig);

export {
  basePath,
  apiClientWithoutMiddleWare,
  emailApiClient,
  emailAuditApiClient,
  webhooksApiClient,
  apiTokensApiClient,
  mcpAdminApiClient,
  mcpUserApiClient,
  toolConfigApiClient,
  kiwiAppsApiClient,
  bridgeKiwiAppsApiClient,
  classAppsApiClient,
  permissionsApiClient,
};

export default apiClient;
