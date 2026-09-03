# Mapeamento Factual — Fluxo APR e PT (Release Candidate)

**Data:** 03/09/2026  
**Escopo:** busca em `src/app/reports/page.tsx`, `src/components/safety-form.tsx`, `src/components/pt-form.tsx`, `src/components/form-panel.tsx`, `src/components/document-lifecycle.tsx`, `src/components/apr-review.tsx`, `src/components/pt-review.tsx`, `src/components/document-review.tsx`, `src/lib/document-status.ts`, `src/server/document-actions.ts`, `src/app/documents/page.tsx`, `src/server/pdf-generator.ts`, `src/server/signature-actions.ts`, `src/server/assinafy-actions.ts`, `src/components/signature-panel.tsx`, `supabase/migrations/20260902230000_limpa_eventos_de_autosave.sql`.

---

## 1. AUTOSAVE

| Item | O que o código faz | Arquivo:linha |
|---|---|---|
| **Quando dispara** | `useEffect` com dependências `[analysis, company?.id, currentDocumentId, equipment, form, hasUnsavedChanges, liveFormData]` — roda a cada mudança no form/analysis/equipment. | `reports/page.tsx:434-479` |
| **Debounce** | `setTimeout` de **2500 ms** (2,5 s). Limpa timer anterior a cada render. | `reports/page.tsx:446-447, 474` |
| **O que persiste** | `formData` (form.getValues()), `analysisData` (normalizado), `equipmentData` — tudo via `saveDocument({ ..., silencioso: true })`. | `reports/page.tsx:458-465` |
| **Servidor ou local** | **Servidor** — chama Server Action `saveDocument` que grava em `documents` no Supabase. | `document-actions.ts:32-152` |
| **Evita re-gravação idêntica** | Calcula `assinatura = JSON.stringify([valores, analysis, equipment])` e compara com `ultimoSalvoRef.current`. Se igual, **não chama o servidor**. | `reports/page.tsx:449-455` |
| **Falha silenciosa** | `catch` apenas faz `setAutoSaveState('idle')` — **não mostra toast, não notifica o usuário**. O botão "Salvar Rascunho" manual continua funcional. | `reports/page.tsx:473` |
| **Bug histórico (já corrigido)** | `form.watch()` devolvia objeto novo a cada render + `isDirty` nunca voltava a `false` → loop infinito de autosave a cada ~3,5 s. Gerou 378 eventos/hora e versão 721 num documento parado. | `supabase/migrations/20260902230000_limpa_eventos_de_autosave.sql:3-10` |
| **Correção aplicada** | 1) Assinatura de conteúdo (`ultimoSalvoRef`) para pular gravação se nada mudou. 2) Flag `silencioso: true` em `saveDocument` → não incrementa versão nem registra evento `updated` no banco. | `reports/page.tsx:432-433, 453-455`<br>`document-actions.ts:38, 48-49, 93-114` |

---

## 2. PERSISTÊNCIA (wizard, refresh, reabrir)

