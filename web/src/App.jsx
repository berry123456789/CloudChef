import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout";

import Recipes from "./pages/Recipes";
import Recipe from "./pages/Recipe";
import Create from "./pages/Create";
import Edit from "./pages/Edit";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Recipes />} />
        <Route path="/recipes" element={<Navigate to="/" replace />} />

        <Route path="/create" element={<Create />} />
        <Route path="/recipe/:id" element={<Recipe />} />
        <Route path="/edit/:id" element={<Edit />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
