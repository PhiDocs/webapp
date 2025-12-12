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
    -   A geração do PDF (`pdf-actions.ts`).
    -   A integração com serviços externos como o n8n (`n8n-actions.ts`).
-   `src/ai/`: Contém a configuração e definição dos fluxos de Inteligência Artificial usando **Genkit**. É aqui que os prompts e os modelos de dados para a IA são definidos.