| Cenário | O que acontece | Arquivo:linha |
|---|---|---|
| **Reabrir documento existente** | `getDocument(documentId)` → `form.reset(cleanFormData)` + `form.setValue('analysisSteps', doc.analysisData.proceduralSteps)` + `setEquipment(doc.equipmentData)`. | `reports/page.tsx:640-671` |
| **`analysisSteps` (APR)** | Totalmente reconstruído a partir de `doc.analysisData.proceduralSteps` (listas `hazards`, `risks`, `consequences`, `measures`, `epis`, `epcs` + textos legados `potentialRisks`, `preventiveMeasures`). | `reports/page.tsx:653-655` |
| **`equipment` (EPI/EPC)** | Totalmente reconstruído a partir de `doc.equipmentData` (arrays `epiItems`, `epcItems`, notas). | `reports/page.tsx:656-658` |
| **Campos do form (`formData`)** | Todos os campos do schema (`responsiblePersons`, `teamMembers`, `pt.*`, etc.) vêm do `doc.formData` via `form.reset()`. | `reports/page.tsx:651-652` |
| **Edições manuais de risco/EPI/EPC** | São **persistidas**: `gravarLista` sincroniza listas + textos legados (`potentialRisks`, `preventiveMeasures`) a cada mudança. | `safety-form.tsx:477-498` |
| **Itens adicionados manualmente (análise)** | Persistidos no `formData.analysisSteps` via `appendAnalysisStep` / `gravarLista`. | `safety-form.tsx:1012-1014, 1046` |
| **Sugestões de IA (APR)** | **NÃO persistidas** — `analysisData` vem da IA no momento da geração; o que fica salvo é o resultado final editado pelo usuário nas listas. | `reports/page.tsx:682-703` |
| **Sugestões de IA (PT)** | Estado **local apenas** (`sugestoesIa`, `motivoIa`, `carregandoIa`, `erroIa` em `useState` no `PTForm`). Não vão para o banco. | `pt-form.tsx:330-333` |
| **Controles IA aceitos/removidos (PT)** | **Persistidos** em `pt.ptControlesAdicionados[]` com `{ itemId, origem: 'ia'|'regra'|'manual', em, removidoEm }`. | `pt-form.tsx:366-384` |
| **Estado de UI (edição, revisão, zoom, etc.)** | `editingAnalysisStep`, `editingSection`, `analiseRevisada`, `foiFinalizada`, `cadastrandoLocal`, `epiDraft`, `epcDraft`, `sugestoesIa`, `motivoIa` — **só em estado de componente, perdidos no refresh**. | `safety-form.tsx:237-248`<br>`pt-form.tsx:330-333` |
| **Refresh da página (F5)** | Reconstrói tudo a partir do documento salvo (mesmo fluxo de reabrir). Estado de UI local **é perdido**. | `reports/page.tsx:640-671` |

---

## 3. MÁQUINA DE ESTADOS

### Status definidos (`document-status.ts:7-15`)
```ts
DRAFT, IN_REVIEW, AWAITING_SIGNATURE, SIGNED, COMPLETED, DECLINED, CANCELLED
```
`'sent'` é legado → tratado como `AWAITING_SIGNATURE` pelo `resolverStatus`.

### Estados que bloqueiam edição de conteúdo (`document-status.ts:20-24`)
```ts
STATUS_BLOQUEADOS = [AWAITING_SIGNATURE, SIGNED, COMPLETED]
```
`podeEditarConteudo(status)` retorna `false` para esses três.

### Ações permitidas por status (`document-status.ts:131-139`)

| Status | Ações permitidas |
|---|---|
| `draft` | `editar`, `salvar`, `gerar_pdf`, `enviar_assinatura` |
| `in_review` | `editar`, `salvar`, `gerar_pdf`, `enviar_assinatura` |
| `awaiting_signature` | `gerar_pdf`, `acompanhar_assinatura`, `nova_versao` |
| `signed` | `gerar_pdf`, `acompanhar_assinatura`, `concluir`, `nova_versao` |
| `completed` | `gerar_pdf`, `acompanhar_assinatura`, `nova_versao` |
| `declined` | `gerar_pdf`, `acompanhar_assinatura`, `nova_versao` |
| `cancelled` | `gerar_pdf`, `nova_versao` |

### Bloqueio no servidor (`document-actions.ts:73-90`)
Ao tentar `saveDocument` em documento com status bloqueado:
- Registra evento `blocked_edit` na trilha.
- Retorna erro: `"Este documento já foi enviado para assinatura e não pode mais ser alterado."`

### Bloqueio na UI
- `DocumentLifecycle` (`document-lifecycle.tsx:117-143`) mostra "Ações permitidas" vs "Bloqueado" com texto do `motivoDoBloqueio`.
- `DocumentReview` (`document-review.tsx:188-197`) desabilita botão "Finalizar" se `temPendencia || !revisada || isFinalizando`.
- Após `SIGNED`/`COMPLETED`: botão "Finalizar" some, aparece "Enviar para assinatura" (se ainda não enviado) ou "Concluir documento" (se `SIGNED`). **Editar conteúdo não é oferecido**.

