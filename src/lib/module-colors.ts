export type ModuleColorKey =
  | 'dashboard'
  | 'aprs'
  | 'colaboradores'
  | 'epis'
  | 'treinamentos'
  | 'inspecoes'
  | 'naoConformidades'
  | 'incidentes'
  | 'extintores'
  | 'custos'
  | 'relatorios'
  | 'documentos'
  | 'importacoes'
  | 'administracao';

export type ModuleColorToken = {
  primary: string;
  soft: string;
  border: string;
  text: string;
  icon: string;
  chart: string;
  dark: string;
};

export const moduleColors: Record<ModuleColorKey, ModuleColorToken> = {
  dashboard: {
    primary: '#2563eb',
    soft: '#eff6ff',
    border: '#bfdbfe',
    text: '#1e3a8a',
    icon: '#2563eb',
    chart: '#3b82f6',
    dark: '#1d4ed8',
  },
  aprs: {
    primary: '#92400e',
    soft: '#fffbeb',
    border: '#fde68a',
    text: '#78350f',
    icon: '#b45309',
    chart: '#d97706',
    dark: '#78350f',
  },
  colaboradores: {
    primary: '#4f46e5',
    soft: '#eef2ff',
    border: '#c7d2fe',
    text: '#3730a3',
    icon: '#4f46e5',
    chart: '#6366f1',
    dark: '#3730a3',
  },
  epis: {
    primary: '#15803d',
    soft: '#f0fdf4',
    border: '#bbf7d0',
    text: '#166534',
    icon: '#16a34a',
    chart: '#22c55e',
    dark: '#14532d',
  },
  treinamentos: {
    primary: '#7e22ce',
    soft: '#faf5ff',
    border: '#e9d5ff',
    text: '#6b21a8',
    icon: '#9333ea',
    chart: '#a855f7',
    dark: '#581c87',
  },
  inspecoes: {
    primary: '#0891b2',
    soft: '#ecfeff',
    border: '#a5f3fc',
    text: '#155e75',
    icon: '#0891b2',
    chart: '#06b6d4',
    dark: '#164e63',
  },
  naoConformidades: {
    primary: '#ea580c',
    soft: '#fff7ed',
    border: '#fed7aa',
    text: '#9a3412',
    icon: '#f97316',
    chart: '#f97316',
    dark: '#7c2d12',
  },
  incidentes: {
    primary: '#dc2626',
    soft: '#fef2f2',
    border: '#fecaca',
    text: '#991b1b',
    icon: '#dc2626',
    chart: '#ef4444',
    dark: '#7f1d1d',
  },
  extintores: {
    primary: '#c2410c',
    soft: '#fff7ed',
    border: '#fed7aa',
    text: '#9a3412',
    icon: '#dc2626',
    chart: '#ea580c',
    dark: '#7c2d12',
  },
  custos: {
    primary: '#ca8a04',
    soft: '#fefce8',
    border: '#fde68a',
    text: '#854d0e',
    icon: '#ca8a04',
    chart: '#eab308',
    dark: '#713f12',
  },
  relatorios: {
    primary: '#334155',
    soft: '#f1f5f9',
    border: '#cbd5e1',
    text: '#1e293b',
    icon: '#334155',
    chart: '#475569',
    dark: '#0f172a',
  },
  documentos: {
    primary: '#475569',
    soft: '#f8fafc',
    border: '#dbe3ea',
    text: '#334155',
    icon: '#475569',
    chart: '#64748b',
    dark: '#1e293b',
  },
  importacoes: {
    primary: '#0f766e',
    soft: '#f0fdfa',
    border: '#99f6e4',
    text: '#115e59',
    icon: '#0f766e',
    chart: '#14b8a6',
    dark: '#134e4a',
  },
  administracao: {
    primary: '#64748b',
    soft: '#f8fafc',
    border: '#dbe3ea',
    text: '#334155',
    icon: '#64748b',
    chart: '#64748b',
    dark: '#1e293b',
  },
};

export function getModuleColor(module: ModuleColorKey | string | undefined): ModuleColorToken {
  if (module && module in moduleColors) {
    return moduleColors[module as ModuleColorKey];
  }

  return moduleColors.dashboard;
}

export function moduleColorForSection(section: string | undefined): ModuleColorKey {
  switch (section) {
    case 'dashboardGeneral':
      return 'dashboard';
    case 'works':
    case 'employees':
    case 'jobRoles':
    case 'subcontractors':
      return 'aprs';
    case 'collaborators':
      return 'colaboradores';
    case 'epiDeliveries':
      return 'epis';
    case 'trainings':
      return 'treinamentos';
    case 'inspections':
      return 'inspecoes';
    case 'nonconformities':
      return 'naoConformidades';
    case 'incidents':
      return 'incidentes';
    case 'fireExtinguishers':
      return 'extintores';
    case 'costsPrevention':
      return 'custos';
    case 'settings':
      return 'administracao';
    case 'dataImports':
      return 'importacoes';
    default:
      return 'dashboard';
  }
}

export function moduleColorForLabel(label: string | undefined): ModuleColorKey {
  const normalized = (label || '').toLowerCase();

  if (normalized.includes('colaborador')) return 'colaboradores';
  if (normalized.includes('epi')) return 'epis';
  if (normalized.includes('treinamento') || normalized.includes('certificado')) return 'treinamentos';
  if (normalized.includes('inspe')) return 'inspecoes';
  if (normalized.includes('conformidade') || normalized.includes('nc')) return 'naoConformidades';
  if (normalized.includes('incidente') || normalized.includes('acidente') || normalized.includes('acao preventiva')) return 'incidentes';
  if (normalized.includes('extintor') || normalized.includes('incendio') || normalized.includes('recarga')) return 'extintores';
  if (normalized.includes('custo') || normalized.includes('prevencao')) return 'custos';
  if (normalized.includes('relat')) return 'relatorios';
  if (normalized.includes('document')) return 'documentos';
  if (normalized.includes('import')) return 'importacoes';
  if (normalized.includes('apr') || normalized.includes('pt') || normalized.includes('obra') || normalized.includes('funcion') || normalized.includes('cargo') || normalized.includes('terceir')) return 'aprs';

  return 'dashboard';
}

export function moduleColorForChartModule(module: string | undefined): ModuleColorKey {
  switch (module) {
    case 'colaboradores':
      return 'colaboradores';
    case 'epis':
      return 'epis';
    case 'treinamentos':
      return 'treinamentos';
    case 'inspecoes':
      return 'inspecoes';
    case 'naoConformidades':
      return 'naoConformidades';
    case 'incidentes':
      return 'incidentes';
    case 'custos':
      return 'custos';
    default:
      return 'dashboard';
  }
}

export function moduleBadgeStyle(module: ModuleColorKey | string | undefined) {
  const color = getModuleColor(module);
  return {
    backgroundColor: color.soft,
    borderColor: color.border,
    color: color.text,
  };
}
