// Middleware de segurança para o backend
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');

// Rate limiting para prevenir abuso
const createRateLimiter = (windowMs = 15 * 60 * 1000, max = 100) => {
  return rateLimit({
    windowMs, // 15 minutos por padrão
    max, // limite de requisições
    message: {
      error: true,
      message: 'Muitas requisições deste IP, tente novamente mais tarde.'
    },
    standardHeaders: true,
    legacyHeaders: false,
  });
};

// Rate limiters específicos
const rateLimiters = {
  // Geral - 100 requisições por 15 minutos
  general: createRateLimiter(15 * 60 * 1000, 100),
  
  // Login - 5 tentativas por 15 minutos
  auth: createRateLimiter(15 * 60 * 1000, 5),
  
  // Uploads - 10 uploads por hora
  upload: createRateLimiter(60 * 60 * 1000, 10),
  
  // API - 200 requisições por 15 minutos
  api: createRateLimiter(15 * 60 * 1000, 200),
};

// Configuração do Helmet
const helmetConfig = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
    },
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" },
});

module.exports = {
  rateLimiters,
  helmetConfig,
};
