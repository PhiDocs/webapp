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
    primary: '#111111',
    soft: '#f2f1ed',
    border: '#cfcbc0',
    text: '#111111',
    icon: '#111111',
    chart: '#111111',
    dark: '#111111',
  },
  aprs: {
    primary: '#7a1f1f',
    soft: '#faf3e4',
    border: '#e8d9ae',
    text: '#8a5a00',
    icon: '#8a5a00',
    chart: '#8a5a00',
    dark: '#8a5a00',
  },
  colaboradores: {
    primary: '#111111',
    soft: '#f7f5f0',
    border: '#e3e0d8',
    text: '#111111',
    icon: '#111111',
    chart: '#cfcbc0',
    dark: '#111111',
  },
  epis: {
    primary: '#1b5e3f',
    soft: '#eaf2ed',
    border: '#dde9e2',
    text: '#1b5e3f',
    icon: '#1b5e3f',
    chart: '#1b5e3f',
    dark: '#1b5e3f',
  },
  treinamentos: {
    primary: '#111111',
    soft: '#f7f5f0',
    border: '#f7f5f0',
    text: '#111111',
    icon: '#111111',
    chart: '#cfcbc0',
    dark: '#111111',
  },
  inspecoes: {
    primary: '#111111',
    soft: '#f7f5f0',
    border: '#e3e0d8',
    text: '#111111',
    icon: '#111111',
    chart: '#111111',
    dark: '#111111',
  },
  naoConformidades: {
    primary: '#7a1f1f',
    soft: '#f7f5f0',
    border: '#e3e0d8',
    text: '#7a1f1f',
    icon: '#8a5a00',
    chart: '#8a5a00',
    dark: '#7a1f1f',
  },
  incidentes: {
    primary: '#7a1f1f',
    soft: '#f6edec',
    border: '#e4cfcc',
    text: '#7a1f1f',
    icon: '#7a1f1f',
    chart: '#7a1f1f',
    dark: '#7a1f1f',
  },
  extintores: {
    primary: '#7a1f1f',
    soft: '#f7f5f0',
    border: '#e3e0d8',
    text: '#7a1f1f',
    icon: '#7a1f1f',
    chart: '#7a1f1f',
    dark: '#7a1f1f',
  },
  custos: {
    primary: '#8a5a00',
    soft: '#faf3e4',
    border: '#e8d9ae',
    text: '#8a5a00',
    icon: '#8a5a00',
    chart: '#8a5a00',
    dark: '#8a5a00',
  },
  relatorios: {
    primary: '#111111',
    soft: '#f2f1ed',
    border: '#cfcbc0',
    text: '#111111',
    icon: '#111111',
    chart: '#6e6a61',
    dark: '#111111',
  },
  documentos: {
    primary: '#6e6a61',
    soft: '#f7f5f0',
    border: '#e3e0d8',
    text: '#111111',
    icon: '#6e6a61',
    chart: '#6e6a61',
    dark: '#111111',
  },
  importacoes: {
    primary: '#111111',
    soft: '#eaf2ed',
    border: '#dde9e2',
    text: '#111111',
    icon: '#111111',
    chart: '#1b5e3f',
    dark: '#111111',
  },
  administracao: {
    primary: '#6e6a61',
    soft: '#f7f5f0',
    border: '#e3e0d8',
    text: '#111111',
    icon: '#6e6a61',
    chart: '#6e6a61',
    dark: '#111111',
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
