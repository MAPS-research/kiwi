import { useAuth } from "../auth/AuthContext.tsx";

export const Logout: React.FC = () => {
  const { logout } = useAuth();
  logout();
  return <div>Logout</div>;
};
