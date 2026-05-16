'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  AlertTriangle,
  CheckCircle2,
  Database,
  Download,
  FileArchive,
  FileSpreadsheet,
  FileText,
  History,
  Loader2,
  Pencil,
  RotateCcw,
  Upload,
  XCircle,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { createCollaborator, getCollaborators } from '@/server/collaborator-actions';
import { createEpi, getEpiModuleData } from '@/server/epi-actions';
import {
  autoMapFields,
  getImportConfig,
  getTemplateCsv,
  importStorageKey,
  importTypeConfigs,
  isValidCpf,
  isValidDateValue,
  normalizeDate,
  onlyDigits,
  parseBooleanValue,
  parseCsv,
  type ImportDataType,
  type ImportField,
  type ImportHistoryItem,
  type ImportTypeConfig,
} from '@/lib/import-data';
import {
  calculateExtinguisherStatus,
  emptyExtinguisherStore,
  extinguisherStorageKey,
  type FireExtinguisher,
  type FireExtinguisherDataStore,
} from '@/lib/fire-extinguishers';
import type { Collaborator, Epi } from '@/lib/types';

type DataImportsDashboardProps = {
  companyId: string;
  companyName?: string;
};

type WizardStep = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
type RowState = 'valid' | 'warning' | 'error' | 'ignored';
type PreviewFilter = 'todos' | RowState | 'duplicate';
type DuplicateAction = 'ignore' | 'update' | 'create_new' | 'manual';

type ImportRow = {
  id: string;
  line: number;
  raw: Record<string, string>;
  edits: Record<string, string>;
  ignored?: boolean;
  duplicateAction?: DuplicateAction;
};

type ValidatedRow = ImportRow & {
  values: Record<string, string>;
  state: RowState;
  errors: string[];
  warnings: string[];
  duplicate: boolean;
};

type ImportResult = {
  created: number;
  updated: number;
  ignored: number;
  failed: number;
  messages: string[];
};

const supportedCsvTypes: ImportDataType[] = ['collaborators', 'epis', 'extinguishers'];
const dateTime = () => new Date().toISOString();
const uid = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

function downloadText(filename: string, content: string, type = 'text/csv;charset=utf-8') {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function normalizeStatus(value: string) {
  const text = value.trim().toLowerCase();
  if (['afastado', 'afastada', 'afastamento'].includes(text)) return 'afastado';
  if (['desligado', 'desligada', 'inativo', 'inativa', 'demitido'].includes(text)) return 'desligado';
  return 'ativo';
}

function normalizeNumber(value: string) {
  if (!value.trim()) return undefined;
  const normalized = value.replace(/\./g, '').replace(',', '.').replace(/[^\d.-]/g, '');
  const number = Number(normalized);
  return Number.isFinite(number) ? number : undefined;
}

function readStore<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  const saved = window.localStorage.getItem(key);
  if (!saved) return fallback;
  try {
    return JSON.parse(saved) as T;
  } catch {
    return fallback;
  }
}

function writeStore<T>(key: string, value: T) {
  window.localStorage.setItem(key, JSON.stringify(value));
}

function getFileFormat(fileName: string) {
  return fileName.split('.').pop()?.toLowerCase() || '';
}

function isStructuredSpreadsheet(format: string) {
  return ['csv', 'xlsx', 'xls'].includes(format);
}

function isAssistedDocument(format: string) {
  return ['pdf', 'docx', 'doc'].includes(format);
}

function normalizeImportTypeParam(value: string | null): ImportDataType | null {
  const normalized = (value || '').toLowerCase();
  const aliases: Record<string, ImportDataType> = {
    colaboradores: 'collaborators',
    collaborators: 'collaborators',
    epis: 'epis',
    epi: 'epis',
    extintores: 'extinguishers',
    extinguishers: 'extinguishers',
    treinamentos: 'trainings',
    trainings: 'trainings',
    custos: 'costs',
    costs: 'costs',
    incidentes: 'incidents',
    incidents: 'incidents',
    nao_conformidades: 'nonconformities',
    'não_conformidades': 'nonconformities',
    nonconformities: 'nonconformities',
  };
  return aliases[normalized] || (importTypeConfigs.some((item) => item.type === normalized) ? normalized as ImportDataType : null);
}

function getExampleForField(field: ImportField, config: ImportTypeConfig) {
  if (field.type === 'date') return '2026-05-15';
  if (field.type === 'number') return '30';
  if (field.type === 'boolean') return 'Sim';
  if (field.type === 'email') return 'contato@empresa.com';
  if (field.type === 'cpf') return '000.000.000-00';
  if (field.key.includes('codigo')) return 'EXT-001';
  if (field.key.includes('area') || field.key.includes('setor')) return 'Produção';
  if (field.key.includes('funcao')) return 'Eletricista';
  if (field.key.includes('tipo_agente')) return 'Pó Químico ABC';
  if (field.key.includes('nome')) return config.type === 'epis' ? 'Capacete de segurança' : 'João da Silva';
  return 'Texto';
}

