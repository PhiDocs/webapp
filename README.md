# Safety Docs AI

Este é um projeto Next.js para gerar documentos de segurança do trabalho, como Análise Preliminar de Risco (APR) e Permissão de Trabalho (PT), com o auxílio de Inteligência Artificial.

## Funcionalidades Principais

-   **Geração de Documentos:** Crie documentos APR e PT preenchendo um formulário dinâmico.
-   **Análise com IA:** Utilize o poder da IA generativa (através do Genkit e Google Gemini) para criar uma análise de risco detalhada com base na descrição da atividade de trabalho, recomendando procedimentos, riscos e medidas preventivas.
-   **Recomendação de Equipamentos:** A IA também sugere os Equipamentos de Proteção Individual (EPI) e Coletiva (EPC) necessários para a atividade descrita.
-   **Pré-visualização em Tempo Real:** Veja como seu documento ficará enquanto você preenche o formulário.
-   **Exportação para PDF:** Baixe o documento final em formato PDF, gerado de forma consistente no lado do servidor.
-   **Integração com n8n:** Envie os dados do formulário e o PDF gerado para um webhook do n8n para automatizar fluxos de trabalho posteriores.

## Como as Permissões Funcionam (Admin vs. Usuário)

O sistema usa **Firebase Custom Claims** para diferenciar os papéis dos usuários. Um *custom claim* é um metadado seguro anexado ao token de um usuário que só pode ser definido pelo servidor.

-   **Admin:** Um usuário com as claims `{ role: 'admin', companyId: '...' }`. Apenas administradores podem acessar a rota `/company/[companyId]` para gerenciar sua empresa.
-   **Usuário:** Um usuário sem a claim de `admin`. Eles são redirecionados para a página principal (`/`) para gerar documentos.

A verificação roda no middleware (`middleware.ts` → `src/proxy.ts`), que lê os claims do cookie de sessão em cada requisição e aplica os redirecionamentos necessários. As server actions validam novamente o cookie e conferem `role/companyId` antes de acessar dados ou integrações.

### Integrações protegidas (Assinafy / n8n)

-   Todas as chamadas às integrações passam por `requireAuth` no servidor e exigem `companyId` no token.
-   Assinafy possui allowlists opcionais:
    -   `ASSINAFY_ALLOWED_EMAILS` para e-mails específicos (lista separada por vírgula).
    -   `ASSINAFY_ALLOWED_EMAIL_DOMAINS` para domínios autorizados.
-   `ASSINAFY_ALLOWED_PHONE_PREFIXES` para prefixos de telefone/WhatsApp (ex.: `+55`).
-   Se nenhuma allowlist for configurada, qualquer e-mail/telefone passa apenas em ambiente de dev; configure para produção.

### Middleware e guard na prática
- Middleware (`middleware.ts`) reexporta `proxy` (`src/proxy.ts`) e bloqueia tudo exceto rotas públicas/estáticas. Cookies inválidos são limpos e usuários são redirecionados por role/companyId.
- Server actions devem sempre começar com `requireAuth`:
  ```ts
  import { requireAuth } from '@/server/auth-guard';
  // exige admin
  const auth = await requireAuth({ role: 'admin' });
  // exige empresa específica
  await requireAuth({ matchCompanyId: companyId, requireCompany: true });
  ```
- API de PDF (`src/app/api/generate-pdf/route.tsx`) valida sessão e limita payload a 1 MB; em produção usa `PDF_FUNCTION_URL` + `PDF_FUNCTION_SECRET`.

**Testes rápidos**  
- Login com usuário comum deve redirecionar para `/reports`; admin com companyId deve cair em `/company/[companyId]`.  
- Acessar `/login` já autenticado redireciona para o dashboard correspondente.  
- Gerar PDF: payload até 1 MB deve baixar; payload maior retorna 413.  
- Enviar para Assinafy: e-mail/telefone permitido funciona; e-mail/domínio/prefixo fora da allowlist retorna erro imediato sem chamar API.  
- Botão de teste da integração n8n nas configurações da empresa deve exigir sessão e `companyId` válido.

## Deploy App Hosting

