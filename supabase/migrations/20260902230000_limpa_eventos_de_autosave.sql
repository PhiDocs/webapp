-- Limpeza dos eventos gerados pelo loop de autosave.
--
-- Contexto: o efeito de guarda automatica em src/app/reports/page.tsx dependia
-- do objeto devolvido por form.watch(), que e novo a cada render, e o isDirty
-- do react-hook-form nunca voltava a false depois de salvar. O efeito se
-- re-agendava sozinho e gravava o documento a cada ~3,5s indefinidamente,
-- mesmo com a aba parada.
--
-- Medido antes da correcao: 378 e 342 eventos em uma unica hora para um
-- documento que ninguem tocou, e um documento na versao 721.
--
-- O bug ja foi corrigido no codigo (assinatura do conteudo ja persistido +
-- modo silencioso em saveDocument, que nao registra evento nem conta versao
-- para guarda automatica). Esta migration limpa o rastro que ele deixou.

begin;

-- 1. Apaga os eventos de edicao gerados pelo loop.
--    Os demais tipos (created, sent_for_signature, signed, ...) ficam intactos:
--    eles representam decisoes reais e sao a parte que importa da trilha.
delete from document_events
where action = 'updated';

-- 2. Devolve a versao dos documentos a 1.
--    Seguro porque nenhum documento saiu para assinatura: a contagem inflada
--    veio inteira do autosave, nao de revisoes reais.
update documents
set version = 1
where coalesce(version, 1) > 1
  and status = 'draft';

commit;

-- Conferencia sugerida apos aplicar:
--   select action, count(*) from document_events group by action;
--   select max(coalesce(version, 1)) from documents;
