# ---------- BACKEND: Node + Express ----------
FROM node:20-alpine

# Directorio de trabajo dentro del contenedor
WORKDIR /app

# Copiamos solo package*.json primero para cachear dependencias
COPY package*.json ./

# Instalamos dependencias (modo producción)
RUN npm ci --only=production --no-audit --no-fund

# Copiamos el resto del código del backend
COPY . .

# Variables por defecto (puedes sobreescribirlas luego)
ENV NODE_ENV=production \
    PORT=3001

# El backend escucha en 3001
EXPOSE 3001

# Tu punto de entrada REAL es server.js
CMD ["node", "server.js"]