- Configure `BACKEND_ID` no `.env` (veja em `firebase apphosting:backends:list --json` → `name` → sufixo após `/backends/`).
- Configure `PROJECT_ID` no `.env` (ou use `FIREBASE_PROJECT_ID`; os scripts aceitam os dois).
- Deploy usando versão automática (tag + hash atual):  
  `npm run deploy:apphosting`
- Release criando tag antes de publicar:  
  `npm run release:apphosting`  
  Sem `TAG`, o script pega a última tag `vX.Y.Z` e faz bump automático de `patch`.
- Atalhos de bump automático:  
  `npm run release:apphosting`  
  `npm run release:apphosting:minor`  
  `npm run release:apphosting:major`
- Para forçar uma tag específica:  
  `TAG=v1.2.3 npm run release:apphosting`  
  O script cria e faz push da tag, define `NEXT_PUBLIC_APP_VERSION` como `TAG-hash` e abre rollout no backend.

## Infisical (time)

### Criar conta e projeto

1. Acesse `https://app.infisical.com` e crie sua conta (e-mail/senha ou SSO).
2. Crie ou entre na organização do time.
3. Crie o projeto (ex.: `studio`) com ambientes `dev`, `staging` e `prod`.
4. Em `Members/Access`, convide o time e configure permissões por ambiente/path.

### Instalar CLI

- macOS (Homebrew):
  ```bash
  brew install infisical/get-cli/infisical
  ```
- Windows (PowerShell + Winget):
  ```powershell
  winget install Infisical.Infisical
  ```
- Windows (Chocolatey):
  ```powershell
  choco install infisical
  ```
- WSL (Ubuntu/Debian):
  ```bash
  curl -1sLf 'https://artifacts-cli.infisical.com/setup.deb.sh' | sudo -E bash
  sudo apt-get update && sudo apt-get install -y infisical
  ```

### Login e geração do .env

1. Faça login no CLI:
   ```bash
   infisical login
   ```
2. Gere o `.env` para o ambiente desejado:
   ```bash
   npm run env:pull
   npm run env:pull:staging
   npm run env:pull:prod
   ```
3. Opcional: usar comando genérico:
   ```bash
   INFISICAL_ENV=dev INFISICAL_PROJECT_ID=<projectId> INFISICAL_SECRET_PATH=/ npm run env:pull
   ```

> O arquivo `.env` não deve ser commitado no repositório.

### Sincronizar Infisical -> Google Secret Manager (App Hosting)

Pré-requisitos:
- `infisical login` feito com uma conta que tenha acesso ao projeto/ambiente.
- `gcloud auth login` e `gcloud auth application-default login` configurados.
- Permissão para criar/atualizar secrets no projeto GCP.

Comandos:
```bash
npm run secrets:sync:dev
npm run secrets:sync:staging
INFISICAL_ENV=prod npm run secrets:sync
```

Esse script:
- Exporta secrets do Infisical (`INFISICAL_ENV`, `INFISICAL_SECRET_PATH`, `INFISICAL_PROJECT_ID`).
- Lê a lista de secrets usada no `apphosting.yaml` (`secret:`).
- Cria o secret no Google Secret Manager se não existir.
- Publica uma nova versão para cada secret.

Comando genérico:
```bash
INFISICAL_ENV=prod INFISICAL_SECRET_PATH=/ INFISICAL_PROJECT_ID=<projectId> npm run secrets:sync
```

Opcional: sincronizar apenas alguns secrets:
```bash
SYNC_KEYS=FIREBASE_PRIVATE_KEY,ASSINAFY_API_KEY INFISICAL_ENV=prod npm run secrets:sync
```

## Como se Tornar um Admin

Como o cadastro público foi removido, a criação e promoção de administradores é uma operação de servidor. Existem duas maneiras de fazer isso:

### Método 1: Criar uma Nova Empresa e seu Admin (Recomendado)

Use o script `scripts/create-company.js` para registrar uma nova empresa e seu primeiro administrador de uma só vez.

1.  **Pré-requisitos:** Certifique-se de que seu arquivo `.env` está preenchido com as credenciais do Firebase Admin, conforme descrito na seção "Variáveis de Ambiente".
2.  **Uso:**
    ```bash
    node scripts/create-company.js "Nome da Nova Empresa" "email.do.novo.admin@example.com" "Nome do Admin" "senhaForte123"
    ```
    Este script chamará a server action `registerCompany`, que cria o usuário, a empresa, e define o *custom claim* `{ role: 'admin', companyId: '...' }` para o novo usuário.

