# Diagnóstico do módulo APR/PT

Levantamento do estado atual antes do redesenho. Nenhuma linha de código foi
alterada para produzir este documento — é leitura de código, do schema do banco
e do comportamento em execução.

| | |
|---|---|
| Telas do módulo | 3 + 1 morta |
| Tabelas envolvidas | 9 |
| Achados graves | 6 |
| Base analisada | Supabase `SafeDoc` (`dwokffoauvsgkjrdtbpg`) |

---

## 1. Estrutura do módulo

### Páginas e rotas

| Rota | Arquivo | Papel |
|---|---|---|
| `/reports` | `app/reports/page.tsx` | Cria e edita APR **e** PT. Tela central, 1.180 linhas. |
| `/documents` | `app/documents/page.tsx` | Lista rascunhos e documentos em assinatura, com filtros e busca. |
| `/signatures` | `app/signatures/page.tsx` | **Rota morta.** 12 linhas que só redirecionam para `/documents`. |
| `/company/[companyId]` | `app/company/.../page.tsx` | Cadastros da empresa. Alimenta o módulo, não faz parte dele. |
| `/api/generate-pdf` | `api/generate-pdf/route.tsx` | POST que devolve o PDF como download. |
| `/api/assinafy/download/[id]` | `api/assinafy/download/...` | Baixa o PDF assinado de volta da Assinafy. |

### Componentes principais

| Componente | Linhas | Responsabilidade |
|---|---|---|
| `form-panel.tsx` | ~200 | Casca: alterna APR/PT e sustenta a barra fixa de ações. |
| `safety-form.tsx` | ~760 | Fluxo da APR em 4 etapas guiadas. |
| `pt-form.tsx` | 392 | Fluxo da PT. **Formulário único, sem etapas.** |
| `person-picker.tsx` | ~430 | Escolha de pessoas. Usado **só pela APR**. |
| `print-preview.tsx` | ~720 | Desenha o documento. APR nele mesmo, PT delega ao `pt-preview`. |
| `document-preview-panel.tsx` | 213 | Moldura do painel lateral: zoom, redimensionar, minimizar. |
| `signature-pad.tsx` | — | Assinatura desenhada com o dedo. Vira imagem base64. |

### Modais e painéis

- **Gestor de projeto/obra** — `AprManagerModal`, dois modos: `'projects'` e `'works'`.
  É o *único* lugar onde se cria uma obra.
- **Alterações não salvas** — `AlertDialog` ao sair ou começar novo relatório.
- **Menu lateral no celular** — gaveta com fundo escurecido.
- **Pré-visualização no celular** — folha inferior com o A4 reduzido e zoom.

---

## 2. Fluxo atual do usuário

### Criar uma APR

1. Entra em `/reports` — cai direto no formulário, já com a aba APR ativa.
2. Seleciona o projeto — botão na faixa superior abre o modal. Se não existir nenhum, cria ali.
3. **Etapa 1 — Contexto.** Escolhe a obra num select, que preenche nome, endereço e datas.
   Pode editar tudo à mão pelo lápis.
4. **Etapa 2 — Atividade e riscos.** Descreve a atividade em texto livre e clica em Gerar
   Análise. A IA devolve etapas, riscos, medidas, EPI e EPC.
5. Confere e ajusta — cada etapa vira um cartão de leitura; o lápis abre aquela para edição.
6. **Etapa 3 — Equipe e responsáveis.** Escolhe pessoas do cadastro, de responsáveis salvos,
   ou cadastra na hora.
7. **Etapa 4 — Revisão e emissão.** Salvar rascunho, gerar PDF ou enviar para assinatura.

### Criar uma PT

1. Na mesma tela, troca a aba para PT — o formulário inteiro é substituído.
2. Preenche um formulário único, rolando: local, equipamento, data, hora início/fim,
   descrição da tarefa, checklist.
3. Digita colaboradores à mão: nome, RG/CPF, função, empresa, apto — campo por campo,
   **sem acesso ao cadastro de funcionários**.
