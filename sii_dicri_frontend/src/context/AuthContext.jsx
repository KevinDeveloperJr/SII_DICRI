// src/context/AuthContext.jsx - Maneja sesión (token + usuario) para toda la app
import React, { createContext, useContext, useEffect, useState } from 'react';
import { apiFetch } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // user = { sub, usuario, nombres, roles }
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // Cargar sesión guardada desde localStorage al iniciar la app
  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (storedToken && storedUser) {
      setToken(storedToken);
      try {
        const parsed = JSON.parse(storedUser);
        setUser(parsed);
      } catch (e) {
        console.error('Error parseando usuario en localStorage:', e);
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, []);

  // Login contra /api/auth/login y guardar token/usuario
  async function login(usuario, contrasena) {
    const data = await apiFetch('/api/auth/login', {
      method: 'POST',
      body: { usuario, contrasena },
      noAuth: true, // evita enviar token viejo en el login
    });

    if (!data || data.ok === false) {
      throw new Error(data?.mensaje || 'Credenciales inválidas');
    }

    const payloadUser = data.usuario || {};
    const rolesNormalizados = (payloadUser.roles || []).map((r) =>
      String(r).trim().toUpperCase()
    );

    const normalizedUser = {
      ...payloadUser,
      roles: rolesNormalizados,
    };

    setToken(data.token);
    setUser(normalizedUser);

    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(normalizedUser));
  }

  // Logout: limpiar estado y almacenamiento local
  function logout() {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }

  const value = {
    user,
    token,
    login,
    logout,
    loading,
  };

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

// Hook para consumir el contexto de autenticación
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}