### Método 2: Promover um Usuário Existente para Admin

Se você já tem um usuário criado e deseja torná-lo um administrador de uma empresa.

1.  **Pré-requisitos:** Certifique-se de que seu arquivo `.env` está preenchido.
2.  **Encontre o ID da Empresa:** No console do Firebase, vá para a coleção `companies` e copie o ID do documento da empresa à qual você quer associar o admin.
3.  **Uso:**
    ```bash
    node scripts/set-admin.js "email.do.usuario.existente@example.com" "ID_DA_EMPRESA_COPIADO_DO_FIRESTORE"
    ```
    Este script encontrará o usuário pelo e-mail e definirá (ou atualizará) suas *custom claims* para `{ role: 'admin', companyId: '...' }`.

> **Importante:** Após executar qualquer um desses scripts e alterar os papéis, o usuário precisa **fazer logout e login novamente** para que seu token de sessão seja atualizado com os novos *custom claims*.  
> **Segurança:** as server actions agora exigem sessão e checam o `companyId`/`role` do usuário. Para rodar o script `registerCompany` sem sessão, defina `ALLOW_REGISTER_COMPANY_SCRIPT=true` no `.env` (não usar em produção).

## Rodando Localmente: Configurando a Autenticação

Para rodar o projeto completo na sua máquina local, você precisa configurar a autenticação para o **Firebase Admin** (usado para gerenciar usuários e dados) e para a **IA do Google** (Genkit/Gemini).

### 1. Obtendo as Credenciais do Firebase Admin

Para que as `server actions` e scripts do back-end possam gerenciar usuários e dados, eles precisam se autenticar com permissões de administrador. Isso é feito através de uma "conta de serviço" do Firebase.

Siga os passos abaixo para gerar o arquivo de credenciais necessário para preencher o seu `.env`:

