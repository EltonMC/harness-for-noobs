# 1. Instalação

Você faz isso **uma vez por computador**. Se algo falhar, rode `npm run harness -- doctor`: ele diz o que falta e o comando exato para instalar.

## O que será instalado e por quê

| Ferramenta | Para que serve |
| --- | --- |
| Git | Guarda o histórico e permite desfazer mudanças |
| Node.js 22+ | Roda o Harness e a aplicação |
| pnpm 10+ | Baixa as bibliotecas da aplicação com proteções de segurança |
| uv | Cria e atualiza o projeto (Copier) e roda o BMad |
| GitHub CLI (`gh`) | Abre pull requests e aplica as proteções do repositório |
| Gitleaks | Segunda camada contra senhas e chaves em commits |
| Supabase CLI | Banco de dados local para testar sem risco |
| Docker Desktop | Motor que roda o Supabase local |
| Um agente de IA | Claude Code, Codex, Cursor, GitHub Copilot ou Cline |

## macOS

1. Abra o **Terminal**.
2. Instale as ferramentas de linha de comando da Apple: `xcode-select --install`
3. Instale o Homebrew seguindo [brew.sh](https://brew.sh) e feche/abra o Terminal.
4. Instale tudo de uma vez:

   ```bash
   curl -fsSL https://raw.githubusercontent.com/EltonMC/harness-for-noobs/v0.3.0/Brewfile -o "$TMPDIR/harness-Brewfile"
   less "$TMPDIR/harness-Brewfile"          # confira a lista (q para sair)
   brew bundle --file="$TMPDIR/harness-Brewfile"
   ```

5. Abra o **Docker Desktop** pelo Launchpad e aceite os termos.

## Windows

No Windows, trabalhe **dentro do WSL2** (um Ubuntu que roda no Windows). O Supabase local, os Git hooks e os scripts funcionam igual ao Linux, sem surpresas.

1. Abra o **PowerShell como administrador** e rode `wsl --install -d Ubuntu`. Reinicie o computador e crie seu usuário do Ubuntu.
2. Instale o Docker Desktop: `winget install --id Docker.DockerDesktop`. Abra-o e ative **Settings → Resources → WSL integration → Ubuntu**.
3. Abra o app **Ubuntu** e siga a seção **Linux** abaixo. Guarde seus projetos dentro do Ubuntu (por exemplo `~/projetos`), não em `C:\`.
4. Para editar, use o VS Code com a extensão **WSL** ou rode o agente dentro do terminal do Ubuntu.

## Linux (Ubuntu/Debian)

```bash
sudo apt update && sudo apt install -y git curl
curl https://mise.run | sh
echo 'eval "$(~/.local/bin/mise activate bash)"' >> ~/.bashrc && source ~/.bashrc
mise use -g node@24          # a mesma versão do .nvmrc
npm install --global pnpm    # o projeto troca sozinho para a versão fixada no package.json
curl -LsSf https://astral.sh/uv/install.sh | sh
```

> Esses comandos baixam instaladores oficiais. Rode-os você mesmo; o agente é impedido de executar scripts baixados direto no shell.

Depois instale [GitHub CLI](https://github.com/cli/cli#installation), [Docker Engine](https://docs.docker.com/engine/install/), [Supabase CLI](https://supabase.com/docs/guides/local-development/cli/getting-started) e [Gitleaks](https://github.com/gitleaks/gitleaks#installing).

## Criar o seu projeto

```bash
uvx copier@9.18.2 copy gh:EltonMC/harness-for-noobs meu-app
```

O Copier vai perguntar:

- **Nome do produto**: aparece no título da aplicação. Pode mudar depois.
- **Idioma da conversa**: em que idioma os agentes falam com você e escrevem os resumos dos pull requests.
- **Idioma da interface**: o idioma que as pessoas usuárias do seu produto verão.
- **Agentes**: marque com espaço os que você usa e confirme com Enter.

Depois:

```bash
cd meu-app
git init -b main
git add -A
git commit -m "chore: create project from Harness"
npm run harness -- setup
```

O `setup` instala as skills, ativa os Git hooks e termina com um diagnóstico. Resolva o que aparecer com ✖, de cima para baixo.

## Colocar no GitHub

```bash
gh auth login                                   # uma vez
gh repo create meu-app --private --source . --push
npm run harness -- github-protect               # mostra o plano
npm run harness -- github-protect --apply       # aplica
```

> Repositórios privados no plano gratuito do GitHub não aceitam proteção da `main`. O comando avisa. Nesse caso escolha entre repositório público ou GitHub Pro.

## Primeira conversa com o agente

Abra o agente na pasta do projeto (`claude`, `codex` ou abra a pasta no Cursor) e escreva:

> use harness-start: quero criar [descreva sua ideia em uma frase]

Próximo guia: [Contas e segredos](02-contas-e-segredos.md).