export function DataImportsDashboard({ companyId, companyName }: DataImportsDashboardProps) {
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [history, setHistory] = useState<ImportHistoryItem[]>([]);
  const [modal, setModal] = useState<'wizard' | 'templates' | 'history' | null>(null);
  const [step, setStep] = useState<WizardStep>(1);
  const [type, setType] = useState<ImportDataType>('collaborators');
  const [fileName, setFileName] = useState('');
  const [fileFormat, setFileFormat] = useState('');
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [previewFilter, setPreviewFilter] = useState<PreviewFilter>('todos');
  const [search, setSearch] = useState('');
  const [existingCollaborators, setExistingCollaborators] = useState<Collaborator[]>([]);
  const [existingEpis, setExistingEpis] = useState<Epi[]>([]);
  const [result, setResult] = useState<ImportResult | null>(null);

  const config = useMemo(() => getImportConfig(type), [type]);

  useEffect(() => {
    setHistory(readStore<ImportHistoryItem[]>(importStorageKey(companyId), []));
  }, [companyId]);

  useEffect(() => {
    const requested = normalizeImportTypeParam(searchParams.get('tipo_importacao') || searchParams.get('type'));
    if (!requested) return;
    setType(requested);
    setStep(1);
    setModal('wizard');
  }, [searchParams]);

  useEffect(() => {
    startTransition(async () => {
      const [collaboratorsResult, epiResult] = await Promise.all([
        getCollaborators(companyId),
        getEpiModuleData(companyId),
      ]);
      if (collaboratorsResult.success && collaboratorsResult.data) setExistingCollaborators(collaboratorsResult.data);
      if (epiResult.success && epiResult.data) setExistingEpis(epiResult.data.epis);
    });
  }, [companyId]);

  const existingExtinguishers = useMemo(() => {
    const store = readStore<FireExtinguisherDataStore>(extinguisherStorageKey(companyId), emptyExtinguisherStore());
    return store.extinguishers;
  }, [companyId, history]);

  const validatedRows = useMemo(() => {
    return rows.map((row) => validateRow(row, config, mapping, {
      collaborators: existingCollaborators,
      epis: existingEpis,
      extinguishers: existingExtinguishers,
    }));
  }, [config, existingCollaborators, existingEpis, existingExtinguishers, mapping, rows]);

  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return validatedRows.filter((row) => {
      const matchesFilter = previewFilter === 'todos' || row.state === previewFilter || (previewFilter === 'duplicate' && row.duplicate);
      const matchesSearch = !term || Object.values(row.values).join(' ').toLowerCase().includes(term) || row.errors.join(' ').toLowerCase().includes(term);
      return matchesFilter && matchesSearch;
    });
  }, [previewFilter, search, validatedRows]);

  const stats = useMemo(() => {
    const totalImported = history.reduce((total, item) => total + item.linhas_importadas, 0);
    const totalErrors = history.reduce((total, item) => total + item.linhas_com_erro, 0);
    return {
      total: history.length,
      imported: totalImported,
      errors: totalErrors,
      pending: history.filter((item) => item.status === 'aguardando_revisao' || item.status === 'pendente').length,
      last: history[0]?.data_importacao ? new Date(history[0].data_importacao).toLocaleString('pt-BR') : 'Nenhuma',
    };
  }, [history]);

  const summary = useMemo(() => {
    const activeRows = validatedRows.filter((row) => !row.ignored);
    return {
      total: validatedRows.length,
      valid: activeRows.filter((row) => row.state === 'valid').length,
      warning: activeRows.filter((row) => row.state === 'warning').length,
      error: activeRows.filter((row) => row.state === 'error').length,
      ignored: validatedRows.filter((row) => row.ignored || row.duplicateAction === 'ignore').length,
      duplicates: activeRows.filter((row) => row.duplicate).length,
    };
  }, [validatedRows]);

  const resetWizard = () => {
    setStep(1);
    setType('collaborators');
    setFileName('');
    setFileFormat('');
    setHeaders([]);
    setRows([]);
    setMapping({});
    setPreviewFilter('todos');
    setSearch('');
    setResult(null);
  };

  const openWizard = () => {
    resetWizard();
    setModal('wizard');
  };

  const closeWizard = () => {
    setModal(null);
    resetWizard();
  };

  const persistHistory = (item: ImportHistoryItem) => {
    const next = [item, ...history].slice(0, 50);
    setHistory(next);
    writeStore(importStorageKey(companyId), next);
  };

  const handleFile = async (file?: File) => {
    if (!file) return;
    const format = getFileFormat(file.name);
    setFileName(file.name);
    setFileFormat(format);

    if (!['csv', 'xlsx', 'xls', 'pdf', 'docx', 'doc'].includes(format)) {
      toast({ title: 'Formato não permitido', description: 'Use CSV, Excel, PDF ou Word.' });
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      toast({ title: 'Arquivo muito grande', description: 'Use arquivos com até 8 MB nesta etapa.' });
      return;
    }

    if (format === 'csv') {
      const text = await file.text();
      const parsed = parseCsv(text);
      if (!parsed.headers.length || !parsed.rows.length) {
        toast({ title: 'Arquivo vazio', description: 'Não encontrei cabeçalhos e linhas para importar.' });
        return;
      }
      const nextRows = parsed.rows.map((raw, index) => ({ id: uid('row'), line: index + 2, raw, edits: {} }));
      const nextMapping = autoMapFields(parsed.headers, config);
      setHeaders(parsed.headers);
      setRows(nextRows);
      setMapping(nextMapping);
      setStep(4);
      return;
    }

    setHeaders([]);
    setRows([]);
    setMapping({});
    setStep(4);
  };

  const applyAutoMapping = () => setMapping(autoMapFields(headers, config));

  const updateCell = (rowId: string, fieldKey: string, value: string) => {
    setRows((current) => current.map((row) => row.id === rowId ? { ...row, edits: { ...row.edits, [fieldKey]: value } } : row));
  };

  const toggleIgnore = (rowId: string) => {
    setRows((current) => current.map((row) => row.id === rowId ? { ...row, ignored: !row.ignored } : row));
  };

  const setDuplicateAction = (rowId: string, duplicateAction: DuplicateAction) => {
    setRows((current) => current.map((row) => row.id === rowId ? { ...row, duplicateAction } : row));
  };

  const resetRow = (rowId: string) => {
    setRows((current) => current.map((row) => row.id === rowId ? { ...row, edits: {}, ignored: false, duplicateAction: undefined } : row));
  };

  const downloadErrorReport = () => {
    const lines = [
      ['linha', 'status', 'erros', 'avisos'].join(';'),
      ...validatedRows.filter((row) => row.errors.length || row.warnings.length).map((row) => [
        row.line,
        row.state,
        `"${row.errors.join(' | ').replace(/"/g, '""')}"`,
        `"${row.warnings.join(' | ').replace(/"/g, '""')}"`,
      ].join(';')),
    ];
    downloadText(`relatorio-erros-${type}.csv`, lines.join('\n'));
  };

  const downloadAllTemplates = () => {
    const index = importTypeConfigs.map((item) => `${item.label}: modelo-${item.type}.csv`).join('\n');
    downloadText('modelos-importacao-phidocs.txt', index, 'text/plain;charset=utf-8');
    importTypeConfigs.filter((item) => supportedCsvTypes.includes(item.type)).forEach((item) => {
      window.setTimeout(() => downloadText(`modelo-${item.type}.csv`, getTemplateCsv(item)), 150);
    });
  };

  const confirmImport = () => {
    const readyRows = validatedRows.filter((row) => !row.ignored && !['ignore', 'update', 'manual'].includes(row.duplicateAction || '') && row.state !== 'error');
    if (!config.implemented || fileFormat !== 'csv') {
      const item = buildHistoryItem(type, fileName, fileFormat, validatedRows.length, summary.valid, summary.error, 0, summary.ignored, 'aguardando_revisao');
      persistHistory(item);
      setResult({ created: 0, updated: 0, ignored: validatedRows.length, failed: 0, messages: ['Importação assistida preparada. Revise e use CSV para salvar em massa nesta etapa.'] });
      setStep(9);
      return;
    }

    startTransition(async () => {
      let created = 0;
      let failed = 0;
      const messages: string[] = [];

      if (type === 'collaborators') {
        for (const row of readyRows) {
          const payload = collaboratorPayload(row.values, companyId);
          const response = await createCollaborator(payload);
          if (response.success) created += 1;
          else {
            failed += 1;
            messages.push(`Linha ${row.line}: ${response.error || 'erro ao importar colaborador'}`);
          }
        }
      }

      if (type === 'epis') {
        for (const row of readyRows) {
          const payload = epiPayload(row.values, companyId);
          const response = await createEpi(payload);
          if (response.success) created += 1;
          else {
            failed += 1;
            messages.push(`Linha ${row.line}: ${response.error || 'erro ao importar EPI'}`);
          }
        }
      }

      if (type === 'extinguishers') {
        const store = readStore<FireExtinguisherDataStore>(extinguisherStorageKey(companyId), emptyExtinguisherStore());
        const nowIso = dateTime();
        const nextExtinguishers = [...store.extinguishers];
        for (const row of readyRows) {
          const item = extinguisherPayload(row.values, companyId, nowIso);
          nextExtinguishers.push(item);
          created += 1;
        }
        writeStore(extinguisherStorageKey(companyId), { ...store, extinguishers: nextExtinguishers });
      }

      const ignored = validatedRows.length - readyRows.length;
      const status = failed > 0 ? 'concluida_com_erros' : 'concluida';
      persistHistory(buildHistoryItem(type, fileName, fileFormat, validatedRows.length, summary.valid, summary.error + failed, created, ignored, status));
      setResult({ created, updated: 0, ignored, failed, messages });
      setStep(9);
    });
  };

  const exportBiBase = (base: ImportDataType | 'complete') => {
    if (base === 'complete') {
      const content = importTypeConfigs.map((item) => `# ${item.label}\n${getTemplateCsv(item)}`).join('\n');
      downloadText('base-completa-power-bi.csv', content);
      return;
    }
    const target = getImportConfig(base);
    downloadText(`exportacao-bi-${base}.csv`, getTemplateCsv(target));
  };

  const downloadDataDictionary = (base?: ImportDataType) => {
    const configs = base ? [getImportConfig(base)] : importTypeConfigs;
    const lines = [
      ['base', 'campo', 'descricao', 'tipo', 'exemplo'].join(';'),
      ...configs.flatMap((item) => item.fields.map((field) => [
        item.label,
        field.key,
        `"${field.label}${field.required ? ' (obrigatório)' : ''}"`,
        field.type || 'text',
        `"${getExampleForField(field, item)}"`,
      ].join(';'))),
    ];
    downloadText(base ? `dicionario-${base}.csv` : 'dicionario-dados-phidocs.csv', lines.join('\n'));
  };

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-[#dbe3ea] bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <Badge className="mb-3 border border-[#cbd5e1] bg-[#f8fafc] text-[#334155]">Importações</Badge>
            <h1 className="text-3xl font-bold text-[#0f172a]">Importação de Dados</h1>
            <p className="mt-2 max-w-3xl text-[#475569]">Importe dados de planilhas e documentos para alimentar o sistema com segurança.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={openWizard} className="bg-[#f46e11] text-white hover:bg-[#d95f0c]"><Upload className="h-4 w-4" />Nova Importação</Button>
            <Button variant="outline" onClick={() => setModal('templates')}><Download className="h-4 w-4" />Baixar Modelos</Button>
            <Button variant="outline" onClick={() => setModal('history')}><History className="h-4 w-4" />Histórico</Button>
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <Metric title="Importações realizadas" value={stats.total} icon={Database} />
        <Metric title="Registros importados" value={stats.imported} icon={CheckCircle2} />
        <Metric title="Registros com erro" value={stats.errors} icon={AlertTriangle} tone="danger" />
        <Metric title="Pendentes de revisão" value={stats.pending} icon={FileArchive} tone="warning" />
        <Metric title="Última importação" value={stats.last} icon={History} />
      </div>

      <section className="grid gap-4 lg:grid-cols-3">
        <InfoPanel title="CSV e Excel" icon={FileSpreadsheet} text="Planilhas são o formato mais recomendado. CSV já está pronto para Colaboradores, EPIs e Extintores com validação e confirmação antes de salvar." />
        <InfoPanel title="PDF e Word" icon={FileText} text="Documentos entram como extração assistida. O sistema prepara a revisão, mas não importa direto sem conferência manual." />
        <InfoPanel title="Controle seguro" icon={Pencil} text="Todos os dados passam por mapeamento, validação, correção e confirmação final. Nenhum arquivo salva registros automaticamente." />
      </section>

      <section className="rounded-2xl border border-[#dbe3ea] bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-[#0f172a]">Exportações para BI</h2>
            <p className="text-sm text-[#64748b]">Use estes arquivos para análises externas em Excel, Power BI ou outras ferramentas de BI.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => exportBiBase('complete')}><Download className="h-4 w-4" />Base Completa</Button>
            <Button variant="outline" onClick={() => toast({ title: 'Link de exportação preparado', description: 'A API de exportação para Power BI ficará disponível em etapa futura.' })}>Copiar link de exportação</Button>
            <Button variant="outline" onClick={() => downloadDataDictionary()}><FileText className="h-4 w-4" />Dicionário de dados</Button>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {importTypeConfigs.filter((item) => ['collaborators', 'epis', 'epiDeliveries', 'trainings', 'extinguishers', 'inspections', 'nonconformities', 'incidents', 'costs'].includes(item.type)).map((item) => (
            <div key={item.type} className="rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-4">
              <p className="font-bold text-[#0f172a]">{item.label}</p>
              <p className="mt-1 text-xs text-[#64748b]">Filtros preparados: empresa, unidade, setor, período, status, módulo e gravidade.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => exportBiBase(item.type)}>Exportar CSV</Button>
                <Button size="sm" variant="outline" onClick={() => exportBiBase(item.type)}>Exportar Excel</Button>
                <Button size="sm" variant="ghost" onClick={() => downloadDataDictionary(item.type)}>Campos</Button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-[#dbe3ea] bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-[#0f172a]">Dicionário de Dados</h2>
            <p className="text-sm text-[#64748b]">Consulte campos, tipos e exemplos para montar dashboards no Power BI.</p>
          </div>
          <Button variant="outline" onClick={() => downloadDataDictionary()}><Download className="h-4 w-4" />Baixar dicionário</Button>
        </div>
        <DataDictionaryPreview />
      </section>

      <section className="rounded-2xl border border-[#dbe3ea] bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-bold text-[#0f172a]">Pacote mensal</h2>
            <p className="text-sm text-[#64748b]">Prepara relatório executivo PDF e bases CSV para colaboradores, EPIs, treinamentos, extintores, incidentes, não conformidades e custos.</p>
          </div>
          <Button variant="outline" onClick={() => toast({ title: 'Pacote mensal preparado', description: 'ZIP e PDF executivo serão conectados às exportações reais em etapa futura.' })}><FileArchive className="h-4 w-4" />Gerar pacote mensal</Button>
        </div>
      </section>

      <section className="rounded-2xl border border-[#dbe3ea] bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-[#0f172a]">Histórico recente</h2>
            <p className="text-sm text-[#64748b]">Últimas importações realizadas ou preparadas para revisão.</p>
          </div>
          <Button variant="outline" onClick={downloadAllTemplates}>Baixar modelos CSV</Button>
        </div>
        <HistoryTable items={history.slice(0, 6)} />
      </section>

      <Dialog open={modal === 'wizard'} onOpenChange={(open) => !open && closeWizard()}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-7xl">
          <DialogHeader>
            <DialogTitle>Nova Importação</DialogTitle>
          </DialogHeader>
          <WizardShell step={step} setStep={setStep} canGoNext={canGoNext(step, fileFormat, headers, validatedRows, config)}>
            {step === 1 ? <StepType type={type} setType={setType} /> : null}
            {step === 2 ? <StepTemplateDownload config={config} /> : null}
            {step === 3 ? <StepFile fileName={fileName} fileFormat={fileFormat} onFile={handleFile} /> : null}
            {step === 4 ? <StepExtract fileName={fileName} fileFormat={fileFormat} headers={headers} rows={rows} config={config} /> : null}
            {step === 5 ? <StepMapping config={config} headers={headers} mapping={mapping} setMapping={setMapping} applyAutoMapping={applyAutoMapping} /> : null}
            {step === 6 ? <StepValidation summary={summary} config={config} fileFormat={fileFormat} /> : null}
            {step === 7 ? (
              <StepPreview
                config={config}
                rows={filteredRows}
                allRows={validatedRows}
                previewFilter={previewFilter}
                setPreviewFilter={setPreviewFilter}
                search={search}
                setSearch={setSearch}
                updateCell={updateCell}
                toggleIgnore={toggleIgnore}
                resetRow={resetRow}
                setDuplicateAction={setDuplicateAction}
                downloadErrorReport={downloadErrorReport}
              />
            ) : null}
            {step === 8 ? <StepConfirm config={config} fileName={fileName} summary={summary} isPending={isPending} onConfirm={confirmImport} /> : null}
            {step === 9 ? <StepResult result={result} type={type} companyId={companyId} /> : null}
          </WizardShell>
        </DialogContent>
      </Dialog>

      <Dialog open={modal === 'templates'} onOpenChange={(open) => !open && setModal(null)}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader><DialogTitle>Modelos de Planilha</DialogTitle></DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            {importTypeConfigs.map((item) => (
              <div key={item.type} className="rounded-xl border border-[#dbe3ea] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-bold text-[#0f172a]">{item.label}</p>
                    <p className="mt-1 text-sm text-[#64748b]">{item.description}</p>
                  </div>
                  <Badge className={item.implemented ? 'bg-[#dcfce7] text-[#166534]' : 'bg-[#f1f5f9] text-[#475569]'}>{item.implemented ? 'CSV pronto' : 'preparado'}</Badge>
                </div>
                <Button className="mt-4 w-full" variant="outline" onClick={() => downloadText(`modelo-${item.type}.csv`, getTemplateCsv(item))}>
                  <Download className="h-4 w-4" />Baixar CSV
                </Button>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={modal === 'history'} onOpenChange={(open) => !open && setModal(null)}>
        <DialogContent className="sm:max-w-5xl">
          <DialogHeader><DialogTitle>Histórico de Importações</DialogTitle></DialogHeader>
          <HistoryTable items={history} />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Metric({ title, value, icon: Icon, tone = 'default' }: { title: string; value: string | number; icon: typeof Database; tone?: 'default' | 'warning' | 'danger' }) {
  const styles = {
    default: 'border-[#cbd5e1] bg-white text-[#334155]',
    warning: 'border-[#fde68a] bg-[#fefce8] text-[#854d0e]',
    danger: 'border-[#fecaca] bg-[#fef2f2] text-[#991b1b]',
  };
  return (
    <div className={cn('rounded-2xl border p-5 shadow-sm', styles[tone])}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-semibold">{title}</p>
        <Icon className="h-5 w-5 shrink-0" />
      </div>
      <p className="mt-4 text-2xl font-bold">{value}</p>
    </div>
  );
}

function InfoPanel({ title, text, icon: Icon }: { title: string; text: string; icon: typeof FileText }) {
  return (
    <div className="rounded-2xl border border-[#dbe3ea] bg-white p-5 shadow-sm">
      <Icon className="h-6 w-6 text-[#f46e11]" />
      <h3 className="mt-3 font-bold text-[#0f172a]">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-[#64748b]">{text}</p>
    </div>
  );
}

function WizardShell({ step, setStep, canGoNext, children }: { step: WizardStep; setStep: (step: WizardStep) => void; canGoNext: boolean; children: React.ReactNode }) {
  const labels = ['Tipo', 'Arquivo', 'Extração', 'Mapeamento', 'Validação', 'Correção', 'Confirmação', 'Resultado'];
  return (
    <div className="space-y-5">
      <div className="grid gap-2 md:grid-cols-9">
        {labels.map((label, index) => {
          const value = (index + 1) as WizardStep;
          return (
            <button key={label} type="button" onClick={() => value < step && setStep(value)} className={cn('rounded-xl border px-3 py-2 text-xs font-bold', value === step ? 'border-[#f46e11] bg-[#fff7ed] text-[#9a3412]' : value < step ? 'border-[#bbf7d0] bg-[#f0fdf4] text-[#166534]' : 'border-[#dbe3ea] bg-[#f8fafc] text-[#64748b]')}>
              {index + 1}. {label}
            </button>
          );
        })}
      </div>
      {children}
      {step < 8 ? (
        <div className="flex justify-end gap-2 border-t border-[#e2e8f0] pt-4">
          {step > 1 ? <Button variant="outline" onClick={() => setStep((step - 1) as WizardStep)}>Voltar</Button> : null}
          <Button disabled={!canGoNext} onClick={() => setStep((step + 1) as WizardStep)} className="bg-[#f46e11] text-white hover:bg-[#d95f0c]">Avançar</Button>
        </div>
      ) : null}
    </div>
  );
}

function StepType({ type, setType }: { type: ImportDataType; setType: (type: ImportDataType) => void }) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-xl font-bold text-[#0f172a]">Escolha o tipo de dado</h3>
        <p className="text-sm text-[#64748b]">CSV está funcional para Colaboradores, EPIs e Extintores. Os demais tipos ficam preparados para próximas etapas.</p>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {importTypeConfigs.map((item) => (
          <button key={item.type} type="button" onClick={() => setType(item.type)} className={cn('rounded-2xl border p-4 text-left transition', type === item.type ? 'border-[#f46e11] bg-[#fff7ed]' : 'border-[#dbe3ea] bg-white hover:border-[#fed7aa]')}>
            <div className="flex items-start justify-between gap-3">
              <p className="font-bold text-[#0f172a]">{item.label}</p>
              <Badge className={item.implemented ? 'bg-[#dcfce7] text-[#166534]' : 'bg-[#f1f5f9] text-[#475569]'}>{item.implemented ? 'CSV pronto' : 'preparado'}</Badge>
            </div>
            <p className="mt-2 text-sm leading-6 text-[#64748b]">{item.description}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

function StepTemplateDownload({ config }: { config: ImportTypeConfig }) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-xl font-bold text-[#0f172a]">Baixar modelo</h3>
        <p className="text-sm text-[#64748b]">Use o modelo padronizado para reduzir erros de cabeçalho, datas, campos obrigatórios e duplicidades.</p>
      </div>
      <div className="rounded-2xl border border-[#dbe3ea] bg-white p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-lg font-bold text-[#0f172a]">Modelo de {config.label}</p>
            <p className="mt-1 text-sm text-[#64748b]">{config.description}</p>
          </div>
          <Button variant="outline" onClick={() => downloadText(`modelo-${config.type}.csv`, getTemplateCsv(config))}>
            <Download className="h-4 w-4" />Baixar CSV
          </Button>
        </div>
      </div>
      <div className="rounded-2xl border border-[#fde68a] bg-[#fefce8] p-4 text-sm text-[#854d0e]">Você pode seguir sem baixar o modelo se sua planilha já estiver pronta. O mapeamento automático tentará reconhecer os cabeçalhos.</div>
    </div>
  );
}

function StepFile({ fileName, fileFormat, onFile }: { fileName: string; fileFormat: string; onFile: (file?: File) => void }) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-xl font-bold text-[#0f172a]">Escolha o arquivo</h3>
        <p className="text-sm text-[#64748b]">Para melhores resultados, utilize CSV. Arquivos PDF e Word serão tratados como extração assistida.</p>
      </div>
      <label className="grid min-h-64 cursor-pointer place-items-center rounded-2xl border-2 border-dashed border-[#fed7aa] bg-[#fff7ed] p-8 text-center">
        <input type="file" accept=".csv,.xlsx,.xls,.pdf,.doc,.docx" className="hidden" onChange={(event) => onFile(event.target.files?.[0])} />
        <span>
          <Upload className="mx-auto h-10 w-10 text-[#f46e11]" />
          <strong className="mt-3 block text-lg text-[#0f172a]">Clique para selecionar CSV, Excel, PDF ou Word</strong>
          <span className="mt-2 block text-sm text-[#64748b]">Limite recomendado: até 8 MB.</span>
        </span>
      </label>
      {fileName ? <div className="rounded-xl border border-[#dbe3ea] bg-white p-4 text-sm"><strong>{fileName}</strong> <span className="text-[#64748b]">({fileFormat.toUpperCase()})</span></div> : null}
    </div>
  );
}

function StepExtract({ fileName, fileFormat, headers, rows, config }: { fileName: string; fileFormat: string; headers: string[]; rows: ImportRow[]; config: ImportTypeConfig }) {
  const assisted = isAssistedDocument(fileFormat) || (isStructuredSpreadsheet(fileFormat) && fileFormat !== 'csv');
  return (
    <div className="space-y-4">
      <h3 className="text-xl font-bold text-[#0f172a]">Leitura e extração</h3>
      {fileFormat === 'csv' ? (
        <div className="grid gap-4 md:grid-cols-3">
          <Metric title="Arquivo" value={fileName || '-'} icon={FileSpreadsheet} />
          <Metric title="Colunas encontradas" value={headers.length} icon={Database} />
          <Metric title="Linhas encontradas" value={rows.length} icon={CheckCircle2} />
        </div>
      ) : null}
      {assisted ? (
        <div className="rounded-2xl border border-[#fde68a] bg-[#fefce8] p-5 text-[#854d0e]">
          <h4 className="font-bold">Extração assistida em preparação</h4>
          <p className="mt-2 text-sm leading-6">O arquivo {fileFormat.toUpperCase()} foi aceito, mas não será importado automaticamente. Escolha o tipo de documento, revise o conteúdo extraído e use CSV quando quiser salvar registros em massa nesta versão.</p>
          <div className="mt-4 max-w-md">
            <Select value={config.type} disabled>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value={config.type}>{config.label}</SelectItem></SelectContent>
            </Select>
          </div>
        </div>
      ) : null}
      {fileFormat === 'csv' ? (
        <div className="rounded-2xl border border-[#dbe3ea] bg-white p-4">
          <p className="mb-3 font-semibold text-[#0f172a]">Cabeçalhos detectados</p>
          <div className="flex flex-wrap gap-2">{headers.map((header) => <Badge key={header} className="border border-[#cbd5e1] bg-[#f8fafc] text-[#334155]">{header}</Badge>)}</div>
        </div>
      ) : null}
    </div>
  );
}

function StepMapping({ config, headers, mapping, setMapping, applyAutoMapping }: { config: ImportTypeConfig; headers: string[]; mapping: Record<string, string>; setMapping: (mapping: Record<string, string>) => void; applyAutoMapping: () => void }) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-xl font-bold text-[#0f172a]">Mapear campos</h3>
          <p className="text-sm text-[#64748b]">Relacione cada campo do sistema com uma coluna do arquivo.</p>
        </div>
        <Button variant="outline" onClick={applyAutoMapping}>Aplicar mapeamento automático</Button>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {config.fields.map((field) => (
          <label key={field.key} className="rounded-xl border border-[#dbe3ea] bg-white p-3 text-sm">
            <span className="mb-2 flex items-center justify-between gap-2 font-semibold text-[#334155]">
              {field.label}
              {field.required ? <Badge className="bg-[#fef2f2] text-[#991b1b]">obrigatório</Badge> : null}
            </span>
            <Select value={mapping[field.key] || 'none'} onValueChange={(value) => setMapping({ ...mapping, [field.key]: value === 'none' ? '' : value })}>
              <SelectTrigger><SelectValue placeholder="Selecione a coluna" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Não importar</SelectItem>
                {headers.map((header) => <SelectItem key={header} value={header}>{header}</SelectItem>)}
              </SelectContent>
            </Select>
          </label>
        ))}
      </div>
    </div>
  );
}

function StepValidation({ summary, config, fileFormat }: { summary: ReturnType<typeof summarizeRows>; config: ImportTypeConfig; fileFormat: string }) {
  return (
    <div className="space-y-4">
      <h3 className="text-xl font-bold text-[#0f172a]">Validação dos dados</h3>
      <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Metric title="Total de linhas" value={summary.total} icon={Database} />
        <Metric title="Válidas" value={summary.valid} icon={CheckCircle2} />
        <Metric title="Com aviso" value={summary.warning} icon={AlertTriangle} tone="warning" />
        <Metric title="Com erro" value={summary.error} icon={XCircle} tone="danger" />
        <Metric title="Duplicadas" value={summary.duplicates} icon={FileArchive} tone="warning" />
        <Metric title="Ignoradas" value={summary.ignored} icon={XCircle} />
      </div>
      {!config.implemented || fileFormat !== 'csv' ? (
        <div className="rounded-2xl border border-[#fde68a] bg-[#fefce8] p-4 text-sm text-[#854d0e]">Este tipo/formato está preparado para revisão, mas o salvamento em massa nesta etapa está habilitado para CSV de Colaboradores, EPIs e Extintores.</div>
      ) : null}
    </div>
  );
}

function StepPreview({
  config,
  rows,
  allRows,
  previewFilter,
  setPreviewFilter,
  search,
  setSearch,
  updateCell,
  toggleIgnore,
  resetRow,
  setDuplicateAction,
  downloadErrorReport,
}: {
  config: ImportTypeConfig;
  rows: ValidatedRow[];
  allRows: ValidatedRow[];
  previewFilter: PreviewFilter;
  setPreviewFilter: (value: PreviewFilter) => void;
  search: string;
  setSearch: (value: string) => void;
  updateCell: (rowId: string, fieldKey: string, value: string) => void;
  toggleIgnore: (rowId: string) => void;
  resetRow: (rowId: string) => void;
  setDuplicateAction: (rowId: string, duplicateAction: DuplicateAction) => void;
  downloadErrorReport: () => void;
}) {
  const visibleFields = config.fields.filter((field) => field.required || allRows.some((row) => row.values[field.key]));
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-xl font-bold text-[#0f172a]">Corrigir e revisar</h3>
          <p className="text-sm text-[#64748b]">Edite células, ignore linhas e resolva duplicidades antes de confirmar.</p>
        </div>
        <Button variant="outline" onClick={downloadErrorReport}>Baixar relatório de erros</Button>
      </div>
      <div className="flex flex-wrap gap-2 rounded-2xl border border-[#dbe3ea] bg-white p-3">
        <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar dentro da importação..." className="max-w-sm" />
        <Select value={previewFilter} onValueChange={(value) => setPreviewFilter(value as PreviewFilter)}>
          <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todas as linhas</SelectItem>
            <SelectItem value="valid">Apenas válidas</SelectItem>
            <SelectItem value="warning">Apenas avisos</SelectItem>
            <SelectItem value="error">Apenas erros</SelectItem>
            <SelectItem value="duplicate">Apenas duplicados</SelectItem>
            <SelectItem value="ignored">Ignoradas</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="overflow-x-auto rounded-2xl border border-[#dbe3ea] bg-white">
        <table className="w-full min-w-[1100px] text-left text-sm">
          <thead className="bg-[#f8fafc] text-xs uppercase text-[#64748b]">
            <tr>
              <th className="p-3">Linha</th>
              <th className="p-3">Status</th>
              {visibleFields.map((field) => <th key={field.key} className="min-w-44 p-3">{field.label}</th>)}
              <th className="p-3">Problemas</th>
              <th className="p-3">Ações</th>
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, 50).map((row) => (
              <tr key={row.id} className={cn('border-t align-top', row.ignored && 'opacity-60')}>
                <td className="p-3 font-semibold">{row.line}</td>
                <td className="p-3"><RowBadge row={row} /></td>
                {visibleFields.map((field) => (
                  <td key={field.key} className="p-2">
                    <Input value={row.values[field.key] || ''} onChange={(event) => updateCell(row.id, field.key, event.target.value)} className={cn(row.errors.some((error) => error.includes(field.label)) && 'border-[#ef4444]')} />
                  </td>
                ))}
                <td className="max-w-sm p-3 text-xs">
                  {row.errors.map((error) => <p key={error} className="text-[#991b1b]">{error}</p>)}
                  {row.warnings.map((warning) => <p key={warning} className="text-[#854d0e]">{warning}</p>)}
                  {row.duplicate ? (
                    <Select value={row.duplicateAction || 'ignore'} onValueChange={(value) => setDuplicateAction(row.id, value as DuplicateAction)}>
                      <SelectTrigger className="mt-2 h-8"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ignore">Ignorar duplicado</SelectItem>
                        <SelectItem value="update">Atualizar existente</SelectItem>
                        <SelectItem value="create_new">Criar novo se permitido</SelectItem>
                        <SelectItem value="manual">Corrigir manualmente</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : null}
                </td>
                <td className="p-3">
                  <div className="flex gap-1">
                    <Button size="sm" variant="outline" onClick={() => toggleIgnore(row.id)}>{row.ignored ? 'Reativar' : 'Ignorar'}</Button>
                    <Button size="icon" variant="ghost" onClick={() => resetRow(row.id)} title="Restaurar"><RotateCcw className="h-4 w-4" /></Button>
                  </div>
                </td>
              </tr>
            ))}
            {!rows.length ? <tr><td colSpan={visibleFields.length + 4} className="p-8 text-center text-[#64748b]">Nenhuma linha encontrada para o filtro selecionado.</td></tr> : null}
          </tbody>
        </table>
      </div>
      {rows.length > 50 ? <p className="text-sm text-[#64748b]">Mostrando as primeiras 50 linhas filtradas para manter a tela leve.</p> : null}
    </div>
  );
}

function StepConfirm({ config, fileName, summary, isPending, onConfirm }: { config: ImportTypeConfig; fileName: string; summary: ReturnType<typeof summarizeRows>; isPending: boolean; onConfirm: () => void }) {
  return (
    <div className="space-y-5">
      <h3 className="text-xl font-bold text-[#0f172a]">Confirmar importação</h3>
      <div className="rounded-2xl border border-[#dbe3ea] bg-white p-5">
        <div className="grid gap-3 md:grid-cols-2">
          <Info label="Tipo de importação" value={config.label} />
          <Info label="Arquivo" value={fileName || '-'} />
          <Info label="Total de linhas" value={String(summary.total)} />
          <Info label="Linhas válidas" value={String(summary.valid)} />
          <Info label="Linhas com aviso" value={String(summary.warning)} />
          <Info label="Linhas com erro" value={String(summary.error)} />
          <Info label="Duplicados encontrados" value={String(summary.duplicates)} />
          <Info label="Linhas ignoradas" value={String(summary.ignored)} />
        </div>
      </div>
      <div className="rounded-2xl border border-[#fde68a] bg-[#fefce8] p-4 text-sm text-[#854d0e]">Confira os dados antes de confirmar. Após a importação, os registros válidos serão salvos no sistema.</div>
      <div className="flex justify-end">
        <Button onClick={onConfirm} disabled={isPending} className="bg-[#f46e11] text-white hover:bg-[#d95f0c]">
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
          Confirmar importação
        </Button>
      </div>
    </div>
  );
}

function StepResult({ result, type, companyId }: { result: ImportResult | null; type: ImportDataType; companyId: string }) {
  const targetSection = type === 'collaborators' ? 'collaborators' : type === 'epis' ? 'epiDeliveries' : type === 'extinguishers' ? 'fireExtinguishers' : 'settings';
  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-[#bbf7d0] bg-[#f0fdf4] p-6 text-[#166534]">
        <CheckCircle2 className="h-8 w-8" />
        <h3 className="mt-3 text-xl font-bold">Importação finalizada</h3>
        <p className="mt-2 text-sm">Registros criados: {result?.created || 0}. Ignorados: {result?.ignored || 0}. Falhas: {result?.failed || 0}.</p>
      </div>
      {result?.messages.length ? (
        <div className="rounded-2xl border border-[#fecaca] bg-[#fef2f2] p-4 text-sm text-[#991b1b]">
          {result.messages.slice(0, 8).map((message) => <p key={message}>{message}</p>)}
        </div>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline"><a href={`/company/${companyId}?section=${targetSection}`}>Ver registros importados</a></Button>
        <Button variant="outline" onClick={() => downloadText('resultado-importacao.txt', JSON.stringify(result, null, 2), 'text/plain;charset=utf-8')}>Baixar relatório</Button>
      </div>
    </div>
  );
}

function RowBadge({ row }: { row: ValidatedRow }) {
  if (row.ignored) return <Badge className="bg-[#f1f5f9] text-[#475569]">ignorada</Badge>;
  if (row.state === 'valid') return <Badge className="bg-[#dcfce7] text-[#166534]">válida</Badge>;
  if (row.state === 'warning') return <Badge className="bg-[#fef3c7] text-[#92400e]">aviso</Badge>;
  return <Badge className="bg-[#fee2e2] text-[#991b1b]">erro</Badge>;
}

function DataDictionaryPreview() {
  const bases = importTypeConfigs.filter((item) => ['collaborators', 'epis', 'extinguishers', 'trainings', 'costs'].includes(item.type));
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {bases.map((base) => (
        <div key={base.type} className="rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-4">
          <p className="font-bold text-[#0f172a]">Base: {base.label}</p>
          <div className="mt-3 space-y-2">
            {base.fields.slice(0, 5).map((field) => (
              <div key={field.key} className="rounded-lg bg-white p-3 text-sm">
                <p className="font-semibold text-[#334155]">{field.key}</p>
                <p className="text-[#64748b]">{field.label}. Tipo: {field.type || 'texto'}. Exemplo: {getExampleForField(field, base)}.</p>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function HistoryTable({ items }: { items: ImportHistoryItem[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-[#e2e8f0]">
      <table className="w-full min-w-[760px] text-left text-sm">
        <thead className="bg-[#f8fafc] text-xs uppercase text-[#64748b]">
          <tr><th className="p-3">Tipo</th><th className="p-3">Arquivo</th><th className="p-3">Status</th><th className="p-3">Linhas</th><th className="p-3">Importadas</th><th className="p-3">Erros</th><th className="p-3">Data</th></tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className="border-t">
              <td className="p-3">{getImportConfig(item.tipo_importacao).label}</td>
              <td className="p-3">{item.nome_arquivo}</td>
              <td className="p-3"><Badge className="bg-[#f1f5f9] text-[#334155]">{item.status.replace(/_/g, ' ')}</Badge></td>
              <td className="p-3">{item.total_linhas}</td>
              <td className="p-3">{item.linhas_importadas}</td>
              <td className="p-3">{item.linhas_com_erro}</td>
              <td className="p-3">{new Date(item.data_importacao).toLocaleString('pt-BR')}</td>
            </tr>
          ))}
          {!items.length ? <tr><td colSpan={7} className="p-8 text-center text-[#64748b]">Nenhuma importação foi gerada ainda.</td></tr> : null}
        </tbody>
      </table>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-3"><p className="text-xs uppercase text-[#64748b]">{label}</p><p className="mt-1 font-semibold text-[#0f172a]">{value}</p></div>;
}

function canGoNext(step: WizardStep, fileFormat: string, headers: string[], rows: ValidatedRow[], config: ImportTypeConfig) {
  if (step === 1) return Boolean(config);
  if (step === 2) return true;
  if (step === 3) return Boolean(fileFormat);
  if (step === 4) return fileFormat !== 'csv' || (headers.length > 0 && rows.length > 0);
  if (step === 5) return fileFormat !== 'csv' || config.fields.filter((field) => field.required).every((field) => rows.some((row) => row.values[field.key]));
  if (step === 6) return true;
  if (step === 7) return true;
  return true;
}

function summarizeRows(rows: ValidatedRow[]) {
  const activeRows = rows.filter((row) => !row.ignored);
  return {
    total: rows.length,
    valid: activeRows.filter((row) => row.state === 'valid').length,
    warning: activeRows.filter((row) => row.state === 'warning').length,
    error: activeRows.filter((row) => row.state === 'error').length,
    ignored: rows.filter((row) => row.ignored || row.duplicateAction === 'ignore').length,
    duplicates: activeRows.filter((row) => row.duplicate).length,
  };
}

function validateRow(row: ImportRow, config: ImportTypeConfig, mapping: Record<string, string>, existing: { collaborators: Collaborator[]; epis: Epi[]; extinguishers: FireExtinguisher[] }): ValidatedRow {
  const values = config.fields.reduce<Record<string, string>>((acc, field) => {
    const source = mapping[field.key];
    const rawValue = row.edits[field.key] ?? (source ? row.raw[source] : '');
    acc[field.key] = normalizeFieldValue(field, rawValue || '');
    return acc;
  }, {});
  const errors: string[] = [];
  const warnings: string[] = [];

  config.fields.forEach((field) => {
    const value = values[field.key] || '';
    if (field.required && !value.trim()) errors.push(`${field.label}: obrigatório.`);
    if (field.type === 'cpf' && value.trim() && !isValidCpf(value)) errors.push(`${field.label}: CPF inválido.`);
    if (field.type === 'email' && value.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) errors.push(`${field.label}: e-mail inválido.`);
    if (field.type === 'date' && value.trim() && !isValidDateValue(value)) errors.push(`${field.label}: data inválida.`);
    if (field.type === 'number' && value.trim() && normalizeNumber(value) === undefined) errors.push(`${field.label}: número inválido.`);
  });

  let duplicate = false;
  if (config.type === 'collaborators' && values.cpf) {
    duplicate = existing.collaborators.some((item) => onlyDigits(item.cpf) === onlyDigits(values.cpf));
  }
  if (config.type === 'epis' && values.nome) {
    duplicate = existing.epis.some((item) => item.nome.trim().toLowerCase() === values.nome.trim().toLowerCase() && (!values.ca || item.ca === values.ca));
  }
  if (config.type === 'extinguishers' && values.codigo) {
    duplicate = existing.extinguishers.some((item) => item.codigo.trim().toLowerCase() === values.codigo.trim().toLowerCase());
  }
  if (duplicate) warnings.push('Possível duplicidade encontrada. A linha será ignorada por padrão.');

  const state: RowState = row.ignored ? 'ignored' : errors.length ? 'error' : warnings.length ? 'warning' : 'valid';
  return { ...row, values, errors, warnings, duplicate, duplicateAction: row.duplicateAction || (duplicate ? 'ignore' : 'create_new'), state };
}

function normalizeFieldValue(field: ImportField, value: string) {
  if (field.type === 'date') return normalizeDate(value);
  return value.trim();
}

function collaboratorPayload(values: Record<string, string>, companyId: string) {
  return {
    companyId,
    nome_completo: values.nome_completo,
    cpf: values.cpf,
    rg: values.rg || '',
    data_nascimento: values.data_nascimento || '',
    telefone: values.telefone || '',
    email: values.email || '',
    endereco: values.endereco || '',
    foto_url: '',
    matricula: values.matricula || '',
    empresa: values.empresa || '',
    setor: values.setor,
    funcao: values.funcao,
    data_admissao: values.data_admissao || '',
    tipo_contrato: values.tipo_contrato || '',
    status: normalizeStatus(values.status) as 'ativo' | 'afastado' | 'desligado',
    gestor_responsavel: values.gestor_responsavel || '',
    local_trabalho: values.local_trabalho || '',
    turno_trabalho: values.turno_trabalho || '',
    atividades_realizadas: values.atividades_realizadas || '',
    riscos_associados: values.riscos_associados || '',
    aso_validade: values.aso_validade || '',
    observacoes_seguranca: '',
    observacoes_gerais: values.observacoes_gerais || '',
  };
}

function epiPayload(values: Record<string, string>, companyId: string) {
  return {
    companyId,
    nome: values.nome,
    descricao: values.descricao || '',
    categoria: values.categoria || '',
    ca: values.ca || '',
    validade_ca: values.validade_ca || '',
    valor_unitario: normalizeNumber(values.valor_unitario || '') || 0,
    fornecedor: values.fornecedor || '',
    data_compra: '',
    prazo_troca_dias: normalizeNumber(values.prazo_troca_dias || '') || 0,
    ativo: parseBooleanValue(values.ativo || 'Sim', true),
  };
}

function extinguisherPayload(values: Record<string, string>, companyId: string, nowIso: string): FireExtinguisher {
  const item: FireExtinguisher = {
    id: uid('ext-import'),
    companyId,
    codigo: values.codigo,
    numero_patrimonial: values.numero_patrimonial || '',
    unidade: values.unidade || '',
    area: values.area,
    localizacao_descritiva: values.localizacao_descritiva || '',
    tipo_agente: values.tipo_agente,
    capacidade: values.capacidade || '',
    classe_fogo: values.classe_fogo || '',
    fabricante: values.fabricante || '',
    modelo: values.modelo || '',
    numero_serie: values.numero_serie || '',
    data_fabricacao: values.data_fabricacao || '',
    data_ultima_recarga: values.data_ultima_recarga || '',
    data_proxima_recarga: values.data_proxima_recarga || '',
    data_validade: values.data_validade || '',
    data_ultima_inspecao: values.data_ultima_inspecao || '',
    frequencia_inspecao_dias: normalizeNumber(values.frequencia_inspecao_dias || '') || 30,
    status: 'sem_dados',
    empresa_manutencao: values.empresa_manutencao || '',
    fornecedor: values.fornecedor || '',
    observacoes: values.observacoes || '',
    created_at: nowIso,
    updated_at: nowIso,
  };
  return { ...item, status: calculateExtinguisherStatus(item, []) };
}

function buildHistoryItem(type: ImportDataType, fileName: string, fileFormat: string, total: number, valid: number, errors: number, imported: number, ignored: number, status: ImportHistoryItem['status']): ImportHistoryItem {
  return {
    id: uid('import'),
    tipo_importacao: type,
    nome_arquivo: fileName || 'arquivo não informado',
    formato_arquivo: fileFormat || '-',
    status,
    total_linhas: total,
    linhas_validas: valid,
    linhas_com_erro: errors,
    linhas_importadas: imported,
    linhas_ignoradas: ignored,
    data_importacao: dateTime(),
  };
}
