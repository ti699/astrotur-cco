import axios from 'axios';

const normalizeApiOrigin = (raw: string | undefined): string => {
  const value = (raw || '').trim();
  if (!value) return '';
  return value.replace(/\/api\/?$/, '').replace(/\/$/, '');
};

const apiOrigin = normalizeApiOrigin(import.meta.env.VITE_API_URL) || 'http://localhost:5001';

const api = axios.create({
  // Em dev usa o proxy do Vite (/api → localhost:5001), evitando CORS.
  // Em produção aponta para o backend hospedado via VITE_API_URL.
  baseURL: import.meta.env.DEV ? '/api' : `${apiOrigin}/api`,
  timeout: 15000,
});

// Injeta token JWT em todas as requisições
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('@SistemaCCO:token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Redireciona para /login em caso de 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('@SistemaCCO:user');
      localStorage.removeItem('@SistemaCCO:token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
