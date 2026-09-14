# 6. Custos e tokens

**Token** é a unidade que os agentes de IA cobram: tudo o que o agente lê (arquivos, logs, instruções) e escreve conta. Ler demais custa mais do que escrever.

## O que o Harness já faz por você

| Técnica | Efeito |
| --- | --- |
| Scripts em vez de agente (`init-app`, `verify`, `doctor`) | Criar o app e checar erros não gasta raciocínio do agente |
| `verify` mostra só as falhas | O agente lê 20 linhas em vez de milhares; o log completo fica em `.harness/logs/` |
| `AGENTS.md` curto | Menos texto carregado em toda conversa |
| BMad no perfil essencial | 14 das 29 skills do BMad; cada skill instalada entra em toda conversa |
| Subagente `harness-scout` com modelo pequeno | Achar arquivos custa bem menos que ler a pasta inteira |
| Memória por busca | O agente lê só a página que interessa, nunca o histórico todo |
| Hooks automáticos | Erros de lint e testes aparecem cedo, antes de o agente dar voltas |

## Hábitos que mais economizam

1. **Uma conversa por tarefa.** Conversas longas relêem tudo a cada mensagem. Terminou? `/clear` (Claude Code) ou nova sessão.
2. **Peça resultados, não passos.** "A pessoa precisa exportar CSV do mês" é melhor que ditar a implementação.
3. **Não cole logs.** Diga "rode o verify".
4. **Planejamento grande em sessão separada.** PRD e arquitetura geram documentos; a implementação lê só o handoff aprovado.
5. **Escolha o modelo pela tarefa.** Modelos maiores para planejar e revisar; menores para tarefas simples.

## Medir antes de otimizar

- Claude Code: `/cost` e `/context` na conversa; histórico com `npx ccusage@latest`.
- Codex: `/status`.
- Anote os números no work item de tarefas parecidas e compare.

## Ferramentas opcionais (use só depois de medir)

### RTK: compressão da saída do terminal

O [RTK](https://github.com/rtk-ai/rtk) fica entre o terminal e o agente e resume a saída de comandos como git, testes e builds. Os autores relatam de 60% a 90% menos tokens nesses comandos. Ele muda o que o agente vê, então o Harness **não instala por padrão**. Para testar:

1. Anote os tokens de 2–3 tarefas típicas.
2. `brew install rtk` e siga a documentação do RTK para ativar o hook do seu agente.
3. Repita tarefas parecidas e confira se erros de teste e caminhos de arquivo continuam visíveis.
4. Ficou mais barato sem esconder falhas? Mantenha e registre num ADR. Senão, desative.

### Navegação semântica de código

Em projetos grandes, ferramentas como o [Serena](https://github.com/oraios/serena) deixam o agente buscar funções pelo nome em vez de ler arquivos inteiros. Em projetos pequenos o ganho costuma ser pequeno; avalie com a mesma medição.

### Caveman

A skill `caveman` faz o agente responder de forma ultracomprimida. Use só para trocas entre agentes. Para você, respostas claras evitam mal-entendidos, que custam mais tokens.

## Custos dos serviços

Supabase, Cloudflare e GitHub têm planos gratuitos suficientes para começar. Configure alertas de gasto em todos (veja [Antes de lançar](05-producao.md)).
