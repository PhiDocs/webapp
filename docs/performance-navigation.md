# Performance e Navegacao

## Gargalos encontrados

- A troca de modulos dentro de `/company/[companyId]` usava `router.replace` apenas para alterar `?section=...`, acionando o ciclo de renderizacao do App Router sem necessidade.
- Alguns atalhos internos usavam `window.location.assign`, causando reload completo da aplicacao.
- A tela de Colaboradores bloqueava a primeira renderizacao buscando dados completos de EPIs, treinamentos, inspeções, não conformidades, incidentes e custos antes de liberar a lista.
- Rotas como Documentos nao tinham skeleton proprio.

## Otimizacoes aplicadas

- Navegacao interna entre modulos agora usa History API + evento client-side `phidocs:section-change`, evitando renderizacao pesada do Next para simples troca de secao.
- A tela principal mostra skeleton imediato durante troca de secao e so monta o modulo pesado depois de um pequeno intervalo.
- Atalhos de importacao e navegacao interna foram trocados para `navigateCompanySection`, sem reload completo.
- Colaboradores passou a carregar a lista principal primeiro e carregar dados relacionados em segundo plano.
- Foi adicionado `loading.tsx` leve para Documentos.

## Proximos pontos de atencao

- Separar graficos/Recharts do Dashboard em componente dinamico carregado apenas na aba Graficos.
- Criar APIs/servicos de summary para evitar buscar listas completas quando a tela precisa apenas de contagens.
- Paginar consultas no banco para listagens grandes.
- Importar bibliotecas de PDF/Excel apenas no clique de exportacao/importacao.
