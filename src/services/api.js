import axios from 'axios';

const normalizeApiOrigin = (raw) => {
  const value = (raw || '').trim();
  if (!value) return '';
  return value.replace(/\/api\/?$/, '').replace(/\/$/, '');
};

const apiOrigin = normalizeApiOrigin(import.meta.env.VITE_API_URL) || 'http://localhost:5001';

const api = axios.create({
  // Em dev, usa o proxy do Vite (mesma origem), evitando CORS e problemas de porta.
  // Em build/produção, aponta para o backend configurado em VITE_API_URL.
  baseURL: import.meta.env.DEV ? '/api' : `${apiOrigin}/api`,
});

// Interceptor para adicionar token em todas as requisições
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('@SistemaCCO:token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para tratar erros de autenticação
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