### Nova versão
Ação `nova_versao` permitida a partir de `AWAITING_SIGNATURE` em diante — **não implementada no frontend** (não há botão/fluxo visível nos componentes analisados).

---

## 4. PDF E ASSINATURA

### Geração de PDF (`pdf-generator.ts`, `reports/page.tsx:1016-1064`)
| Etapa | Detalhe | Arquivo:linha |
|---|---|---|
| **Trigger** | Botão "Gerar PDF" → `fetch('/api/generate-pdf', { method: 'POST', body: JSON.stringify({ formData, analysisData, equipmentData, company }) })` | `reports/page.tsx:1019-1028` |
| **Loading** | `isGeneratingPdf` → botão mostra `Loader2` + "Gerando PDF..." | `form-panel.tsx:225-229` |
| **Backend** | `generatePdfBuffer` → renderiza `PrintPreview` via `react-dom/server` → HTML → **duas rotas**: | `pdf-generator.ts:321-353` |
| | 1. Se `PDF_FUNCTION_URL` definida → chama Cloud Function externa (`generatePdfViaCloudFunction`) | `pdf-generator.ts:185-210, 349-351` |
| | 2. Senão → `generatePdfLocally` com Puppeteer (local: puppeteer completo; serverless: `@sparticuz/chromium` + `puppeteer-core`) | `pdf-generator.ts:213-319` |
| **Erro/Timeout** | `catch` genérico → toast "Erro ao gerar PDF" + mensagem da resposta. **Sem timeout explícito** no fetch do cliente. | `reports/page.tsx:1030-1036, 1055-1060` |
| **Registro** | `logPdfGenerated(documentId)` grava evento `pdf_generated` (não muda status). | `document-actions.ts:328-346` |

### Envio para Assinatura (`signature-actions.ts:74-158`, `assinafy-actions.ts`)
| Etapa | Detalhe | Arquivo:linha |
|---|---|---|
| **Trigger** | Botão "Enviar para assinatura" → `sendDocumentForSignature` | `reports/page.tsx:968-1014` |
| **Loading** | `isSendingSignature` → botão mostra `Loader2` + "Enviando..." | `form-panel.tsx:245-249` |
| **1. Salva rascunho** | Chama `saveDocument` (não silencioso) antes de enviar. | `reports/page.tsx:973-983` |
| **2. Gera PDF** | `generatePdfBuffer` (mesmo fluxo acima). | `signature-actions.ts:100` |
| **3. Upload Assinafy** | `uploadDocumentToAssinafy(pdfBlob, name)` → `fetch` multipart para `/accounts/{WORKSPACE_ID}/documents` | `assinafy-actions.ts:94-134` |
| **4. Aguarda processamento** | `waitForDocumentReady(assinafyDocumentId)` — **timeout 60 s**, intervalo 2 s. Se expira: lança erro "Timeout aguardando processamento". | `assinafy-actions.ts:349-367` |
| **5. Cria/obtém signatários** | `createOrGetSigner` por e-mail (com formatação telefone internacional). Se 400 "já existe", busca por e-mail. | `assinafy-actions.ts:137-196` |
| **6. Cria assignment** | `createAssignment` — **até 10 tentativas**; se `metadata_processing`, espera com `waitForDocumentReady` (timeout 120 s, intervalo 3 s). | `assinafy-actions.ts:234-288` |
| **7. Salva vínculo** | Cria `SignatureDocument` no Supabase com `assinafyDocumentId`, `assinafyAssignmentId`, `signingUrls`, signatários. | `signature-actions.ts:137-152` |
| **8. Atualiza doc principal** | `markDocumentAsSent` → status `AWAITING_SIGNATURE`, `lockedAt = now`, `signatureDocumentId`. | `document-actions.ts:154-185` |
| **Erro em qualquer etapa** | `try/catch` → `ErrorLogRepository.log` → retorna `{ success: false, error: message }` → toast na tela. | `signature-actions.ts:153-157` |
| **Refresh manual** | `refreshSignatureDocument` faz `getDocumentStatus` na Assinafy, atualiza signatários e status do doc local. Botão "Atualizar" no `SignaturePanel`. | `signature-actions.ts:198-294`<br>`signature-panel.tsx:100-116` |
| **Reenviar lembrete** | `resendAssignmentNotification(assignmentId)` → POST `/assignments/{id}/resend`. | `assinafy-actions.ts:399-422` |
| **Tela durante espera** | **Apenas spinner no botão** — sem barra de progresso, sem estimativa de tempo, sem cancelamento. Se Assinafy demorar (>60 s upload + >120 s assignment), a tela **parece travada**. | `form-panel.tsx:245-249` |

