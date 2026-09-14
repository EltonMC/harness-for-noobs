# 7. Atualizando o Harness

O Harness evolui com novas proteções, skills melhores e correções. Você não precisa acompanhar nada manualmente.

## Como funciona

1. Toda **segunda-feira** o workflow *Harness update* do seu repositório verifica se existe versão nova.
2. Se existir, ele aplica a atualização e roda os testes do Harness.
3. **Com o token configurado** (abaixo), ele abre um **pull request** "Atualização do Harness X → Y" explicando **o que mudou** e **se você precisa fazer algo**.
4. **Sem o token**, ele abre uma **issue** "Nova versão do Harness disponível" com o passo a passo para atualizar com o agente.
5. Nada é aplicado sem você.

Também dá para rodar na hora: GitHub → **Actions → Harness update → Run workflow**.

## Configurar o token (uma vez, recomendado)

O token padrão do GitHub não pode alterar arquivos de workflow, e quase toda versão do Harness mexe neles. Por isso o PR automático precisa de um token seu:

1. GitHub → sua foto → **Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token**.
2. **Repository access:** *Only select repositories* → escolha só este projeto.
3. **Permissions → Repository permissions:** *Contents: Read and write*, *Pull requests: Read and write*, *Workflows: Read and write*.
4. Validade: 1 ano. Anote na agenda para renovar.
5. No repositório: **Settings → Secrets and variables → Actions → New repository secret**. Nome `HARNESS_UPDATE_TOKEN` e cole o token.
6. Rode `npm run harness -- github-protect --apply`: ele permite que o GitHub Actions abra pull requests.

## O que a atualização nunca toca

Arquivos do seu produto: código da aplicação, `README.md`, `package.json`, `.harness/project.yaml` (nome, idiomas e comandos), `.harness/context/project-context.md`, `access-matrix.md`, design, dicionário de dados, páginas de memória, work items e o handoff ativo.

Ela atualiza o que é do Harness: scripts, hooks, skills, workflows (inclusive CI e deploy da aplicação), templates, guias, `AGENTS.md`, `.harness/harness.yaml` e os índices da memória. Regras específicas do seu projeto ficam em `project-context.md`, que nunca é sobrescrito.

## Revisando o PR de atualização

1. Leia a seção **Precisa fazer algo?** de cada versão.
2. Confira se os checks estão verdes ✅.
3. Se o PR listar **conflitos**, peça ao agente:
   > resolva os conflitos deste PR do Harness mantendo as decisões do meu produto
4. Faça o merge.
5. No seu computador:
   ```bash
   git switch main && git pull
   npm run harness -- setup
   ```

Se você já fez commits no PR de atualização (por exemplo, resolvendo conflitos), o workflow da semana seguinte não mexe nessa branch.

## Atualizar manualmente (ou a partir da issue)

Peça ao agente: **"atualize o Harness seguindo o guia 07"**. Ou rode:

```bash
git switch -c chore/harness-update
uvx copier@9.18.2 update --defaults --conflict inline
npm run check
```

Se aparecerem blocos `<<<<<<<`, resolva (ou peça ao agente), faça commit e abra um PR.

## Skills externas (BMad, Impeccable, Caveman)

Elas têm versões travadas e um verificador semanal próprio no repositório do Harness. Quando houver versão nova, quem mantém o Harness prepara a atualização, e ela chega a você no PR de atualização do Harness.

## Projetos antigos (criados com `git clone`)

1. Numa branch nova: `git switch -c chore/adopt-copier`
2. `git remote -v`: se o `origin` ainda aponta para o repositório do Harness, rode `git remote remove origin` e adicione o seu.
3. `uvx copier@9.18.2 copy --vcs-ref v0.3.0 --overwrite gh:EltonMC/harness-for-noobs .` e responda as perguntas.
4. Revise com `git diff`: restaure com `git restore <arquivo>` qualquer arquivo do seu produto que tenha mudado.
5. Siga os passos manuais da versão 0.3.0 no `CHANGELOG.md`.
6. `npm run harness -- setup`, `npm run check`, commit e pull request.
