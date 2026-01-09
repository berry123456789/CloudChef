import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext.jsx";

export default function RequireAuth({ children }) {
  const { loading, isAuthed } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-10 text-slate-200">
        Loading session...
      </div>
    );
  }

  if (!isAuthed) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return children;
}
