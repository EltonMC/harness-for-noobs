# 8. Banco de dados: o que você aprova e o que o Harness confere

O banco guarda os dados das pessoas que usam o seu produto. Um erro ali pode vazar dados pessoais ou apagar algo que não volta. Por isso, toda mudança no banco passa por três camadas:

1. **Você aprova, em português, o que vai ser guardado.** O agente nunca aprova por você.
2. **Robôs conferem o banco** no seu computador e no GitHub, sem depender de o agente lembrar das regras.
3. **Apagar dados em produção pede um segundo "sim"** seu, direto no GitHub.

## 1. A "Ficha do dado"

Antes de criar ou mudar uma tabela (tabela é como uma planilha do banco), o agente escreve uma proposta em `.harness/database/changes/`. Ela começa com uma ficha sem código:

| Pergunta | Por que importa |
| --- | --- |
| O que vamos guardar e por quê? | Guardar só o necessário é a regra número um da LGPD. |
| Quem pode ver? Quem pode mudar ou apagar? | Vira regra no banco (RLS) e um teste automático. |
| Tem dado pessoal? É sensível? | Dado sensível (saúde, religião, biometria, origem racial, vida sexual, opinião política, dados de crianças) tem regras mais rígidas na LGPD. |
| Por quanto tempo guardamos? | Dado guardado "para sempre" sem motivo é risco sem benefício. |
| O que acontece quando a pessoa apaga a conta? | A pessoa tem direito de pedir a exclusão dos próprios dados. |
| O que se perde se der errado? | Ajuda a decidir quanto cuidado a mudança merece. |

A ficha também traz **cenários de acesso**, por exemplo: "❌ Maria **não** vê os pedidos do João". Cada cenário vira um teste que roda em todo pull request. Se alguém quebrar a regra no futuro, o teste falha.

**Como aprovar:** leia a ficha. Se algo não fizer sentido, pergunte. Se estiver de acordo, responda ao agente algo como "aprovado". Só então ele registra `Aprovado por (nome e data)`. Sem essa linha preenchida, o `verify` e o GitHub não deixam a mudança seguir.

## 2. O que os robôs conferem

| Verificação | Em palavras simples |
| --- | --- |
| Toda tabela tem RLS | Cada linha tem dono; ninguém lê tudo. |
| Views seguem a RLS | Uma *view* (consulta salva que parece tabela) não pode furar as regras de acesso. |
| Nenhuma regra "libera tudo" | Liberar para todos só com uma exceção escrita e justificada. |
| Nenhuma regra usa dado que a própria pessoa edita | Senão qualquer um se promove a administrador. |
| Funções não rodam com "superpoderes" expostas | Funções *security definer* ficam fora da API. |
| Nenhuma lista de contas exposta | Os e-mails de todos os usuários não aparecem em nenhuma view pública. |
| Toda tabela explica para que serve | Documentação mínima para quem vier depois. |
| **Toda coluna diz se é dado pessoal** | `pii:none` (não é pessoal), `pii:personal` (pessoal) ou `pii:sensitive` (sensível). É decidido na hora de criar a coluna. |
| Apagar uma conta não é bloqueado | Dados ligados à pessoa são apagados ou desvinculados junto. |
| Verificador oficial do Supabase | As regras de segurança do próprio Supabase (*advisors*). |
| Migrations antigas não mudam | Migration é o arquivo que altera o banco. A que já foi para produção nunca é editada; a correção vem numa nova. |
| Documentação completa | Proposta aprovada, revisão do DBA, dicionário de dados e matriz de acesso. |

Onde rodam: no `npm run harness -- verify` (no seu computador, com `pnpm db:start` ligado) e no check **Database gate** de todo pull request. Se o trabalho mexe no banco e o banco local está desligado, o `verify` falha em vez de fingir que está tudo bem.

## 3. O comentário do banco no pull request

Quando um PR muda o banco, o GitHub comenta um resumo:

- 🟢 **só adiciona**: cria coisas novas; nada existente muda.
- 🟠 **reescreve dados ou quebra compatibilidade**: altera dados existentes, renomeia ou muda o tipo de algo.
- 🔴 **apaga dados**: remove tabelas, colunas ou linhas. **Não tem desfazer.**

Para 🟠 e 🔴:

1. O agente explica exatamente o que muda ou some e pede a sua aprovação por escrito na proposta (`Aprovação de mudança que apaga ou reescreve dados`).
2. Confira se existe backup recente do banco de produção (Supabase → Database → Backups). No plano gratuito não há backup automático: considere exportar os dados antes.
3. Depois do merge, o deploy **para e espera** você clicar em **Review deployments → Approve** no GitHub (aba Actions). Isso só funciona depois de rodar uma vez `npm run harness -- github-protect --apply`. Sem isso, o deploy falha de propósito e explica o que fazer.

O deploy olha **tudo o que ainda não rodou em produção**, não só o último PR. Se uma migration destrutiva ficou pendente (por exemplo, você recusou a aprovação), ela continua pedindo aprovação no próximo deploy. Em repositório privado, o deploy também guarda por 30 dias uma cópia da **estrutura** do banco (sem dados pessoais) em Actions → execução → Artifacts.

## O que o agente não pode fazer no banco

- Conectar no banco de produção (psql, `supabase db query --linked`, `supabase db dump` ou ferramentas MCP de banco). Produção tem dados pessoais reais; o agente trabalha só com o banco local e dados de teste fictícios (`supabase/seed.sql`).
- Editar uma migration que já está na `main`.
- Preencher as linhas de aprovação no seu lugar.
- Apagar ou afrouxar as verificações em `.harness/database/guards/` sem pedir a você.

## Limites (seja realista)

- As verificações pegam os erros mais comuns e perigosos, não todos. A revisão do DBA e a sua leitura da ficha continuam importantes.
- A prévia do PR usa um banco separado que **não recebe** as migrations. Mudanças de banco você testa no computador: `pnpm db:reset` e `pnpm dev`.
- LGPD vai além do banco: política de privacidade, termos de uso e canal de exclusão estão no [checklist de produção](05-producao.md).
