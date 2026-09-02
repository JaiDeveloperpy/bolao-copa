# ⚽ Bolão da Copa do Mundo 2026

> *Desenvolvido e rodado **ao vivo durante a Copa do Mundo 2026** (junho–julho), com um
> grupo de amigos apostando nos jogos reais. Refatorado em setembro/2026.*

Um **bolão que organizei para a Copa do Mundo de 2026** para jogar com um grupo de
amigos. Cada pessoa cria uma conta, dá seu palpite de placar para cada jogo e ganha
pontos conforme o quão perto chegou do resultado real. Um ranking mostra quem está
mandando bem e quem está pagando os micos.

Comecei como um projeto pessoal pra resolver a bagunça de anotar palpites no grupo do
WhatsApp, e acabou virando um sisteminha completo com backend, banco de dados e painel
de administração.

---

## ✨ O que dá pra fazer

- **Cadastro e login** dos participantes (senha com hash, sessão via token).
- **Palpites de placar** por jogo, que fecham automaticamente alguns minutos antes de
  cada partida — depois disso ninguém mais mexe.
- **Pontuação automática**: quando o resultado é registrado, o banco calcula os pontos
  de todo mundo na hora.
- **Ranking geral** com critérios de desempate (mais cravadas, menos erros, etc.).
- **Painel de admin** pra cadastrar jogos, lançar resultados e fechar apostas.
- **Brincadeiras extras**: sequência de erros, "palpites malucos" (os mais absurdos) e
  destaques de cada jogador.
- Mata-mata com empate no tempo normal usa um **palpite de quem classifica** para
  desempatar a pontuação.

---

## 🏆 Como funciona a pontuação

| Você acertou… | Pontos |
|---------------|:------:|
| O placar exato | **10** |
| O vencedor **e** a diferença de gols (inclui empate certo) | **7** |
| Só o vencedor / que ia dar empate | **5** |
| Errou o resultado | **0** |

Nos jogos de mata-mata que terminam empatados no tempo normal, entra também o palpite de
**qual seleção classifica** (nos pênaltis/prorrogação), que soma ou tira pontos conforme
a tabela acima. Toda essa lógica vive numa função + trigger do PostgreSQL — assim a conta
é sempre consistente, não importa por onde o resultado seja lançado.

---

## 🧱 Stack

- **Backend:** Node.js + Express
- **Banco:** PostgreSQL (com funções e triggers pra pontuação)
- **Auth:** JWT + bcrypt
- **Automação:** node-cron (fecha apostas sozinho e, opcionalmente, busca placares numa API)
- **Frontend:** HTML/CSS/JavaScript puro (sem framework), servido como site estático

Em produção o frontend roda na **Vercel** e o backend + banco na **Railway**.

---

## 📁 Estrutura

```
bolao-copa/
├── backend/
│   ├── config.js            ← lê e valida as variáveis de ambiente (segredos)
│   ├── server.js            ← Express: middlewares, rotas e arquivos estáticos
│   ├── cron.js              ← fecha apostas e (opcional) busca placares
│   ├── db/
│   │   ├── index.js         ← pool de conexão do PostgreSQL
│   │   ├── schema.sql       ← fonte única: tabelas, funções, triggers, views
│   │   ├── seed.sql         ← seleções e grupos iniciais
│   │   ├── data/            ← inserts dos jogos (grupos, oitavas…)
│   │   └── migrations/      ← patches históricos (já dobrados no schema)
│   ├── middleware/auth.js   ← valida o token JWT e checa admin
│   └── routes/              ← auth, matches, bets, ranking, teams
└── frontend/
    └── public/              ← index.html, palpites, ranking, css, js
```

---

## 🚀 Rodando localmente

**1. Banco de dados**

```bash
createdb bolao_copa2026
psql bolao_copa2026 -f backend/db/schema.sql
psql bolao_copa2026 -f backend/db/seed.sql        # seleções e grupos (opcional)
```

**2. Backend**

```bash
cd backend
cp .env.example .env       # preencha DATABASE_URL e JWT_SECRET
npm install
npm run dev                # nodemon; ou `npm start` em produção
```

O servidor sobe em `http://localhost:3001` e já serve o frontend.

> As variáveis obrigatórias (`DATABASE_URL`, `JWT_SECRET`) são validadas na
> inicialização — se faltar alguma, o servidor não sobe e avisa qual é.

---

## ⚙️ Virar admin

1. Crie um usuário normal pelo site.
2. No banco, promova para admin:
   ```sql
   UPDATE users SET is_admin = TRUE WHERE email = 'seu@email.com';
   ```
3. Faça login — o botão de admin aparece. A partir daí você cadastra os jogos e
   registra os resultados; os pontos são calculados na hora.

---

## 🌐 Principais rotas da API

```
POST /api/auth/register            criar conta
POST /api/auth/login               entrar
GET  /api/auth/me                  usuário logado

GET   /api/matches                 lista jogos (com seu palpite)
POST  /api/matches                 [admin] criar jogo
PATCH /api/matches/:id/result      [admin] lançar placar → pontua todos
PATCH /api/matches/:id/close-bets  [admin] fechar apostas

POST /api/bets                     palpitar (cria ou atualiza)
GET  /api/bets/my                  meus palpites
GET  /api/bets/all-by-match        palpites de todos (após o fechamento)

GET  /api/ranking                  ranking geral
GET  /api/teams                    seleções e grupos
```

---

## 🔒 Segurança das apostas

- As apostas fecham automaticamente **alguns minutos antes** de cada jogo
  (configurável em `BET_CLOSE_MINUTES`). O corte usa o horário do **banco**, não o do
  servidor, pra não dar problema de fuso.
- O palpite dos outros participantes fica **oculto** até o fechamento.

---

*Projeto pessoal, feito por diversão pra galera. Não é afiliado à FIFA nem à Copa do Mundo.*
