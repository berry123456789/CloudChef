import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext.jsx";

export default function RequireAuth({ children }) {
  const { ready, isAuthed } = useAuth();
  const location = useLocation();

  // Avoid redirect flicker while session loads from localStorage
  if (!ready) return null;

  if (!isAuthed) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return children;
}
