# Safety Docs AI

Este é um projeto Next.js para gerar documentos de segurança do trabalho, como Análise Preliminar de Risco (APR) e Permissão de Trabalho (PT), com o auxílio de Inteligência Artificial.

## Funcionalidades Principais

-   **Geração de Documentos:** Crie documentos APR e PT preenchendo um formulário dinâmico.
-   **Análise com IA:** Utilize o poder da IA generativa (através do Genkit e Google Gemini) para criar uma análise de risco detalhada com base na descrição da atividade de trabalho, recomendando procedimentos, riscos e medidas preventivas.
-   **Recomendação de Equipamentos:** A IA também sugere os Equipamentos de Proteção Individual (EPI) e Coletiva (EPC) necessários para a atividade descrita.
-   **Pré-visualização em Tempo Real:** Veja como seu documento ficará enquanto você preenche o formulário.
-   **Exportação para PDF:** Baixe o documento final em formato PDF, gerado de forma consistente no lado do servidor.
-   **Integração com n8n:** Envie os dados do formulário e o PDF gerado para um webhook do n8n para automatizar fluxos de trabalho posteriores.

## Estrutura de Pastas

O projeto segue uma estrutura de pastas organizada para separar claramente as responsabilidades entre front-end, back-end e código compartilhado.

```
src/
├── app/           # Lógica de Roteamento e Páginas (Front-end)
├── components/    # Componentes React de UI (Front-end)
├── hooks/         # Hooks React customizados (Front-end)
├── lib/           # Código compartilhado e utilitários
├── server/        # Lógica exclusiva do Servidor (Back-end)
└── ai/            # Fluxos e prompts de IA (Back-end/Genkit)
```

-   `src/app/`: Contém as páginas e layouts da aplicação, seguindo a convenção do **Next.js App Router**. É aqui que a interface do usuário é renderizada.
-   `src/components/`: Abriga todos os componentes React.
    -   `ui/`: Componentes de UI genéricos e reutilizáveis (ex: `Button`, `Card`, `Input`), fornecidos pelo **ShadCN**.
    -   `icons/`: Ícones SVG personalizados como componentes React.
    -   Na raiz, ficam os componentes maiores que estruturam as páginas, como `Header.tsx`, `FormPanel.tsx` e `PreviewPanel.tsx`.
-   `src/hooks/`: Contém hooks React customizados para encapsular lógica reutilizável no lado do cliente (ex: `useToast`).
-   `src/lib/`: Funciona como uma "biblioteca" de código compartilhado, utilizada tanto pelo front-end quanto pelo back-end.
    -   `data/`: Dados estáticos da aplicação (ex: itens do checklist).
    -   `pdf/`: Lógica de geração de PDF, incluindo o gerador principal e os templates.
    -   `types.ts`: Definições de tipos e schemas de validação com Zod.
-   `src/server/`: Contém toda a lógica que é garantidamente executada no **lado do servidor**. Isso inclui:
    -   As *Server Actions* para chamar a IA (`ai-actions.ts`).
    -   As *Server Actions* de autenticação e administração (`auth-actions.ts`, `admin-actions.ts`).
    -   A integração com serviços externos como o n8n (`n8n-actions.ts`).
-   `src/ai/`: Contém a configuração e definição dos fluxos de Inteligência Artificial usando **Genkit**. É aqui que os prompts e os modelos de dados para a IA são definidos.

## Operações de Admin (Como Criar uma Nova Empresa)

Como o cadastro público foi removido, a criação de novas empresas e seus administradores é feita através de uma `server action` que deve ser executada pelo "super-admin" do sistema.

### Pré-requisitos

1.  **Conta de Serviço do Firebase:** Você precisa das credenciais de uma conta de serviço do Firebase para que o Admin SDK possa se autenticar.
    -   No [Console do Firebase](https://console.firebase.google.com/), vá para "Configurações do Projeto" > "Contas de serviço".
    -   Gere uma nova chave privada. Isso fará o download de um arquivo JSON.
2.  **Variáveis de Ambiente:** Preencha o arquivo `.env` na raiz do projeto com as informações do JSON baixado:
    ```env
    FIREBASE_PROJECT_ID="seu-project-id"
    FIREBASE_CLIENT_EMAIL="firebase-adminsdk-xxxxx@seu-project-id.iam.gserviceaccount.com"
    FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...sua chave privada aqui...\n-----END PRIVATE KEY-----\n"
    ```
    -   **Importante:** A `private_key` no arquivo JSON contém quebras de linha (`\n`). Ao copiá-la para o `.env`, você deve substituí-las literalmente pelo texto `\n`, como no exemplo acima.

### Executando a Ação

A maneira mais fácil de executar a ação `registerCompany` é através de um script.

1.  **Crie um arquivo de script**, por exemplo, `scripts/create-company.js` na raiz do projeto (fora de `src/`).

2.  **Adicione o seguinte conteúdo ao script:**

    ```javascript
    // scripts/create-company.js
    require('dotenv').config({ path: './.env' });
    const { registerCompany } = require('../dist/server/admin-actions'); // Ajuste o caminho se necessário

    async function main() {
      if (process.argv.length < 5) {
        console.error('Uso: node scripts/create-company.js "Nome da Empresa" "email@admin.com" "Nome do Admin" "senhaForte"');
        process.exit(1);
      }

      const [,, companyName, adminEmail, adminName, adminPassword] = process.argv;

      console.log(`Registrando nova empresa: ${companyName}...`);

      const result = await registerCompany({
        companyName,
        adminEmail,
        adminName,
        adminPassword,
      });

      if (result.success) {
        console.log('Empresa e administrador criados com sucesso!');
        console.log('Detalhes:', result.data);
      } else {
        console.error('Falha ao registrar empresa:', result.error);
      }
    }

    // Como o Next.js compila para o diretório .next, precisamos de um truque
    // para rodar isso. Primeiro, construa o projeto.
    console.log("Este script deve ser executado APÓS rodar 'npm run build'.");
    console.log("No entanto, a função `registerCompany` está disponível no back-end para ser usada de outras formas se necessário.");
    
    // Para um teste real, você precisaria adaptar o ambiente para que o Next.js
    // permita a execução de um script que importa suas server actions.
    // A recomendação é integrar essa função a uma pequena UI de admin no futuro.
    
    // A chamada a main() está comentada para evitar erros de execução direta sem build.
    // main();
    ```

3.  **Uso (Teórico):** Para que o script funcione, o projeto precisa ser "compilado" (`npm run build`) para que as `server actions` estejam disponíveis como módulos JS no diretório `.next/server/app`. A forma mais robusta de usar essa função no futuro seria criar uma página de admin simples, protegida, que oferece um formulário para chamar `registerCompany`.
