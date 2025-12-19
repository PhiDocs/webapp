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

A verificação é feita no `middleware.ts`, que lê os claims do cookie de sessão em cada requisição e aplica os redirecionamentos necessários.

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

## Scripts de Manutenção

### Atualizar Regras e Índices do Firestore

Este projeto está configurado para facilitar o deploy das regras de segurança e dos índices do Firestore.

-   **Como funciona:** Você edita os arquivos `firestore.rules` e `firestore.indexes.json` na raiz do projeto. Para que as alterações tenham efeito no seu projeto Firebase, você precisa executar um comando.
-   **O que você precisa fazer:** Após editar os arquivos, execute o seguinte comando no seu terminal:
    ```bash
    npm run update-firestore
    ```
    O comando `update-firestore` (definido no `package.json`) usará o Firebase CLI para aplicar as novas regras e criar os novos índices. O processo de criação de índices pode levar alguns minutos para ser concluído.

### Migrar Dados para Exclusão Lógica (Soft Delete)

Se você precisa garantir que todos os registros antigos sejam compatíveis com o novo sistema de exclusão lógica (campo `deletedAt`), execute o script de migração.

1.  **Pré-requisitos:**
    -   Certifique-se de que seu arquivo `.env` está preenchido.
    -   Instale a ferramenta `tsx` globalmente para rodar o script TypeScript: `npm install -g tsx`
2.  **Uso:**
    ```bash
    tsx scripts/migrate-deleted-at.ts
    ```
    Este script irá percorrer as coleções `works`, `employees`, `jobRoles` e `subcontractors`, adicionando o campo `deletedAt: null` a todos os documentos que ainda não o possuem.

## Variáveis de Ambiente

Preencha o arquivo `.env` na raiz do projeto com as informações da sua conta de serviço do Firebase.

1.  **Conta de Serviço do Firebase:**
    -   No [Console do Firebase](https://console.firebase.google.com/), vá para "Configurações do Projeto" > "Contas de serviço".
    -   Gere uma nova chave privada e baixe o arquivo JSON.
2.  **Arquivo `.env`:**
    ```env
    # Credenciais do Firebase Admin SDK (do arquivo JSON)
    FIREBASE_PROJECT_ID="seu-project-id"
    FIREBASE_CLIENT_EMAIL="firebase-adminsdk-xxxxx@seu-project-id.iam.gserviceaccount.com"
    FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...sua chave privada aqui...\n-----END PRIVATE KEY-----\n"

    # URL do Webhook de Produção do n8n (opcional)
    N8N_PRODUCTION_URL="https://seu.n8n.url/webhook/production"

    # Modelo de IA do Gemini (opcional, usa o padrão se não for definido)
    GENAI_MODEL="googleai/gemini-2.5-flash"
    ```
    -   **Importante:** A `private_key` no arquivo JSON contém quebras de linha (`\n`). Ao copiá-la para o `.env`, você deve substituí-las literalmente pelo texto `\n`.

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
