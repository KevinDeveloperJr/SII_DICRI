// tests/expedientes.test.js
const request = require('supertest');
const app = require('../src/app');

const ADMIN_USER = 'admin';
const ADMIN_PASS = 'sii2025'; 

let token = null;

beforeAll(async () => {
  // Aumentar timeout global de Jest 
  jest.setTimeout(20000);

  const res = await request(app)
    .post('/api/auth/login')
    .send({
      usuario: ADMIN_USER,
      contrasena: ADMIN_PASS
    });

  if (res.status !== 200 || !res.body.token) {
    throw new Error(
      `No se pudo obtener token en beforeAll. Status: ${res.status}`
    );
  }

  token = res.body.token;
});

describe('Expedientes /api/expedientes', () => {
  test('GET /api/expedientes devuelve 200 y un arreglo', async () => {
    const res = await request(app)
      .get('/api/expedientes')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.expedientes)).toBe(true);
  });

  test('POST /api/expedientes crea un expediente', async () => {
    // Ajusta estos IDs a fiscalía y tipo de caso que EXISTAN en tu BD
    const body = {
      descripcion: 'Expediente de prueba desde Jest',
      idFiscalia: 1,
      idTipoCaso: 1,
      fechaHecho: '2025-01-01'
    };

    const res = await request(app)
      .post('/api/expedientes')
      .set('Authorization', `Bearer ${token}`)
      .send(body);

    // Puede ser 201 o 200 según el controlador
    expect([200, 201]).toContain(res.status);

    expect(res.body).toHaveProperty('ok', true);
    expect(res.body).toHaveProperty('idExpediente');
    expect(res.body).toHaveProperty('numeroExpediente');
  });
});
