require('dotenv').config();
const express = require('express');
const cors    = require('cors');

const app  = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: ["https://bolao-copa-seven-omega.vercel.app"],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/auth',    require('./routes/auth'));
app.use('/api/matches', require('./routes/matches'));
app.use('/api/bets',    require('./routes/bets'));
app.use('/api/ranking', require('./routes/ranking'));
app.use('/api/teams',   require('./routes/teams'));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use((err, req, res, next) => {
  console.error('💥 Erro não tratado:', err);
  res.status(500).json({ error: 'Erro interno do servidor.' });
});

app.listen(PORT, () => {
  console.log(`⚽ Bolão Copa 2026 rodando na porta ${PORT}`);
  console.log(`🔗 http://localhost:${PORT}`);
});
