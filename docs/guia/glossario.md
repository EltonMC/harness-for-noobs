# Glossário

| Termo | Em uma frase |
| --- | --- |
| **Agente** | IA que lê e altera os arquivos do projeto seguindo suas instruções (Claude Code, Codex, Cursor…). |
| **Branch** | Uma cópia paralela do projeto onde uma mudança é feita sem afetar a versão principal. |
| **main** | A branch principal. É o que está (ou vai para) produção. Ninguém mexe nela direto. |
| **Commit** | Um "ponto de salvamento" com descrição, que pode ser desfeito. |
| **Push** | Enviar seus commits para o GitHub. |
| **Pull request (PR)** | Pedido para juntar uma branch na main, com resumo, prévia e checks. |
| **Merge** | Aceitar o PR e juntar a mudança na main. É a sua decisão de publicar. |
| **Revert** | Um novo commit que desfaz outro, sem apagar histórico. |
| **Force push** | Sobrescrever o histórico no GitHub. Perigoso; bloqueado pelo Harness. |
| **CI** | Robôs do GitHub (Actions) que testam e publicam cada mudança automaticamente. |
| **Check** | Resultado de uma verificação do CI no PR: ✅ passou, ❌ falhou. |
| **Deploy** | Publicar uma versão da aplicação na internet. Feito só pelo CI. |
| **Prévia (preview)** | Versão temporária da aplicação com as mudanças do PR, para você testar antes do merge. |
| **Rollback** | Voltar a aplicação publicada para a versão anterior. |
| **Hook** | Verificação automática que roda antes de uma ação (comando do agente, commit, push) e pode bloqueá-la. |
| **Teste** | Código que confere automaticamente se uma funcionalidade faz o que deveria. |
| **TDD** | Escrever o teste antes do código: o teste falha, o código faz passar. |
| **E2E** | Teste de ponta a ponta: um navegador automático usa a aplicação como uma pessoa usaria. |
| **Lint** | Verificação de estilo e erros comuns no código. |
| **Build** | Transformar o código em arquivos prontos para publicar. |
| **Dependência / pacote** | Biblioteca de terceiros que a aplicação usa, instalada pelo pnpm. |
| **Supabase** | Serviço que fornece banco de dados, login e armazenamento de arquivos. |
| **Migration** | Arquivo versionado que altera a estrutura do banco. É assim que o banco muda, nunca na mão. |
| **RLS** | *Row Level Security*: regras no banco que definem quem vê e altera cada linha. Sem ela, qualquer pessoa pode ler tudo. |
| **Chave publishable** | Chave do Supabase que pode ir para o navegador, porque respeita a RLS. |
| **service_role / secret key** | Chave do Supabase que ignora a RLS. Nunca vai para o navegador. |
| **Edge Function** | Pequeno código que roda no servidor do Supabase, onde segredos podem ser usados com segurança. |
| **Cloudflare Workers** | Onde a aplicação fica publicada na internet. |
| **Variável de ambiente** | Configuração passada fora do código (ex.: `.env.local`, Secrets do GitHub). |
| **Segredo** | Senha, token ou chave privada. Nunca em arquivo do projeto. |
| **Work item** | Arquivo curto que descreve uma tarefa: objetivo, critérios de aceite e evidências. |
| **Handoff** | Resumo aprovado do planejamento, entregue para a implementação. |
| **ADR** | Registro de uma decisão de arquitetura e do porquê. |
| **BMad** | Conjunto de skills para planejar produto (brief, PRD, UX, arquitetura, histórias). |
| **Skill** | Instruções empacotadas que ensinam o agente a fazer um tipo de tarefa. |
| **Token** | Unidade de cobrança dos agentes de IA: tudo o que eles leem e escrevem. |
| **Copier** | Ferramenta que cria o projeto a partir do Harness e aplica atualizações. |
