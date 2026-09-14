# 4. Socorro

Primeiro passo, sempre: peça ao agente **"use harness-recovery"** e descreva o que viu. Ele diagnostica antes de mexer em qualquer coisa.

Se estiver sem agente, use a tabela abaixo.

| O que aconteceu | O que fazer |
| --- | --- |
| "Commits direto na branch main são bloqueados" | Normal. `git switch -c fix/minha-mudanca` e faça o commit de novo. Suas alterações vão junto. |
| "Possíveis segredos no commit" | Tire o valor do arquivo (o agente faz isso), cole você mesmo no `.env.local` ou nos Secrets do GitHub e rode `git add` de novo. **Se já foi para o GitHub, revogue a chave no painel do serviço agora.** |
| `verify` mostra ✖ | Peça ao agente: "corrija o que o verify apontou". Não apague testes para passar. |
| Checks vermelhos no pull request | Abra o check que falhou, copie só o título do erro para o agente e peça a correção na mesma branch. |
| Quero desfazer o que o agente mudou (sem commit) | `git status` mostra os arquivos. Alterados: `git restore --staged --worktree caminho/do/arquivo`. Novos: `git clean -n` lista, e você apaga só os que quiser. |
| Fiz merge e quebrou | No GitHub, abra o PR e clique em **Revert**. Faça merge do PR de revert quando os checks ficarem verdes. |
| O site saiu do ar | Cloudflare → Workers → seu projeto → **Deployments** → volte para a versão anterior. Depois reverta o PR. Atenção: isso não desfaz mudanças no banco. Se o PR tinha migration, peça ao agente "use harness-recovery: verificar migration em produção". |
| O banco de produção deu erro depois de um merge | Não rode nada no banco de produção. Peça ao agente "use harness-recovery: migration falhou em produção" para criar uma correção via PR. |
| `pnpm db:start` falha | Abra o Docker Desktop e espere ficar pronto. Depois `pnpm db:stop` e `pnpm db:start`. |
| O `setup` ou o `doctor` mostra ✖ | Rode o comando que aparece ao lado do ✖, feche e abra o terminal, rode de novo. |
| PR de atualização do Harness com conflitos | Peça ao agente: "resolva os conflitos deste PR do Harness mantendo as decisões do meu produto". |
| Estou perdido | "use harness-start". Ele resume onde você está e qual é o próximo passo. |

## O que o agente nunca vai fazer (e por quê)

- **Force push, commit na main, merge de PR:** reescrevem ou publicam trabalho sem revisão.
- **Deploy do seu computador ou mudança no banco de produção:** só o CI faz, depois do seu merge.
- **Ler `.env.local`:** ali ficam seus segredos locais.

Se um desses bloqueios atrapalhar um caso legítimo, faça você mesmo, conscientemente, ou ajuste a proteção num pull request revisado.
