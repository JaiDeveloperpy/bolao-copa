const jwt = require('jsonwebtoken');

// ⚠️ ATENÇÃO: Use exatamente a MESMA string/chave que você colocou lá no routes/auth.js
const JWT_SECRET_KEY = process.env.JWT_SECRET || 'Zk5q8cfTztWcjWVFPELaZJ0go5yROh1MxmCEU6mEtb4=';

const auth = (req, res, next) => {
  const header = req.headers['authorization'];
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token não fornecido.' });
  }

  const token = header.split(' ')[1];
  try {
    // Trocado de process.env.JWT_SECRET para JWT_SECRET_KEY
    const payload = jwt.verify(token, JWT_SECRET_KEY);
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido ou expirado.' });
  }
};

const adminOnly = (req, res, next) => {
  if (!req.user?.is_admin) {
    return res.status(403).json({ error: 'Acesso restrito a administradores.' });
  }
  next();
};

module.exports = { auth, adminOnly };