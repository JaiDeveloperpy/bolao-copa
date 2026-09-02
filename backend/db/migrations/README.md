# Migrations históricas

Estes arquivos são **patches** aplicados no banco enquanto o bolão estava no ar.
Todas as correções aqui **já estão incorporadas no `../schema.sql`**, que é a
fonte única e correta do schema.

- Para um **banco novo**: rode só o `../schema.sql`. Você **não** precisa destes.
- Para um **banco já implantado** (ex.: o do Railway) que foi criado antes das
  correções: rode o patch correspondente uma vez para atualizar função/trigger e
  recalcular os pontos já existentes.

| Arquivo | O que corrige |
|---------|---------------|
| `migration_ranking_fix.sql` | Ranking passa a considerar admin e mostra palpites de todos. |
| `fix_definitivo_pontuacao.sql` | Empate acertado sem placar exato agora vale 7 (a diferença de gols 0=0 estava sendo ignorada). Recalcula o histórico. |
| `migration_fix_trigger_reescore.sql` | Trigger re-pontua quando placar/classificador mudam depois de finalizado (antes só pontuava na primeira finalização). |

> Alguns arquivos contêm `SELECT`s de verificação e um UUID de admin usado só para
> conferência manual na época — são inofensivos.
