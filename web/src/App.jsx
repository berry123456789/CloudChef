// web/src/App.jsx
import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout.jsx";

import Recipes from "./pages/Recipes.jsx";
import Recipe from "./pages/Recipe.jsx";
import Create from "./pages/Create.jsx";
import Edit from "./pages/Edit.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";

import RequireAuth from "./auth/RequireAuth.jsx";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Recipes />} />
        <Route path="/recipes/:id" element={<Recipe />} />

        {/* protected routes */}
        <Route
          path="/create"
          element={
            <RequireAuth>
              <Create />
            </RequireAuth>
          }
        />
        <Route
          path="/edit/:id"
          element={
            <RequireAuth>
              <Edit />
            </RequireAuth>
          }
        />

        {/* auth routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
