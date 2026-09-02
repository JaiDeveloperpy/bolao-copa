// =============================================
// Configuração central e validação de ambiente
// =============================================
// Concentra a leitura de variáveis sensíveis num lugar só.
// Se um segredo obrigatório faltar, o servidor NÃO sobe — é melhor
// falhar alto no deploy do que rodar com um segredo fraco/hardcoded.
require('dotenv').config();

function required(name) {
  const value = process.env[name];
  if (!value || value.trim() === '') {
    throw new Error(
      `Variável de ambiente obrigatória ausente: ${name}. ` +
      `Defina-a no .env (local) ou nas variáveis do serviço (produção).`
    );
  }
  return value;
}

module.exports = {
  // Obrigatórias — sem elas o app não funciona com segurança
  JWT_SECRET:     required('JWT_SECRET'),
  DATABASE_URL:   required('DATABASE_URL'),

  // Opcionais — com padrões seguros
  JWT_EXPIRES_IN:    process.env.JWT_EXPIRES_IN    || '7d',
  PORT:              parseInt(process.env.PORT || '3001', 10),
  BET_CLOSE_MINUTES: parseInt(process.env.BET_CLOSE_MINUTES || '5', 10),
  NODE_ENV:          process.env.NODE_ENV || 'development',

  // Origens permitidas pelo CORS (frontend). Separadas por vírgula.
  CORS_ORIGINS: (process.env.CORS_ORIGINS ||
    'http://localhost:3001,https://bolao-copa-seven-omega.vercel.app'
  ).split(',').map(o => o.trim()).filter(Boolean),

  // Opcional: integração com a API de placares (cron). Sem ela, o cron
  // apenas fecha apostas e não tenta buscar resultados automaticamente.
  RAPIDAPI_KEY: process.env.RAPIDAPI_KEY || null,
};
