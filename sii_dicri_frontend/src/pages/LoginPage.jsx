// src/pages/LoginPage.jsx - Pantalla de login y cambio de tema
import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function LoginPage() {
  const { login, token } = useAuth(); // contexto de autenticación
  const navigate = useNavigate();

  const [usuario, setUsuario] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [themeLabel, setThemeLabel] = useState('Claro'); // texto del botón de tema

  // Si ya hay token, redirige al inicio
  useEffect(() => {
    if (token) {
      navigate('/');
    }
  }, [token, navigate]);

  // Inicializar label del botón de tema según data-theme actual
  useEffect(() => {
    const html = document.documentElement;
    const current = html.getAttribute('data-theme') || 'dark';
    setThemeLabel(current === 'light' ? 'Oscuro' : 'Claro');
  }, []);

  // Alterna entre tema claro/oscuro y actualiza texto del botón
  function handleToggleTheme() {
    const html = document.documentElement;
    const current = html.getAttribute('data-theme') || 'dark';
    const next = current === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-theme', next);
    setThemeLabel(next === 'light' ? 'Oscuro' : 'Claro');
  }

  // Envío del formulario de login
  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!usuario.trim() || !contrasena.trim()) {
      setError('Por favor ingresa usuario y contraseña.');
      return;
    }

    try {
      setCargando(true);
      await login(usuario.trim(), contrasena); // delega en AuthContext (usa API + JWT)
      // La navegación se hace en el useEffect cuando se setea el token
    } catch (err) {
      setError(err.message || 'Credenciales inválidas.');
      setCargando(false);
    }
  }

  return (
    <div className="page-center">
      {/* Botón tema claro/oscuro arriba a la derecha */}
      <div
        style={{
          position: 'absolute',
          top: 16,
          right: 16
        }}
      >
        <button
          type="button"
          className="btn btn-secondary btn-theme-toggle"
          onClick={handleToggleTheme}
        >
          {themeLabel}
        </button>
      </div>

      {/* Tarjeta principal de login */}
      <div className="card login-card">
        <header className="login-header">
          <h1 className="login-title">Login</h1>
          <p className="login-subtitle">
            Sistema de Investigación e Indicios – DICRI
          </p>
        </header>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="label" htmlFor="usuario">
              Usuario
            </label>
            <input
              id="usuario"
              className="input"
              type="text"
              autoComplete="username"
              value={usuario}
              onChange={e => setUsuario(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="label" htmlFor="contrasena">
              Contraseña
            </label>

            <div className="password-wrapper">
              <input
                id="contrasena"
                className="input password-input"
                type={mostrarPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={contrasena}
                onChange={e => setContrasena(e.target.value)}
              />

              {/* Botón ojo para ver/ocultar contraseña */}
              <button
                type="button"
                className="password-toggle"
                onClick={() => setMostrarPassword(prev => !prev)}
                aria-label={
                  mostrarPassword
                    ? 'Ocultar contraseña'
                    : 'Mostrar contraseña'
                }
              >
                {/* Icono ojo en SVG */}
                <svg
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                  focusable="false"
                >
                  <path
                    d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <circle
                    cx="12"
                    cy="12"
                    r="3"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  />
                </svg>
              </button>
            </div>
          </div>

          {error && (
            <p className="text-error" style={{ marginTop: 6 }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            className="btn btn-primary btn-block"
            disabled={cargando}
            style={{ marginTop: 18 }}
          >
            {cargando ? 'Ingresando…' : 'Ingresar'}
          </button>
        </form>
      </div>
    </div>
  );
}
