# Auditoria funcional e de UX — APR e PT

**Data:** 02/09/2026
**Método:** execução real no navegador, com sessão autenticada, contra o Supabase de produção (projeto SafeDoc).
**Projeto usado no teste:** Kaoe Teste · empresa Solvi BR.
**Nenhum código foi alterado.**

Esta versão substitui a auditoria anterior, que era baseada em leitura de código.
Tudo marcado como **medido** foi observado no navegador, com número.
Onde eu não consegui executar, está dito explicitamente.

## O que eu não testei, e por quê

| Não testado | Motivo |
| --- | --- |
| Excluir documento | Apaga dado real do banco de vocês. |
| Enviar para assinatura | Dispara e-mail de verdade pela Assinafy para pessoas reais. |
| PT até a emissão | Bloqueado pelo P0-1 abaixo: não dá para completar uma PT de espaço confinado. |

Durante o teste o sistema **salvou um rascunho automaticamente**
(`documentId: 5799ec09-56af-45a9-8938-10d656ea89de`). Vale apagar depois.

---

## Veredito

> **A APR está pronta para teste com usuário real? SIM — com uma ressalva de tablet.**
>
> **A PT está pronta para teste com usuário real? NÃO.**

A APR foi percorrida de ponta a ponta e funciona. O único impedimento sério é o
layout em tablet retrato (P1-1), que atinge justamente o aparelho que vocês
disseram ser o principal. Em celular (390px) e em desktop ela está correta.

A PT não passa porque uma Permissão de Trabalho para espaço confinado **não
consegue registrar o vigia**, que a NR-33 exige. O campo existe no código, mas
está permanentemente invisível. Emitir uma PT nessas condições é pior do que não
emitir: o documento sai com aparência de conforme.

---

## P0 — Impeditivo

### P0-1. Vigia, resgatista e avaliação de espaço confinado nunca aparecem

**Onde:** `src/components/safety-form.tsx:719`, `src/components/pt-form.tsx:470` e `:536`

O `safety-form.tsx` monta o formulário assim:

```jsx
<PTForm
  form={form}
  passoVisivel={passoVisivel}
  pessoasExternas          // <- prop nua = sempre true
  ...
/>
```

E o `pt-form.tsx` esconde os blocos com:

```jsx
<div className={cn('space-y-6', (pessoasExternas || passoVisivel !== 3) && 'hidden')}>
<div className={cn('space-y-6', (pessoasExternas || passoVisivel !== 4) && 'hidden')}>
```

Como `pessoasExternas` é sempre `true`, a classe `hidden` **sempre** se aplica.
Os dois blocos são código morto.

**Medido no navegador.** Marquei Espaço Confinado + Trabalho a Quente + Trabalho
em Altura. Buscando no DOM por `textContent` (que enxerga elementos escondidos):

| Campo | Existe no DOM | Visível |
| --- | --- | --- |
| "Necessita Avaliação de Espaço Confinado?" | sim | **não** |
| "Trabalho em Espaço Confinado - Avaliação" | sim | **não** |
| "Necessita Vigia?" | sim | **não** |
| "Vigias" | sim | **não** |
| "Resgatistas" | sim | **não** |

O único "vigia" visível na tela é o texto descritivo da etapa 4 — *"Quem executa
e quem vigia."* — que promete um campo que o usuário nunca alcança.

**Agrava:** a regra existe e está certa. Em `src/lib/pt-rules.ts:102`, a regra de
espaço confinado declara `participantesObrigatorios: ['vigia', 'resgatista']`. A
lógica é calculada (`pt-form.tsx:282` e `:347`) e depois jogada fora pela UI.

**É regressão, não dívida antiga.** `pessoasExternas` não existe em nenhum dos
dois arquivos na versão commitada (conferido com `git show HEAD:...`; ambos os
arquivos existem no HEAD). Entrou nas alterações ainda não commitadas.

Isso provavelmente explica o que você relatou como *"o toggle tá apagado"*: ele
não está apagado, foi escondido pela combinação do `pessoasExternas` com o novo
controle de passos do wizard.

**Correção:** remover a prop `pessoasExternas` da chamada, ou trocar a condição
para depender só de `passoVisivel`. É uma linha.

---

## P1 — Corrigir antes de soltar para campo

### P1-1. Tablet retrato perde 152–187px de conteúdo, sem rolagem possível

**Onde:** `src/components/form-panel.tsx:165` a ~`:235`

**Medido:**

