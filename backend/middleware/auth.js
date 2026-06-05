const jwt = require('jsonwebtoken');

const auth = (req, res, next) => {
  const header = req.headers['authorization'];
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token não fornecido.' });
  }

  const token = header.split(' ')[1];
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
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
