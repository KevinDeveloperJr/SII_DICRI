// src/api.js
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export async function apiFetch(
  path,
  {
    method = 'GET',
    body,
    token,
    noAuth = false,       
    headers: extraHeaders 
  } = {}
) {
  const headers = {
    'Content-Type': 'application/json',
    ...(extraHeaders || {})
  };

  // Solo agregamos Authorization si:
  // - tenemos token
  // - Y no se indicó noAuth
  if (token && !noAuth) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const res = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    });

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      // El backend normalmente manda { ok:false, mensaje:'...' }
      throw new Error(data?.mensaje || 'Error en la petición');
    }

    return data;
  } catch (err) {
    console.error('Error llamando a la API:', err);
    throw err;
  }
}
