# Publicar o ControlaAí no Azure (acesso restrito à empresa)

Guia para o time de TI publicar o app no **Azure App Service** com login
**Microsoft Entra ID** restrito ao tenant da empresa. Resultado: só contas
`@exemplo.com.br` conseguem acessar, e **cada pessoa usa o próprio login
corporativo** (sem senha compartilhada).

## Como funciona

- O app é **um único serviço**: o Express serve a API **e** o frontend React
  compilado (`web/dist`) na mesma origem.
- O **App Service "Authentication" (Easy Auth)** fica na frente: requisições
  não autenticadas são redirecionadas ao login da Microsoft. Só quem está no
  tenant da empresa passa.
- Com `AUTH_MODE=entra`, o backend confia na identidade que o App Service
  injeta (cabeçalho `X-MS-CLIENT-PRINCIPAL-NAME` = e-mail). Ele mapeia o e-mail
  para o usuário semeado (papéis dev/gestor/usuário) ou **cria automaticamente**
  como "usuário" no primeiro acesso.

> ⚠️ **Importante:** `AUTH_MODE=entra` só é seguro **atrás do Easy Auth com
> autenticação obrigatória**. Sem isso, os cabeçalhos de identidade poderiam ser
> forjados. Nunca exponha o app com `AUTH_MODE=entra` sem o Easy Auth ativo.

## Pré-requisitos

- Assinatura Azure e permissão para criar App Service.
- Permissão para **registrar um aplicativo no Entra ID** (ou pedir ao admin do
  tenant). O próprio fluxo de Authentication cria o registro.
- Azure CLI (`az`) OU acesso ao Portal do Azure.

## Passo 1 — Criar o App Service (Linux, Node 20)

Via Azure CLI (ajuste os nomes; `APP` precisa ser único globalmente):

```bash
RG=rg-controlaai
APP=controlaai-empresa
PLAN=plan-controlaai
LOCATION=brazilsouth

az group create -n $RG -l $LOCATION
az appservice plan create -g $RG -n $PLAN --sku B1 --is-linux
az webapp create -g $RG -p $PLAN -n $APP --runtime "NODE:20-lts"
az webapp config set -g $RG -n $APP --startup-file "npm start"
```

## Passo 2 — Configurações do aplicativo (variáveis de ambiente)

```bash
az webapp config appsettings set -g $RG -n $APP --settings \
  SCM_DO_BUILD_DURING_DEPLOYMENT=true \
  AUTH_MODE=entra \
  ALLOWED_EMAIL_DOMAIN=exemplo.com.br \
  DB_DIR=/home/data \
  AUTO_SEED=true \
  JWT_SECRET="$(openssl rand -hex 32)"
```

- `SCM_DO_BUILD_DURING_DEPLOYMENT=true` — o Azure (Oryx) roda `npm run build`
  (instala e compila web + server, incluindo o binário Linux do `better-sqlite3`).
- `DB_DIR=/home/data` — coloca o SQLite no armazenamento **persistente** do
  App Service (sobrevive a restarts).
- `AUTO_SEED=true` — semeia o banco no 1º start. **Desligue depois** (Passo 5).

## Passo 3 — Deploy do código

Envie a pasta `controlaai/` (com `package.json`, `web/`, `server/`) **sem**
`node_modules` nem `web/dist` (o Azure compila). Opções:

**a) Zip deploy pela CLI**
```bash
# a partir da pasta controlaai/
zip -r ../controlaai.zip . -x "node_modules/*" "*/node_modules/*" "web/dist/*" "server/data/*" ".git/*"
az webapp deploy -g $RG -n $APP --src-path ../controlaai.zip --type zip
```

**b) VS Code** — extensão *Azure App Service* → botão direito no app →
*Deploy to Web App* → selecione a pasta `controlaai`.

**c) GitHub Actions** — conecte o repositório em *Deployment Center*; o Azure
gera o workflow (usa `npm run build` + `npm start`).

## Passo 4 — Ativar o login Microsoft (restrito ao tenant)

No **Portal do Azure → o App Service → Authentication**:

1. **Add identity provider** → **Microsoft**.
2. **App registration**: *Create new app registration*.
3. **Supported account types**: **Current tenant - Single tenant**
   (isto é o que restringe a empresa).
4. **Restrict access**: **Require authentication**.
5. **Unauthenticated requests**: **HTTP 302 (redirect to log in)**.
6. Salve.

Pronto: qualquer visita sem login é mandada para a Microsoft; só contas do
tenant da empresa conseguem entrar. (O `ALLOWED_EMAIL_DOMAIN` é uma checagem
extra no backend.)

## Passo 5 — Pós-deploy

1. Acesse `https://<APP>.azurewebsites.net` — deve pedir login Microsoft e abrir
   o Painel.
2. Confirme que a conta **admin@exemplo.com.br** entrou como **Desenvolvedor** (vem do seed).
   Em **Administração**, ajuste papéis/setores das demais pessoas.
3. **Desligue o auto-seed** para não re-semear em restarts:
   ```bash
   az webapp config appsettings set -g $RG -n $APP --settings AUTO_SEED=false
   az webapp restart -g $RG -n $APP
   ```

## Persistência e escala

- O SQLite em `/home/data` é persistente e adequado para um **piloto com 1
  instância**. **Não escale para múltiplas instâncias** com SQLite.
- Para produção em escala, migre para **Azure Database for PostgreSQL**: o SQL é
  padrão; troque `better-sqlite3` por um driver `pg` em `server/src/db.js`.
- Faça backup periódico do arquivo `/home/data/controlaai.db`.

## Checklist de segurança

- [ ] `AUTH_MODE=entra` **e** Easy Auth com *Require authentication* ativos.
- [ ] Registro Entra **single-tenant** (só a empresa).
- [ ] `JWT_SECRET` aleatório definido (não usado no modo entra, mas evite o padrão).
- [ ] `AUTO_SEED=false` após o primeiro deploy.
- [ ] HTTPS apenas (App Service já força; confirme *HTTPS Only = On*).
- [ ] Backup do banco configurado.