4. Liga seções opcionais: espaço confinado (oxigênio, LE, H₂S, CO₂), vigias, resgatistas.
5. Preenche os três signatários: gestor da área, responsável pela atividade, SESMT.
6. Mesma barra de ações da APR: rascunho, PDF ou assinatura.

> **A diferença entre os dois fluxos é o achado mais visível deste diagnóstico.**
> A APR ganhou etapas guiadas, seleção de pessoas com busca, geração por IA e conferência.
> A PT continua sendo um formulário longo de rolagem com campos de texto puro.
> São a mesma tela, o mesmo botão de salvar e o mesmo destino — com duas experiências
> completamente diferentes.

### Enviar para assinatura

1. Clica em Enviar para Assinatura — o servidor monta os signatários a partir do formulário.
2. O PDF é gerado na hora: React → HTML → Puppeteer. Não fica salvo em lugar nenhum.
3. Sobe para a Assinafy — e o servidor **fica esperando** o processamento, consultando
   de 2 em 2 segundos, até 60s.
4. Cria os signatários e a atribuição. Cada um recebe um link próprio.
5. Grava em `signatureDocuments` e marca o documento como `sent`.
6. Cada pessoa assina por e-mail, fora do sistema.
7. O status volta por sincronização manual (`refreshSignatureDocument`). **Não há webhook.**

### Visualizar, editar, finalizar

- **Visualizar preenchendo:** painel lateral no desktop, folha com zoom no celular.
  É o documento real, não uma aproximação.
- **Visualizar depois:** em `/documents`, abre `/reports?documentId=...` e o rascunho é
  recarregado no formulário.
- **Editar:** não existe modo de edição separado — reabrir o rascunho *é* editar.
- **Finalizar:** não existe. O documento vai de `draft` para `sent` e para por aí.

---

## 3. Entidades e relacionamentos

Nove tabelas participam do módulo. Todas usam `text` como chave e como data — não há
`uuid` nem `timestamptz` nesta parte do schema.

| Tabela | Campos que importam | Liga-se a |
|---|---|---|
| `companies` | id, name, logo, ownerUid | raiz de tudo |
| `users` | uid, email, role (admin/user), companyId | → companies |
| `projetos_apr_pt` | nome_projeto, cliente_principal, CNPJ, endereço completo, status | → companies |
| `works` | name, address, workLocationDetails, startDate, endDate, + endereço completo | → companies, → projetos_apr_pt |
| `employees` | firstName, lastName, email, cpf, phone, roleId, roleName, subcontractorName | → companies, → projetos_apr_pt |
| `jobRoles` | name, responsibilities, requiredCertificates | → companies |
| `subcontractors` | name, cnpj, contractNumber | → companies |
| `responsible_contacts` | name, role, organization, email, phone, signsByDefault, isActive | → companies |
| `documents` | documentType, documentName, status, **formData**, analysisData, equipmentData, signatureDocumentId | → companies, → projetos_apr_pt |
| `signatureDocuments` | assinafyDocumentId, assinafyAssignmentId, status, signers, signerEmails, lastSyncedAt | → companies |

### 🔴 GRAVE — Não existem tabelas de atividade, risco, medida, responsável ou assinatura

Tudo isso mora dentro de `documents.formData`, um `jsonb` único.

Consequência prática: não dá para responder "quais APRs têm risco de trabalho em altura?",
não dá para reaproveitar uma análise anterior, não há relatório nem indicador possível sem
varrer JSON. É a decisão de modelagem que mais limita o produto hoje.

### 🔴 GRAVE — Só existem dois status: `draft` e `sent`

É uma restrição `CHECK` no banco. Não existe *assinado*, *recusado*, *cancelado* nem
*vencido*. A tela de documentos precisa cruzar em memória com `signatureDocuments` para
inventar o status que mostra na lista.

### 🔴 GRAVE — RLS ligada, mas sem efeito real