1.  **Acesse o Firebase Console:** Vá para [https://console.firebase.google.com/](https://console.firebase.google.com/) e selecione o seu projeto.
2.  **Configurações do Projeto:** No canto superior esquerdo, clique no ícone de engrenagem ao lado de "Visão geral do projeto" e selecione **"Configurações do projeto"**.
3.  **Contas de Serviço:** Na página de configurações, clique na aba **"Contas de serviço"**.
4.  **Gere a Chave Privada:** Clique no botão **"Gerar nova chave privada"**. Uma janela de confirmação aparecerá.
5.  **Confirme e Baixe:** Clique em **"Gerar chave"**. Um arquivo JSON será baixado para o seu computador. Este arquivo contém suas credenciais de administrador; trate-o com segurança e não o compartilhe publicamente.
6.  **Preencha o `.env`:** Abra o arquivo JSON que você baixou. Você encontrará os seguintes campos:
    *   `project_id`: Copie este valor para a variável `FIREBASE_PROJECT_ID` no seu arquivo `.env`.
    *   `client_email`: Copie este valor para a variável `FIREBASE_CLIENT_EMAIL`.
    *   `private_key`: Copie todo o conteúdo, incluindo `-----BEGIN PRIVATE KEY-----` e `-----END PRIVATE KEY-----`, para a variável `FIREBASE_PRIVATE_KEY`.

> **Importante:** A `private_key` no arquivo JSON contém quebras de linha (`\n`). Ao copiá-la para o `.env`, você deve garantir que elas sejam preservadas como o texto literal `\n`. O valor final no `.env` deve ser uma única linha longa entre aspas. Veja o exemplo na seção "Variáveis de Ambiente".

### 2. Autenticação para a IA (Genkit/Gemini)

Você tem duas opções para autenticar as chamadas de IA na sua máquina local.

#### Método 1: Login com `gcloud` (Recomendado)

Este método usa as "Credenciais Padrão da Aplicação" (ADC), que é a forma mais segura e recomendada pelo Google.

1.  **Instale o Google Cloud CLI:** Se você ainda não tem, [instale a ferramenta de linha de comando do Google Cloud](https://cloud.google.com/sdk/docs/install).

2.  **Faça o Login:** Execute o seguinte comando no seu terminal:
    ```bash
    gcloud auth application-default login
    ```

3.  **Siga as Instruções:** Seu navegador será aberto para que você faça login com sua conta do Google. Após a autorização, um arquivo de credenciais será criado na sua máquina.

4.  **Pronto!** O Genkit encontrará e usará essas credenciais automaticamente. Você **não** precisa de uma `GEMINI_API_KEY` no seu `.env` ao usar este método.

#### Método 2: Usar uma Chave de API

Este método é mais simples, mas um pouco menos seguro, pois a chave fica no seu arquivo `.env`.

1.  **Acesse o Google AI Studio:** Vá para [https://aistudio.google.com/](https://aistudio.google.com/).
2.  **Obtenha a Chave:** No menu à esquerda, clique em **"Get API key"** e siga as instruções para criar e copiar sua chave.
3.  **Configure o `.env`:** Abra seu arquivo `.env` e cole a chave que você copiou:
    ```env
    GEMINI_API_KEY="SUA_CHAVE_COPIADA_AQUI"
    ```
4.  **Pronto!** O Genkit detectará e usará essa chave automaticamente.

## Variáveis de Ambiente

Preencha o arquivo `.env` na raiz do projeto.

```env
# Credenciais do Firebase Admin SDK (do arquivo JSON da conta de serviço)
FIREBASE_PROJECT_ID="seu-project-id"
FIREBASE_CLIENT_EMAIL="firebase-adminsdk-xxxxx@seu-project-id.iam.gserviceaccount.com"
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...sua chave privada aqui...\n-----END PRIVATE KEY-----\n"

# Chave da API do Gemini (OPCIONAL, use se não for autenticar via gcloud)
# Obtenha em https://aistudio.google.com/
GEMINI_API_KEY=""

# URL do Webhook de Produção do n8n (opcional)
N8N_PRODUCTION_URL="https://seu.n8n.url/webhook/production"

# Modelo de IA do Gemini (opcional, usa o padrão se não for definido)
GENAI_MODEL="googleai/gemini-2.5-flash"
```
-   **Importante:** A `private_key` no arquivo JSON do Firebase contém quebras de linha (`\n`). Ao copiá-la para o `.env`, você deve substituí-las literalmente pelo texto `\n`.

## Estrutura de Pastas

```
src/
├── app/           # Lógica de Roteamento e Páginas (Front-end)
├── components/    # Componentes React de UI (Front-end)
├── hooks/         # Hooks React customizados (Front-end)
├── lib/           # Código compartilhado e utilitários
├── server/        # Lógica exclusiva do Servidor (Back-end)
├── ai/            # Fluxos e prompts de IA (Back-end/Genkit)
└── repositories/  # Camada de acesso a dados (Firestore)
└── services/      # Camada de comunicação com APIs externas
```

## Scripts de Manutenção

### Atualizar Regras e Índices do Firestore

Este projeto está configurado para facilitar o deploy das regras de segurança e dos índices do Firestore.

-   **Como funciona:** Você edita os arquivos `firestore.rules` e `firestore.indexes.json` na raiz do projeto. Para que as alterações tenham efeito no seu projeto Firebase, você precisa executar um comando.
-   **O que você precisa fazer:** Após editar os arquivos, execute o seguinte comando no seu terminal:
    ```bash
    npm run update-firestore
    ```
    O comando `update-firestore` (definido no `package.json`) usará o Firebase CLI para aplicar as novas regras e criar os novos índices. O processo de criação de índices pode levar alguns minutos para ser concluído.

### Migrar Dados para Compatibilidade (Soft Delete e Campos Adicionais)

Se você precisa garantir que todos os registros antigos sejam compatíveis com novas estruturas de dados (como o campo `deletedAt` para exclusão lógica ou novos campos obrigatórios), execute o script de migração.

1.  **Pré-requisitos:**
    -   Certifique-se de que seu arquivo `.env` está preenchido.
    -   Instale as dependências do projeto (`npm install`), o `tsx` já está configurado em `devDependencies`.
2.  **Uso:**
    ```bash
    npm run migrate-deleted-at
    ```
    Este script irá percorrer as coleções (`users`, `companies`, `works`, etc.) e garantir que todos os documentos tenham o campo `deletedAt: null` se ele não existir. Adicionalmente, para a coleção `works`, ele também adicionará o campo `activityDescription: ''` se estiver ausente, para manter a compatibilidade com a estrutura de dados atual.
