// src/App.jsx
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import ExpedientesPage from './pages/ExpedientesPage';
import ExpedienteDetallePage from './pages/ExpedienteDetallePage';
import ExpedienteNuevoPage from './pages/ExpedienteNuevoPage';
import UsuariosPage from './pages/UsuariosPage';
import './App.css';

function RequireAuth({ children }) {
  const { token, loading } = useAuth();

  if (loading) return <div style={{ padding: 20 }}>Cargando...</div>;

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      {/* Lista de expedientes en "/" */}
      <Route
        path="/"
        element={
          <RequireAuth>
            <ExpedientesPage />
          </RequireAuth>
        }
      />

      {/* 👇 NUEVA RUTA /expedientes que también muestra el listado */}
      <Route
        path="/expedientes"
        element={
          <RequireAuth>
            <ExpedientesPage />
          </RequireAuth>
        }
      />

      <Route
        path="/expedientes/nuevo"
        element={
          <RequireAuth>
            <ExpedienteNuevoPage />
          </RequireAuth>
        }
      />

      <Route
        path="/expedientes/:id"
        element={
          <RequireAuth>
            <ExpedienteDetallePage />
          </RequireAuth>
        }
      />

      {/* Panel de usuarios */}
      <Route
        path="/usuarios"
        element={
          <RequireAuth>
            <UsuariosPage />
          </RequireAuth>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