Todas as tabelas têm *row level security* habilitada, mas a aplicação acessa o banco pelo
cliente *service role*, que ignora RLS. Toda a separação entre empresas depende
exclusivamente das checagens de `requireAuth` no código das server actions. Um único
caminho que esqueça essa checagem expõe dados de outra empresa — e o banco não seguraria.

### 🟡 MÉDIO — `documents.signatureDocumentId` não tem chave estrangeira

É uma coluna de texto solta. Nada impede que aponte para um registro inexistente.

### 🟡 MÉDIO — Dois modelos de isolamento convivendo

APR/PT isola por `companyId`, coluna comum. Extintores isola por `ownerId = auth.uid()`
+ `empresaId`. São dois mundos com regras diferentes no mesmo banco.

---

## 4. Banco de dados — campos do módulo

### `documents`

| Campo | Tipo | Obrigatório | Nota |
|---|---|---|---|
| `id` | text | sim | default `gen_random_uuid()::text` |
| `companyId` | text | sim | FK → companies |
| `documentType` | text | sim | `APR` ou `PT` |
| `documentName` | text | sim | montado no servidor |
| `status` | text | sim | **CHECK: só `draft` ou `sent`** |
| `formData` | jsonb | sim | **o documento inteiro vive aqui** |
| `analysisData` | jsonb | não | saída da IA |
| `equipmentData` | jsonb | não | EPI/EPC da IA |
| `signatureDocumentId` | text | não | **sem FK** |
| `projeto_id` | text | não | FK → projetos_apr_pt |
| `createdAt` / `updatedAt` | text | sim | sem `createdBy` |

### `signatureDocuments`

| Campo | Tipo | Obrigatório | Nota |
|---|---|---|---|
| `assinafyDocumentId` | text | sim | id externo |
| `assinafyAssignmentId` | text | sim | id externo |
| `status` | text | sim | sem CHECK — vem da Assinafy |
| `signers` | jsonb | sim | default `[]` |
| `signerEmails` | text[] | sim | usado para buscar por e-mail |
| `lastSyncedAt` | text | não | última sincronização manual |

---

## 5. Geração do documento

APR e PT seguem o mesmo caminho, mudando só quem desenha:

1. React monta o documento — `PrintPreview` para APR; delega a `PTPreview` quando é PT.
2. `renderToString` vira HTML, com CSS embutido **próprio do gerador** — não o
   `globals.css` da interface.
3. Puppeteer imprime com `page.pdf()` em A4. Há um caminho alternativo via Cloud Function.
4. O Buffer é devolvido: vira download no navegador, ou sobe direto para a Assinafy.

### 🔴 GRAVE — O PDF não é armazenado em lugar nenhum

Não há bucket, não há coluna de caminho de arquivo, o Supabase Storage não é usado. Cada
visualização regenera o PDF do zero. A única cópia durável de um documento assinado fica
**dentro da Assinafy** — se o contrato com eles terminar, o histórico assinado vai junto.

| Recurso | Situação |
|---|---|
| Versionamento | não existe |
| Histórico de alterações | não existe |
| Auditoria | não existe — só `errorLogs`, que registra erro, não ação |
| Quem criou / quem alterou | não existe — `documents` não tem `createdBy` |

---

## 6. Assinaturas

Existem **dois mecanismos diferentes** chamados de assinatura, e eles não são equivalentes.

**Assinatura por e-mail (Assinafy)**
- Serviço externo, com valor jurídico
- Cada signatário recebe link próprio
- Status volta por sincronização manual
- O PDF assinado fica com a Assinafy

**Assinatura "no sistema"**
- Desenho com o dedo, virado imagem base64
- Guardado dentro do `formData`
- Sem data, sem hora, sem IP, sem identidade
- **É um rabisco na folha, não uma assinatura**

### Quem assina

| Documento | Signatários montados a partir do formulário |
|---|---|
| **APR** | Responsáveis + equipe de trabalho, todos os marcados para assinar por e-mail |
| **PT** | Colaboradores + vigias + resgatistas + gestor da área + responsável pela atividade + SESMT |

### 🔴 GRAVE — O documento continua editável depois de enviado para assinatura

