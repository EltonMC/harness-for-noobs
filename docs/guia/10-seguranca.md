# 10. Segurança: o que já protege o seu produto

Um resumo em linguagem simples das proteções automáticas e do que ainda depende de você.

## O que é automático

| Proteção | O que evita | Onde roda |
| --- | --- | --- |
| Segredos fora do código | Senhas e chaves no GitHub ou no site | Hook do agente, commit, CI |
| Segredos em *environments* do GitHub | Uma branch qualquer ler as chaves de produção | GitHub (depois do `github-protect --apply` e da mudança descrita no guia 02) |
| Pacotes com 3 dias de espera e sem scripts não aprovados | Pacote malicioso recém-publicado | Instalação |
| Auditoria de dependências | Biblioteca com falha grave conhecida e correção disponível | Check **Quality gate** |
| Análise estática (Semgrep e lint) | XSS (script injetado no site), `eval`, redirecionamento aberto, segredos | Check **Security scan** |
| Cabeçalhos de segurança (CSP, HSTS…) | Scripts de terceiros, o site dentro de outro site, conexões sem HTTPS | Cada acesso ao site; conferidos no deploy |
| Regras do login | Senha fraca, conta sem confirmar e-mail, sessão longa, força bruta | `verify` e **Security scan** |
| Regras do banco e dos arquivos | Dados ou arquivos visíveis para quem não deve | `verify`, **Database gate** |
| Regras das Edge Functions | Função aberta para qualquer site ou sem checar quem chama | `verify` e **Security scan** |
| Verificação dos workflows (actionlint e zizmor) | CI que vaza credenciais | **Harness checks** |
| Teste passivo da prévia (OWASP ZAP) | Falhas visíveis de fora no site | Prévia do PR (relatório em Artifacts) |
| Agente vigiado | Mandar arquivos para fora, conectar na produção, instalar MCP sem você saber | Hooks do Claude Code e do Codex (Codex sem rede) |

## O que depende de você

1. **Rodar `npm run harness -- github-protect --apply`** e mover os segredos para os ambientes (guia 02).
2. **Ligar 2FA** no GitHub, Supabase, Cloudflare e no provedor de IA. É a proteção mais barata que existe.
3. **Configurar o login de produção** no painel do Supabase igual ao `supabase/config.toml` (veja o [checklist de produção](05-producao.md)).
4. **CAPTCHA** (Cloudflare Turnstile) nos formulários públicos de cadastro, login e recuperação de senha, antes de abrir para o público.
5. **Ler o comentário do PR** quando uma mudança adicionar um serviço de terceiros ao `public/_headers`. Cada serviço novo é alguém a mais que roda código no seu site.
6. **Monitoramento:** alerta de site fora do ar, alerta de erros e alerta de gastos.
7. **Saber o que fazer num incidente:** [guia 09](09-incidente-de-seguranca.md).

## Quando o agente pede confirmação

O agente pode parar e perguntar antes de:

- enviar um arquivo para fora (`curl`, `scp`…);
- usar uma conexão de banco que ele não consegue confirmar que é local;
- mudar arquivos de proteção.

Pergunte **por que** antes de aceitar. Instruções escondidas em páginas, issues ou arquivos baixados podem tentar enganar o agente (isso se chama *prompt injection*).

## Limites

- As proteções pegam os erros mais comuns, não todos. Para produtos com dados sensíveis, pagamentos ou muitos usuários, contrate um teste de invasão (*pentest*) antes de lançar.
- Cursor, Copilot e Cline não executam os hooks do agente: para eles valem os Git hooks e o CI. O Codex executa os hooks, mas edições feitas com `apply_patch` não passam pelas regras de edição; nesse caso também valem os Git hooks e o CI.
