'use strict';

/**
 * Middleware de upload de arquivos — memoryStorage
 *
 * Mantém o arquivo em memória (req.file.buffer) para enviá-lo diretamente
 * ao Supabase Storage sem gravar nada em disco.
 *
 * Tipos aceitos : image/jpeg, image/jpg, image/png
 * Tamanho máximo: 5 MB
 */

const multer = require('multer');

const TIPOS_PERMITIDOS = ['image/jpeg', 'image/jpg', 'image/png'];
const TAMANHO_MAXIMO   = 5 * 1024 * 1024; // 5 MB

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: TAMANHO_MAXIMO },
  fileFilter: (_req, file, cb) => {
    if (TIPOS_PERMITIDOS.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de arquivo inválido. Enviar apenas JPEG ou PNG.'));
    }
  },
});

module.exports = upload;