Nada trava o registro em `documents` quando o status vira `sent`. Reabrir o rascunho e
mudar qualquer campo é possível. O PDF que as pessoas assinaram está congelado na Assinafy,
mas a versão no sistema pode divergir dele sem deixar rastro.

Para um produto cujo propósito é prova documental perante fiscalização, esse é o problema
mais sério do módulo.

| Garantia | Assinafy | No sistema |
|---|---|---|
| Data e hora | sim, na Assinafy | não |
| Endereço IP | na Assinafy; o app não guarda | não |
| Identificação do signatário | e-mail verificado | não |
| Documento protegido após assinar | o artefato sim | não |

---

## 7. Problemas de UX

### 🔴 GRAVE — A PT não tem etapas

Enquanto a APR guia em quatro passos, a PT é uma rolagem única sem indicação de progresso,
sem saber o que falta e sem validação por etapa.

### 🟡 MÉDIO — Criar obra só existe dentro de um modal

A etapa 1 da APR deixa escolher uma obra, mas não criar. Para cadastrar a primeira, é
preciso sair do fluxo, abrir a faixa superior, entrar no modal e voltar.

### 🟡 MÉDIO — O projeto está fora do assistente, embora seja informação da etapa 1

Ele mora numa faixa acima do formulário. Quem começa a preencher pela etapa 1 pode nunca
perceber que precisava selecionar um projeto antes.

### 🟡 MÉDIO — Enviar para assinatura pode travar por até um minuto

A server action gera o PDF, sobe e *fica esperando* a Assinafy processar, consultando de 2
em 2 segundos por até 60 segundos. Nesse intervalo não há indicação de progresso — só o
botão desabilitado.

### 🟡 MÉDIO — Sem salvamento automático

Existe aviso de alterações não salvas, mas o rascunho só é gravado quando a pessoa clica.
Uma APR gerada por IA e perdida por fechar a aba significa refazer tudo.

### 🟢 O que já está bom — manter no redesenho

- A pré-visualização é o documento real, lado a lado com o formulário. Raro e valioso.
- A IA gera análise e EPI/EPC em paralelo, numa chamada só.
- A escolha de pessoas na APR resolve em dois cliques.

---

## 8. Duplicação de dados

O que o sistema já sabe e mesmo assim pergunta:

| O usuário digita | Mas o sistema já tem em | Peso |
|---|---|---|
| Colaboradores da PT: nome, RG/CPF, função, empresa | `employees` | 🔴 grave |
| Signatários da PT (gestor, responsável, SESMT) | `responsible_contacts` | 🔴 grave |
| Endereço da obra (CEP, logradouro, número, bairro, cidade) | `projetos_apr_pt` | 🟡 médio |
| Cliente e CNPJ no documento | `projetos_apr_pt.cliente_principal` | 🟡 médio |
| Local da atividade na PT | `works.workLocationDetails` | 🟡 médio |

O caso mais caro é o primeiro: **a PT ignora completamente o cadastro de funcionários.**
Uma equipe de oito pessoas significa **quarenta campos digitados à mão**, com RG e CPF,
toda vez que se emite uma PT — mesmo que todos já estejam cadastrados.

---

## 9. Fluxo ideal possível

Sem funcionalidade nova. Só tirando degrau e aproveitando o que o banco já sabe.

### APR — de sete passos para quatro

1. **Onde e quando** — projeto e obra na *mesma* etapa, com "criar nova" ali dentro.
   Escolhida a obra, endereço, cliente, CNPJ e datas vêm preenchidos e só aparecem se a
   pessoa quiser conferir.
2. **O que vai ser feito** — um campo de descrição e um botão. A IA devolve etapas, riscos,
   medidas, EPI e EPC para conferência.
3. **Quem faz e quem responde** — como já está hoje: busca, um clique, cadastro rápido
   para quem falta.
4. **Conferir e emitir** — documento inteiro na tela e três saídas claras: guardar, baixar,
   mandar assinar.

### PT — o mesmo esqueleto

