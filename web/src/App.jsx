// web/src/App.jsx
import { Routes, Route, Navigate } from "react-router-dom";

import Layout from "./components/Layout.jsx";

import Recipes from "./pages/Recipes.jsx";
import Recipe from "./pages/Recipe.jsx";
import Create from "./pages/Create.jsx";
import Edit from "./pages/Edit.jsx";
import Login from "./pages/Login.jsx";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Recipes />} />
        <Route path="/recipes/:id" element={<Recipe />} />
        <Route path="/create" element={<Create />} />
        <Route path="/edit/:id" element={<Edit />} />
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