---

## 5. MOBILE (largura ≤ 390 px)

| Componente | Problema | Arquivo:linha |
|---|---|---|
| **Tabela Participantes (PT Review)** | `min-w-[420px]` — **não cabe em 390 px**; exige scroll horizontal dentro do card. | `pt-review.tsx:150` |
| **Tabela Participantes (APR Review)** | `min-w-[380px]` — **limite exato**; sem margem para padding/scrollbar. | `apr-review.tsx:134` |
| **Barra de ações fixa (footer)** | Antes usava `min-w-[184px]` / `min-w-[210px]` nos botões + `flex-nowrap` → forçava 841 px mínimos, estourando o scrollport em tablet (768 px). **Corrigido**: `min-w-0 flex-1 whitespace-nowrap` + `flex-wrap` no container. | `form-panel.tsx:165-259` (comentários 166-169, 191-194) |
| **Preview lateral fixa** | Só renderiza em `xl:` (≥ 1280 px). Em mobile abre via botão "Prévia" → `Sheet`/`Dialog` full-screen. | `reports/page.tsx:1212-1216`<br>`document-preview-panel.tsx:126`<br>`floating-preview.tsx:49` |
| **Dialogs de edição** | `max-w-3xl` (≈ 768 px) — em mobile ocupam `max-w-[90vw]` via `DialogContent` do Radix, **cabe**. | `safety-form.tsx:127`<br>`signature-panel.tsx:274` |
| **PersonPicker** | Input de busca `w-[150px]` fixo — **pode cortar** em telas muito estreitas. | `person-picker.tsx:300` |
| **CompanyStep** | Descrições com `max-w-[56ch]` / `max-w-[60ch]` — **quebra em mobile** (ch depende da fonte). | `company-step.tsx:62, 82` |
| **DocumentPreviewPanel** | Painel fixo à direita (`fixed right-0 top-16`) — **só em `xl:`**. Em mobile usa `Dialog` full-screen (`max-w-[96vw]`). | `document-preview-panel.tsx:126, 194` |
| **FloatingPreview** | Igual ao acima — só em `xl:`, width 360 px quando aberto. | `floating-preview.tsx:49-51` |
| **Scroll horizontal em tabelas admin** | Várias tabelas admin usam `min-w-[620px]` a `min-w-[1540px]` — **fora do escopo APR/PT**, mas presentes no repo. | `admin/*-table.tsx` |
| **Overflow-x hidden no preview mobile** | `floating-preview.tsx:115` — `overflow-x-hidden` no container do preview mobile; se o PDF escalado passar da largura, **corta conteúdo sem scroll**. | `floating-preview.tsx:115` |

---

## Observações transversais

- **Autosave** já corrigido para não gerar loop, mas **falha silenciosamente** (sem feedback ao usuário).
- **Persistência** é fiel para dados do form e análise editada; **estado de UI e sugestões de IA (PT) são perdidos** no refresh.
- **Máquina de estados** bem definida no backend e refletida na UI; **edição bloqueada após `AWAITING_SIGNATURE`** (inclui `SIGNED` e `COMPLETED`).
- **Fluxo Assinafy** tem timeouts longos (60 s + 120 s) e **nenhuma indicação de progresso** ao usuário — risco de abandono achando que travou.
- **Mobile**: tabelas de revisão (PT 420 px, APR 380 px) exigem scroll horizontal; footer corrigido; preview lateral só em desktop; dialogs usam `max-w-[90vw]`/`96vw` e funcionam.