| Largura da janela | Container | Scrollport | Transbordo |
| --- | --- | --- | --- |
| 390px (celular) | 375px | 375px | 0 — **OK** |
| **768px (iPad retrato)** | **905px** | **753px** | **152px** |
| **903px** | **940px** | 888px (`left: -37px`) | cortado à esquerda |
| 1280px | 940px | 940px | 0 — OK |
| 1440px (com prévia) | 913px | 913px | 0 — OK |

O scrollport tem `overflow-x: hidden`, então **não dá para arrastar até o
conteúdo escondido**. Confirmei que ele existe forçando `scrollLeft = 999` por
script (foi para 187). Por toque, é inalcançável.

**Causa raiz, com a conta fechando.** O culpado é a barra fixa do rodapé. Medi o
`min-content` de cada filho do container: a barra dá **841px**. Somando o
`md:px-8` do container (64px) → **905px**, exatamente o valor medido.

Ela tem três botões com largura mínima fixa e `md:flex-nowrap`:

- `min-w-[184px]` — Salvar Rascunho
- `min-w-[184px]` — Gerar e Baixar PDF
- `min-w-[210px]` — Enviar para Assinatura

184 + 184 + 210 = 578px de piso, mais os gaps e o texto de status ("Alterações
não salvas", sem quebra) → 841px.

O `ScrollArea` do Radix agrava: o `Viewport`
(`src/components/ui/scroll-area.tsx:17`) injeta um filho com `display: table`,
que permite ao conteúdo **exceder** o scrollport em vez de ser espremido.

**Sintoma visível em 768px:** o 4º passo da trilha ("Participantes") aparece
cortado, o texto da atividade some no meio ("...a 8 metr"), e o card PESSOAS é
decepado.

**Correção sugerida:** trocar `min-w-[184px]` / `min-w-[210px]` por
`flex-1 min-w-0` (ou deixar a barra empilhar até `lg:`) e adicionar
`[&>div]:!block` no `Viewport` do ScrollArea.

### P1-2. "Pagina 01 de 01" está escrito na mão

**Onde:** `src/components/document-primitives.tsx:245`

```jsx
<span>Pagina 01 de 01</span>
```

Como está nas primitivas compartilhadas, sai assim em **todo APR e toda PT**,
independente do tamanho real. A APR que gerei tem 10 etapas e 5 seções —
claramente mais de uma página impressa — e mesmo assim diz "01 de 01".

Num documento que a fiscalização audita, paginação errada abre questionamento
sobre a integridade do documento inteiro.

### P1-3. A IA leva mais de um minuto, sem previsão

**Medido:**

| Ação | Tempo real |
| --- | --- |
| APR — Gerar Análise de Segurança | **64,9s** |
| PT — Sugerir com IA | **61,9s** |

Um minuto inteiro de espera. Existe barra indeterminada, mas nada que diga quanto
falta nem que permita cancelar. Em campo, com 4G instável, a pessoa vai achar que
travou e recarregar — perdendo o preenchimento.

Vale considerar: trocar o modelo (`GENAI_MODEL`), fazer streaming por etapa, ou
gerar em segundo plano enquanto a pessoa preenche os participantes.

### P1-4. A IA da PT não sugere nada, e o código não conta por quê

**Medido.** Descrição usada: *"Solda em espaco confinado no interior do tanque
02, com trabalho em altura de 8 metros e uso de macarico."*

A IA respondeu em 61,9s, **sem erro**, com uma justificativa correta e específica:

> "A tarefa envolve soldagem e maçarico em espaço confinado dentro de um tanque,
> com trabalho em altura."

E entregou **zero** sugestões de itens. As 33 marcas "SUGERIDO" na tela vieram
todas da camada de regras determinística. Nenhuma marca "Sugestão da IA" apareceu.

**Onde:** `src/server/ai-actions.ts:370`

```ts
const filtrados = (output.itemIds || []).filter((id) => permitidos.has(id));
```

O filtro anti-alucinação está certo em existir, mas descarta **em silêncio**. Não
dá para distinguir "o modelo devolveu lista vazia" de "o modelo devolveu 15 ids
inválidos e todos foram barrados". Sem log, o problema é invisível.

**Correção:** logar os ids descartados. Se forem muitos, o prompt precisa de
ajuste; se a lista vier vazia, o botão deveria dizer "nada a acrescentar além das
regras" em vez de parecer que funcionou.

---

## P2 — Melhorar

### P2-1. Alvo de toque de 20px de altura, com 80 itens na tela

**Medido:** o checkbox em si é 16×16px. O rótulo está associado e **funciona**
como área de clique, o que dá um alvo efetivo de **97×20px**.

A largura está boa. A altura de 20px fica abaixo do mínimo da WCAG 2.2 AA (24×24)
e bem longe do confortável para dedo com luva. Na etapa 3 da PT, depois de marcar
os três tipos de atividade, são **80 checkboxes** empilhados — erro de toque é
questão de tempo.

### P2-2. Piscada de layout ao montar a prévia

Na tela de escolha do documento, medi o card "PT" com **113px** de largura logo
após a montagem; ele se acomoda em **426px** sozinho. O estado final está correto,
mas a piscada é visível e, em aparelho lento, dá tempo de a pessoa tentar clicar
no card espremido.

### P2-3. Um crash não reproduzido

Navegando por teclado (seta direita) no seletor de tipo de documento, estando na
etapa 7 da APR, o `<SafetyForm>` quebrou com:

```
TypeError: Cannot read properties of undefined (reading 'title')
```

A tela caiu para "Nao foi possivel carregar os relatorios." **Não consegui
reproduzir** entrando limpo pela tela de escolha. Registro como pista, não como
bug confirmado — mas o caminho de troca de tipo com documento já preenchido
merece um olhar.

### P2-4. Entrada de /reports leva ~3s

Na montagem, a tela dispara várias server actions em paralelo. Durações medidas:
**2963ms**, 861, 787, 764, 704, 346, 288. O DOM fica interativo em 190ms, mas a
tela só fica utilizável quando a mais lenta termina.

---

## O que foi verificado e está funcionando

Tudo abaixo foi **executado**, não lido.

### APR — percorrida do passo 1 ao 7

| Item | Resultado |
| --- | --- |
| Trilha de passos marca "OK" nos concluídos | ✅ |
| Chips de "Descrições recentes" vindos do histórico | ✅ |
| Datas preenchidas automaticamente pela empresa | ✅ (02/09 a 04/09) |
| PersonPicker traz nome, cargo e e-mail do cadastro | ✅ **zero digitação** |
| Três métodos de assinatura (E-mail / WhatsApp / Manual) | ✅ E-mail como padrão |
| Campo de contato some quando já veio do cadastro | ✅ |
| IA devolve as 6 listas separadas em **todas** as 10 etapas | ✅ |
| Editar item: input próprio, remover por item, adicionar por lista | ✅ |
| Revisão mostra riscos e medidas completos | ✅ |
| "CONTINUAR" travado até marcar a validação humana | ✅ |
| Botão EDITAR abre **pop-up** e preserva a rolagem | ✅ `scrollY` seguiu em 516 |

Sobre a IA da APR: 10 etapas geradas, com as seis listas preenchidas em cada uma.
Amostra da etapa 6 ("Realização da solda no costado do tanque"): 6 perigos, 6
riscos, 5 consequências, 6 medidas, 10 EPIs, 7 EPCs.

### PDF da APR — conferido no conteúdo renderizado

Seções presentes: `1. DADOS DA OBRA / PROJETO`, `2. PROCEDIMENTO OPERACIONAL E
RISCOS`, **`3. EPI E EPC OBRIGATORIOS`**, `4. EQUIPE DE TRABALHO`,
`5. RESPONSAVEIS`. "Local da Atividade" aparece. A seção 3 traz a lista
consolidada e sem repetição, com a nota da NR06.

A seção 3 era a que faltava e você tinha apontado. **Está resolvida.**

### PT — camada de regras funcionando bem

Marcando Espaço Confinado + Trabalho a Quente + Trabalho em Altura, apareceram
exatamente as três seções condicionais correspondentes:

- PRECAUÇÕES OBRIGATÓRIAS PARA TRABALHO A QUENTE
- PRECAUÇÕES PARA TRABALHO EM ALTURA
- PRECAUÇÕES PARA ESPAÇO CONFINADO

Checkboxes na tela: 54 → 80. E as sugestões aparecem **ao lado de cada item**, no
formato que você pediu — por exemplo:

> Verificar acesso e saída de pessoal da área  `SUGERIDO`

33 marcas dessas, todas vindas das regras.

---

## Ordem sugerida

1. **P0-1** — uma linha, e destrava a PT inteira.
2. **P1-1** — o tablet é o aparelho principal de vocês.
3. **P1-2** — paginação do PDF.
4. **P1-4** — logar o descarte, para enxergar o problema de verdade.
5. **P1-3** — latência da IA, que é a mais cara de resolver.
6. P2 conforme der.

Não implementei nenhuma dessas correções, conforme combinado.
