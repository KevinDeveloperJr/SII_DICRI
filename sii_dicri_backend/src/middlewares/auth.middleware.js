// Middleware de autenticación JWT y autorización por rol
const jwt = require('jsonwebtoken');

// Verifica que exista un token válido en Authorization: Bearer <token>
function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res
      .status(401)
      .json({ ok: false, mensaje: 'Token requerido' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload; // Datos del usuario (sub, usuario, nombres, roles)
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      console.log('Token expirado para una petición protegida');
    } else {
      console.error('Error verificando token:', err.message);
    }

    return res
      .status(401)
      .json({ ok: false, mensaje: 'Token inválido o expirado' });
  }
}

// Verifica que el usuario autenticado tenga al menos uno de los roles permitidos
function requireRole(...rolesPermitidos) {
  return (req, res, next) => {
    if (!req.user) {
      return res
        .status(401)
        .json({ ok: false, mensaje: 'No autenticado' });
    }

    const rolesUsuario = req.user.roles || [];
    const tiene = rolesUsuario.some((r) => rolesPermitidos.includes(r));

    if (!tiene) {
      return res
        .status(403)
        .json({ ok: false, mensaje: 'No autorizado' });
    }

    next();
  };
}

module.exports = { requireAuth, requireRole };
