// tests/auth.test.js
const request = require('supertest');
const app = require('../src/app');

describe('Auth /api/auth/login', () => {
  test('Login válido devuelve 200, token y datos de usuario', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        // usa tus credenciales reales de pruebas
        usuario: process.env.TEST_USER || 'admin',
        contrasena: process.env.TEST_PASS || 'sii2025'
      });

    console.log('Auth /api/auth/login - Login válido', res.body);

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body).toHaveProperty('usuario');
    expect(res.body.usuario).toHaveProperty('usuario'); 
    expect(res.body.usuario).toHaveProperty('nombres');  
    expect(res.body.usuario).toHaveProperty('roles');    
    // opcional:
    expect(Array.isArray(res.body.usuario.roles)).toBe(true);
  });

  test('Login inválido devuelve 400 o 401', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        usuario: 'admin',
        contrasena: 'clave_incorrecta'
      });

    expect([400, 401]).toContain(res.statusCode);
  });
});
