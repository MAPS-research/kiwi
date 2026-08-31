import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { FeatureResponseFeatureNameEnum } from "../services/index.ts";
import apiClient from "../utils/api.ts";

export interface User {
  id?: string; // User UUID from JWT 'sub' claim
  username: string; // use userID
  consent: boolean;
  isAdmin?: boolean; // Make optional to allow undefined during initial loading
  role?: string;
  systemRole?: string; // The role from auth/role API: 'user', 'admin', 'instructor'
}

export interface AvailableFeature {
  featureName: FeatureResponseFeatureNameEnum;
  validUntil: Date | null;
  validFor: "user" | "class";
  validForID: string;
}

interface AuthContextType {
  user: User | null;
  availableFeatures: AvailableFeature[];
  login: (userData: User) => void;
  logout: () => void;
  refreshAdminStatus: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  availableFeatures: [],
  login: (userData: User) => { }, // This is just a placeholder, should be replaced by actual implementation.
  logout: () => { },
  refreshAdminStatus: async () => { },
});

const localStorageKey = "authUser";

export const AuthProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(() => {
    // Get the user from localStorage when the component initializes
    const storedUser = localStorage.getItem(localStorageKey);
    if (storedUser) {
      const user: User = JSON.parse(storedUser);
      // Ensure isAdmin is defined, set to undefined if missing for old sessions
      if (user.isAdmin === undefined || user.isAdmin === null) {
        user.isAdmin = undefined;
      }
      return user;
    } else {
      return null;
    }
  });

  const [availableFeatures, setAvailableFeatures] = useState<
    AvailableFeature[]
  >([]);

  const refreshAdminStatus = async () => {
    if (!user) return;

    try {
      const adminResponse = await apiClient.authControllerIsAdmin();
      const updatedUser = {
        ...user,
        isAdmin: adminResponse.isAdmin || false
      };
      setUser(updatedUser);
      localStorage.setItem(localStorageKey, JSON.stringify(updatedUser));
    } catch (error) {
      console.warn('[Suppressed] Failed to fetch admin status:', error);
    }
  };

  // Main effect for user-related operations
  useEffect(() => {
    if (user) {

      // Fetch admin status and system role if they're undefined
      const needsAdminStatus = user.isAdmin === undefined;
      const needsSystemRole = user.systemRole === undefined;
      
      if (needsAdminStatus || needsSystemRole) {
        // Fetch both admin status and system role in parallel
        const adminPromise = needsAdminStatus ? apiClient.authControllerIsAdmin() : null;
        const rolePromise = needsSystemRole ? apiClient.authControllerGetUserRole() : null;
        
        Promise.allSettled([adminPromise, rolePromise])
          .then((results) => {
            let updatedUser = { ...user };
            
            // Handle admin status result
            if (adminPromise && results[0].status === 'fulfilled') {
              updatedUser.isAdmin = results[0].value.isAdmin || false;
            } else if (needsAdminStatus) {
              console.warn('[Suppressed] Failed to fetch admin status');
              updatedUser.isAdmin = false;
            }
            
            // Handle system role result
            if (rolePromise && results[1].status === 'fulfilled') {
              updatedUser.systemRole = results[1].value.role || 'user';
              console.log('Fetched system role:', updatedUser.systemRole);
            } else if (needsSystemRole) {
              console.warn('[Suppressed] Failed to fetch system role');
              updatedUser.systemRole = 'user';
            }
            
            setUser(updatedUser);
            localStorage.setItem(localStorageKey, JSON.stringify(updatedUser));
          })
          .catch((error) => {
            console.warn('[Suppressed] Failed to fetch user status:', error);
            const updatedUser = {
              ...user,
              isAdmin: needsAdminStatus ? false : user.isAdmin,
              systemRole: needsSystemRole ? 'user' : user.systemRole,
            };
            setUser(updatedUser);
            localStorage.setItem(localStorageKey, JSON.stringify(updatedUser));
          });
      } else {
        // Both statuses are already set, just save to localStorage
        localStorage.setItem(localStorageKey, JSON.stringify(user));
      }

      // Fetch feature flags regardless of admin status
      apiClient.featureFlagsControllerListMyFeatures()
        .then((response) => {
          setAvailableFeatures(
            response.map((feature) => ({
              featureName: feature.featureName,
              validUntil: feature.validUntil,
              validFor: feature.targetType as "user" | "class",
              validForID: feature.targetId,
            }))
          );
        })
        .catch((error) => {
          console.warn('[Suppressed] Failed to fetch feature flags:', error);
        });

    } else {
      localStorage.removeItem(localStorageKey);
      setAvailableFeatures([]);
    }
  }, [user?.username, user?.isAdmin, user?.systemRole]); // Run when username changes or when isAdmin/systemRole is first set

  const login = (userData: User) => {
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem("authToken");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, availableFeatures, login, logout, refreshAdminStatus }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