1. **Onde e quando** — projeto, obra, data e horário. Local vem da obra.
2. **Qual é o trabalho** — descrição e checklist. Espaço confinado, vigia e resgatista
   aparecem *só* se o checklist indicar — hoje são interruptores manuais.
3. **Quem participa** — o mesmo seletor de pessoas da APR, lendo o cadastro de
   funcionários. Fim dos quarenta campos.
4. **Conferir e emitir** — idêntico ao da APR.

> **O princípio:** quem opera é técnico de segurança, não digitador. Cada campo que o
> sistema já pode responder sozinho e mesmo assim pergunta é um campo que atrasa a emissão
> e convida ao erro de digitação — num documento que serve de prova perante fiscalização.

---

## 10. Arquitetura atual

| Camada | Tecnologia | Observação |
|---|---|---|
| Frontend | Next.js 16.1.6 (App Router, Turbopack), React 19 | Compilador do React ligado |
| Backend | Server Actions | Sem camada de API separada, fora as 4 rotas |
| Banco | Supabase / PostgreSQL 17 | Projeto `SafeDoc` |
| Acesso ao banco | Cliente *service role* | Ignora RLS — ver seção 3 |
| Autenticação | Supabase Auth + cookie de sessão assinado | Middleware em `src/proxy.ts` |
| Storage | **nenhum** | Logos vão como base64 no banco |
| PDF | Puppeteer + `react-dom/server` | Alternativa via Cloud Function |
| IA | Genkit + Google AI (`gemini-pro`) | Configurável por `GENAI_MODEL` |
| Assinatura | Assinafy (REST) | Sem webhook: sincronização manual |

### Como os dados chegam na tela

Componentes de cliente com `useEffect` disparando server actions. Ao abrir `/reports` saem
**cinco chamadas em paralelo**: empresa, obras, funcionários, projetos e responsáveis salvos.

### Onde está lento

| Ponto | Custo | Percebido como |
|---|---|---|
| Espera da Assinafy | até 60s | Botão travado sem explicação |
| Puppeteer | segundos | Abre um navegador inteiro por PDF |
| Geração pela IA | segundos | Já tem barra de progresso |
| Busca em `useEffect` | 2 renders | Piscada ao montar cada tela |
| Logos em base64 | variável | Engorda linha do banco e payload |

---

## 11. Arquivos que controlam o módulo

| Caminho | Função | Peso | Depende de |
|---|---|---|---|
| `app/reports/page.tsx` | Orquestra tudo: estado, dados, salvar, PDF, assinatura | crítico | form-panel, print-preview, 6 actions |
| `components/safety-form.tsx` | Assistente da APR em 4 etapas | crítico | person-picker, types, ai-actions |
| `components/pt-form.tsx` | Formulário da PT | crítico | types (`ptFormSchema`) |
| `lib/types.ts` | Todos os schemas Zod. Fonte da verdade do formulário | crítico | zod |
| `server/pdf-generator.ts` | HTML → PDF, com CSS próprio | crítico | puppeteer, print-preview |
| `server/signature-actions.ts` | Monta signatários e conduz o envio | crítico | assinafy-actions, pdf-generator |
| `server/assinafy-actions.ts` | Cliente REST da Assinafy | alto | fetch |
| `server/ai-actions.ts` | Análise de risco e EPI/EPC | alto | genkit, googleai |
| `components/print-preview.tsx` | Desenha o documento; ramifica APR/PT | alto | pt-preview |
| `server/document-actions.ts` | Salvar, listar, abrir, apagar | alto | document.repository |
| `components/person-picker.tsx` | Seleção de pessoas (só APR hoje) | alto | — |
| `src/proxy.ts` | Middleware: sessão e empresa | alto | auth/session-cookie |

---

## Se for mexer em uma coisa antes de todas as outras

Tirar o conteúdo de dentro do `formData`.

Tabelas de verdade para atividade, risco, medida e signatário destravam de uma vez o status
correto, o versionamento, a auditoria, o travamento após assinatura e qualquer relatório —
**cinco dos seis achados graves saem da mesma decisão.**
