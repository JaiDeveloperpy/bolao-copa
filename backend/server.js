const express = require('express');
const cors    = require('cors');
const path    = require('path');
const { PORT, CORS_ORIGINS } = require('./config');

const app  = express();

// =============================================
// Middlewares globais
// =============================================
app.use(cors({
  origin: CORS_ORIGINS,   // configurável via env CORS_ORIGINS (lista separada por vírgula)
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir frontend estático
app.use(express.static(path.join(__dirname, '../frontend/public')));

// =============================================
// Rotas da API
// =============================================
app.use('/api/auth',    require('./routes/auth'));
app.use('/api/matches', require('./routes/matches'));
app.use('/api/bets',    require('./routes/bets'));
app.use('/api/ranking', require('./routes/ranking'));
app.use('/api/teams',   require('./routes/teams'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/public/index.html'));
});

// =============================================
// Error handler
// =============================================
app.use((err, req, res, next) => {
  console.error('💥 Erro não tratado:', err);
  res.status(500).json({ error: 'Erro interno do servidor.' });
});

app.listen(PORT, () => {
  console.log(`⚽ Bolão Copa 2026 rodando na porta ${PORT}`);
  console.log(`🔗 http://localhost:${PORT}`);

  // Inicia cron de fechamento automático e busca de placares
  const { iniciarCron } = require('./cron');
  iniciarCron();
});
