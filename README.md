# ⚽ Bolão Copa do Mundo 2026

Sistema completo de bolão com PostgreSQL, Node.js e frontend estático.

---

## 📦 Estrutura

```
bolao-copa/
├── backend/
│   ├── db/
│   │   ├── schema.sql      ← Cria todas as tabelas, triggers, views
│   │   ├── seed.sql        ← Seleções e jogos iniciais
│   │   └── index.js        ← Pool de conexão PostgreSQL
│   ├── middleware/
│   │   └── auth.js         ← JWT + verificação de admin
│   ├── routes/
│   │   ├── auth.js         ← POST /register, /login, GET /me
│   │   ├── matches.js      ← CRUD de jogos + registrar resultado
│   │   ├── bets.js         ← Palpites
│   │   ├── ranking.js      ← Ranking geral
│   │   └── teams.js        ← Times e grupos
│   ├── server.js           ← Express + servir frontend
│   ├── package.json
│   └── .env.example
└── frontend/
    └── public/
        ├── index.html
        ├── css/style.css
        └── js/app.js
```

---

## 🚀 Como rodar

### 1. Banco de dados

```bash
# Criar o banco (se ainda não existir)
createdb bolao_copa2026

# Aplicar schema
psql bolao_copa2026 -f backend/db/schema.sql

# Seed com seleções e jogos exemplo (opcional)
psql bolao_copa2026 -f backend/db/seed.sql
```

### 2. Backend

```bash
cd backend
cp .env.example .env
# Edite .env com sua DATABASE_URL e JWT_SECRET

npm install
npm run dev       # Desenvolvimento (nodemon)
# ou
npm start         # Produção
```

### 3. Acessar

Abra `http://localhost:3001` no navegador.

---

## 🏆 Sistema de Pontuação

| Acerto             | Pontos |
|--------------------|--------|
| Placar exato       | **10** |
| Vencedor + saldo   | **7**  |
| Só o vencedor      | **5**  |
| Errou tudo         | **0**  |

A pontuação é **calculada automaticamente** via trigger PostgreSQL quando o admin registra o resultado.

---

## ⚙️ Como usar o painel admin

1. Crie um usuário normal pelo site
2. Promova para admin direto no banco:
   ```sql
   UPDATE users SET is_admin = TRUE WHERE email = 'seu@email.com';
   ```
3. Faça login — o botão "⚙️ Admin" aparece no menu
4. **Adicione os jogos** pelo painel (times, data, estádio, cidade)
5. **Registre os resultados** após cada jogo — os pontos são calculados na hora

---

## 🔒 Segurança das apostas

- Apostas fecham automaticamente **60 minutos antes** do jogo
- Pode fechar manualmente pelo painel admin
- Palpites de outros participantes ficam **ocultos** até o fechamento

---

## 🌐 API — Endpoints principais

### Auth
```
POST /api/auth/register   { name, email, password }
POST /api/auth/login      { email, password }
GET  /api/auth/me
```

### Jogos
```
GET    /api/matches               Lista todos com seu palpite
POST   /api/matches               [ADMIN] Criar jogo
PATCH  /api/matches/:id/result    [ADMIN] Registrar placar
PATCH  /api/matches/:id/close-bets [ADMIN] Fechar apostas
PUT    /api/matches/:id           [ADMIN] Editar jogo
```

### Palpites
```
POST /api/bets                Apostar (ou atualizar)
GET  /api/bets/my             Meus palpites
GET  /api/bets/match/:id      Palpites de todos (após fechamento)
```

### Ranking
```
GET /api/ranking              Ranking geral
GET /api/ranking/me           Minha posição
```

### Times
```
GET  /api/teams               Lista times
POST /api/teams               [ADMIN] Criar time
PUT  /api/teams/:id           [ADMIN] Editar time
GET  /api/teams/groups/all    Lista grupos
```

---

## 📅 Copa 2026 — Info

- **Sede:** EUA, Canadá e México (48 seleções, 104 jogos)
- **Início:** Junho de 2026
- **Fase de grupos:** 12 grupos com 4 times cada
- **API oficial:** Não existe gratuita. Insira jogos e resultados manualmente pelo painel admin.

---

## 🛠️ Dependências

```json
{
  "express": "^4.19",
  "pg": "^8.11",
  "bcryptjs": "^2.4",
  "jsonwebtoken": "^9.0",
  "cors": "^2.8",
  "dotenv": "^16.4"
}
```

---

## 📌 Dicas

- Para resetar pontuações: `UPDATE bets SET points_earned = 0, is_scored = FALSE;`
- Para ver ranking no banco: `SELECT * FROM ranking;`
- Para ver próximos jogos: `SELECT * FROM upcoming_matches;`
