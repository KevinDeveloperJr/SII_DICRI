// src/components/Navbar.jsx - Barra superior con cambio de tema y menú de usuario
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [theme, setTheme] = useState('dark');
  const [openMenu, setOpenMenu] = useState(false);

  // Cargar tema inicial desde localStorage
  useEffect(() => {
    const stored = localStorage.getItem('theme') || 'dark';
    setTheme(stored);
    if (stored === 'light') {
      document.documentElement.setAttribute('data-theme', 'light');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  }, []);

  // Alternar entre tema claro/oscuro y guardar preferencia
  function toggleTheme() {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    if (next === 'light') {
      document.documentElement.setAttribute('data-theme', 'light');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
    localStorage.setItem('theme', next);
  }

  // Cerrar menú y cerrar sesión
  function handleLogout() {
    setOpenMenu(false);
    logout();
  }

  // Cerrar menú y navegar al panel de usuarios (solo ADMIN)
  function handleGoUsuarios() {
    setOpenMenu(false);
    navigate('/usuarios');
  }

  const roles = user?.roles || [];
  const esAdmin = roles.includes('ADMIN');
  const nombreUsuario = user?.nombres || user?.usuario || 'Usuario';

  // Estilos del menú desplegable según tema
  const menuBg = theme === 'light' ? '#020617' : '#020617';
  const menuBorder =
    theme === 'light'
      ? '1px solid rgba(148,163,184,0.45)'
      : '1px solid rgba(148,163,184,0.35)';

  return (
    <header className="navbar">
      <div className="navbar-left">
        <span className="navbar-title">SII DICRI</span>
      </div>

      <div
        className="navbar-right"
        style={{ display: 'flex', alignItems: 'center', gap: 8 }}
      >
        {/* Botón de cambio de tema */}
        <button
          type="button"
          className="btn btn-secondary btn-theme-toggle"
          onClick={toggleTheme}
        >
          {theme === 'light' ? '🌞 Claro' : '🌙 Oscuro'}
        </button>

        {/* Menú de usuario con inicial, nombre, roles y opciones */}
        <div style={{ position: 'relative' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setOpenMenu((prev) => !prev)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              paddingRight: 10,
            }}
          >
            <div
              style={{
                width: 26,
                height: 26,
                borderRadius: '999px',
                background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: 14,
                fontWeight: 600,
                textTransform: 'uppercase',
              }}
            >
              {nombreUsuario.charAt(0)}
            </div>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                lineHeight: 1.1,
              }}
            >
              <span style={{ fontSize: 13 }}>{nombreUsuario}</span>
              {!!roles.length && (
                <span
                  style={{
                    fontSize: 11,
                    opacity: 0.7,
                  }}
                >
                  {roles.join(', ')}
                </span>
              )}
            </div>
          </button>

          {openMenu && (
            <div
              style={{
                position: 'absolute',
                right: 0,
                marginTop: 8,
                background: menuBg,
                borderRadius: 12,
                boxShadow: '0 14px 35px rgba(0,0,0,0.55)',
                minWidth: 190,
                border: menuBorder,
                zIndex: 20,
                padding: 6,
                color: '#e5e7eb',
              }}
            >
              {esAdmin && (
                <button
                  type="button"
                  onClick={handleGoUsuarios}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '8px 10px',
                    borderRadius: 8,
                    border: 'none',
                    background: 'transparent',
                    color: '#e5e7eb',
                    fontSize: 13,
                    cursor: 'pointer',
                  }}
                >
                  Panel de usuarios
                </button>
              )}

              <button
                type="button"
                onClick={handleLogout}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '8px 10px',
                  borderRadius: 8,
                  border: 'none',
                  background: 'transparent',
                  color: '#fecaca',
                  fontSize: 13,
                  cursor: 'pointer',
                  marginTop: 4,
                }}
              >
                Salir
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
