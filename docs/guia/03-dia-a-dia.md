# 3. Dia a dia

## O ciclo de uma mudança

```
ideia → harness-start → branch → teste falhando → código → verify → pull request → prévia → merge → produção
```

Você conversa; o agente executa; as proteções conferem; **você decide o merge**.

## Passo a passo

1. **Abra o ambiente**
   - Docker Desktop aberto
   - `pnpm db:start` (uma vez por dia)
   - `pnpm dev` e abra o endereço que aparecer (normalmente http://localhost:5173)

2. **Peça ao agente**
   > use harness-start: quero que a pessoa consiga exportar os gastos do mês em CSV

   Ele vai fazer no máximo três perguntas, criar uma branch e dizer qual caminho escolheu.

3. **Deixe o agente trabalhar.** Você verá testes sendo criados antes do código, e isso é esperado. Se um hook bloquear algo, o agente explica o motivo e segue pelo caminho seguro.

4. **Confira**
   ```bash
   npm run harness -- verify
   ```
   Se aparecer "Tudo verde.", está pronto para revisão.

5. **Entregue**
   > prepare o pull request

   O agente faz commit, envia a branch (pedindo sua confirmação) e abre o PR.

6. **Revise sem ler código**
   - No PR, leia **O que muda**.
   - Abra o **link de prévia** comentado pelo CI. Se não houver link (Cloudflare ainda não configurado) ou se o PR avisar que muda o banco, teste no computador: `pnpm db:reset` e `pnpm dev`.
   - Siga o roteiro **Como testar**.
   - Confira se todos os checks estão verdes ✅.

7. **Faça o merge** (botão *Squash and merge*). O CI publica sozinho: verifica de novo, atualiza o banco e depois o site.

8. **Volte para a main**
   ```bash
   git switch main && git pull
   git branch -D nome-da-branch   # apaga a branch local já mesclada
   ```

## Comandos que você vai usar

| Comando | Quando |
| --- | --- |
| `npm run harness -- doctor` | Algo estranho no computador |
| `npm run harness -- verify` | Antes de pedir revisão |
| `pnpm dev` | Ver a aplicação |
| `pnpm db:start` / `pnpm db:stop` | Ligar/desligar o banco local |
| `pnpm db:reset` | Recriar o banco local do zero (apaga dados locais) |

## Dicas para gastar menos tokens

- Uma conversa por tarefa. Terminou? Comece uma sessão nova (`/clear` no Claude Code).
- Descreva o resultado esperado, não a implementação.
- Não cole logs inteiros; diga "rode o verify" e o agente lê só o resumo.
- Mais em [Custos e tokens](06-custos-e-tokens.md).

Próximo guia: [Socorro](04-socorro.md).
