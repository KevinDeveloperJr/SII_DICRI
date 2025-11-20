// server.js - Punto de entrada para arrancar la API SII_DICRI
require('dotenv').config();
const app = require('./src/app');

const port = process.env.PORT || 3001;

// Escucha en 0.0.0.0 para permitir acceso desde la red local
app.listen(port, '0.0.0.0', () => {
  console.log(`API SII_DICRI escuchando en puerto ${port}`);
});
