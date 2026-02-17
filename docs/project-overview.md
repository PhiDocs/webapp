# Project Overview

## O que é
Safety Docs AI é um projeto Next.js para gerar documentos de segurança do trabalho (APR/PT) com apoio de IA.

## Funcionalidades principais

- Geração de documentos APR e PT com formulário dinâmico
- Análise de riscos com IA (Genkit + Google Gemini)
- Recomendação de EPI/EPC
- Pré-visualização em tempo real
- Exportação para PDF no servidor
- Integração com n8n
- Integração de assinatura eletrônica (Assinafy)

## Estrutura de pastas

```text
src/
├── app/           # Rotas e páginas
├── components/    # UI
├── hooks/         # Hooks customizados
├── lib/           # Utilitários compartilhados
├── server/        # Lógica server-side
├── ai/            # Fluxos/prompts de IA
├── repositories/  # Acesso a dados (Firestore)
└── services/      # Integrações externas
```
