'use client';

import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import {
  Bell,
  BarChart3,
  Briefcase,
  ChevronDown,
  CircleHelp,
  ClipboardCheck,
  Coins,
  FileText,
  FileUp,
  Flame,
  GraduationCap,
  HardHat,
  LogOut,
  Menu,
  PackageCheck,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Settings,
  Shield,
  ShieldAlert,
  Siren,
  UserCog,
  UserRound,
  Users,
  X,
} from 'lucide-react';
import { TeamAccess } from '@/components/admin/team-access';
import { UserNav } from '@/components/auth/user-nav';
import { useSession } from '@/components/auth/session-provider';
import { Logo } from '@/components/icons/logo';
import { getCompanyById } from '@/server/company-actions';
import type { Company } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { signOut } from '@/server/auth-actions';
import { createSupabaseBrowserClient } from '@/supabase/browser';
import { cn } from '@/lib/utils';
import { getModuleColor, moduleColorForSection, type ModuleColorKey } from '@/lib/module-colors';
import { navigateCompanySection } from '@/lib/client-navigation';

type AdminSection = 'teamAccess' | 'works' | 'dashboardGeneral' | 'collaborators' | 'epiDeliveries' | 'trainings' | 'inspections' | 'fireExtinguishers' | 'incidents' | 'costsPrevention' | 'nonconformities' | 'employees' | 'jobRoles' | 'subcontractors' | 'dataImports' | 'settings';
type SectionNavigationEvent = CustomEvent<{ section: AdminSection; filters?: Record<string, string> }>;

const adminSections: Array<{
  value: AdminSection;
  label: string;
  icon: typeof Briefcase;
  description: string;
  roles?: string[];
}> = [
  { value: 'teamAccess', label: 'Acessos', icon: Users, description: 'Libere quem pode entrar no sistema e veja quem ja tem acesso.', roles: ['admin'] },
  { value: 'works', label: 'Obras', icon: HardHat, description: 'Gerencie obras usadas em APRs e permissoes.', roles: ['admin', 'tecnico'] },
  { value: 'dashboardGeneral', label: 'Central de Seguranca', icon: BarChart3, description: 'Veja indicadores gerais de seguranca.', roles: ['admin', 'tecnico', 'gestor'] },
  { value: 'collaborators', label: 'Colaboradores', icon: UserRound, description: 'Cadastre e acompanhe colaboradores.', roles: ['admin', 'rh', 'tecnico'] },
  { value: 'epiDeliveries', label: 'Entregas de EPI', icon: PackageCheck, description: 'Controle EPIs entregues, pendentes e vencidos.', roles: ['admin', 'tecnico'] },
  { value: 'trainings', label: 'Treinamentos', icon: GraduationCap, description: 'Controle treinamentos, certificados e vencimentos.', roles: ['admin', 'rh', 'tecnico'] },
  { value: 'inspections', label: 'Inspecoes', icon: ClipboardCheck, description: 'Realize checklists e inspecoes em campo.', roles: ['admin', 'tecnico'] },
  { value: 'fireExtinguishers', label: 'Extintores', icon: Flame, description: 'Controle vencimentos, recargas, inspecoes e mapa de extintores.', roles: ['admin', 'tecnico', 'gestor'] },
  { value: 'incidents', label: 'Incidentes', icon: Siren, description: 'Registre e investigue ocorrencias.', roles: ['admin', 'tecnico', 'gestor'] },
  { value: 'costsPrevention', label: 'Custos & Prevencao', icon: Coins, description: 'Acompanhe custos e oportunidades de prevencao.', roles: ['admin', 'gestor'] },
  { value: 'nonconformities', label: 'Nao Conformidades', icon: ShieldAlert, description: 'Acompanhe desvios, correcoes e prazos.', roles: ['admin', 'tecnico'] },
  { value: 'employees', label: 'Funcionarios APR/PT', icon: Users, description: 'Gerencie funcionarios usados em APRs e PTs.', roles: ['admin'] },
  { value: 'jobRoles', label: 'Cargos', icon: Shield, description: 'Mantenha funcoes e responsabilidades.', roles: ['admin'] },
  { value: 'subcontractors', label: 'Terceirizadas', icon: UserCog, description: 'Gerencie empresas terceirizadas.', roles: ['admin'] },
  { value: 'dataImports', label: 'Importacao de Dados', icon: FileUp, description: 'Importe planilhas e documentos com revisao antes de salvar.', roles: ['admin', 'tecnico', 'rh'] },
  { value: 'settings', label: 'Configuracoes', icon: Settings, description: 'Configure empresa e integracoes.', roles: ['admin'] },
];

const getSection = (value: AdminSection) => adminSections.find((section) => section.value === value)!;

type NavigationItem =
  | { type: 'section'; section: AdminSection; label?: string; description?: string; icon?: typeof Briefcase; module?: ModuleColorKey; keywords?: string[]; roles?: string[] }
  | { type: 'link'; label: string; href: string; icon: typeof Briefcase; description: string; module: ModuleColorKey; keywords?: string[]; roles?: string[] };

const navigationGroups: Array<{ id: string; title: string; defaultOpen: boolean; items: NavigationItem[] }> = [
  {
    id: 'aprs',
    title: 'APRs e PTs',
    defaultOpen: true,
    items: [
      { type: 'link', label: 'APRs e PTs', href: '/reports', icon: FileText, module: 'aprs', description: 'Gere APRs, PTs e documentos de seguranca.', roles: ['admin', 'tecnico'], keywords: ['apr', 'pt', 'permissao', 'documento'] },
    ],
  },
  {
    id: 'equipe',
    title: 'Equipe',
    defaultOpen: true,
    items: [{ type: 'section', section: 'teamAccess' }],
  },
  {
    id: 'extintores',
    title: 'Extintores',
    defaultOpen: true,
    items: [{ type: 'section', section: 'fireExtinguishers' }],
  },
];

function SectionLoading() {
  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-[#cfcbc0] bg-white p-6 shadow-sm">
        <Skeleton className="h-8 w-72 rounded-lg" />
        <Skeleton className="mt-3 h-5 w-[34rem] max-w-full rounded-lg" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <Skeleton key={index} className="h-32 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-80 rounded-2xl" />
    </div>
  );
}

const WorksTable = dynamic(() => import('@/components/admin/works-table').then((mod) => mod.WorksTable), { loading: SectionLoading });
const SafetyDashboardGeneral = dynamic(() => import('@/components/admin/safety-dashboard-general').then((mod) => mod.SafetyDashboardGeneral), { loading: SectionLoading });
const CollaboratorsTable = dynamic(() => import('@/components/admin/collaborators-table').then((mod) => mod.CollaboratorsTable), { loading: SectionLoading });
const EpiDeliveriesTable = dynamic(() => import('@/components/admin/epi-deliveries-table').then((mod) => mod.EpiDeliveriesTable), { loading: SectionLoading });
const TrainingsTable = dynamic(() => import('@/components/admin/trainings-table').then((mod) => mod.TrainingsTable), { loading: SectionLoading });
const InspectionsTable = dynamic(() => import('@/components/admin/inspections-table').then((mod) => mod.InspectionsTable), { loading: SectionLoading });
const FireExtinguishersDashboard = dynamic(() => import('@/components/admin/fire-extinguishers-dashboard').then((mod) => mod.FireExtinguishersDashboard), { loading: SectionLoading });
const IncidentsTable = dynamic(() => import('@/components/admin/incidents-table').then((mod) => mod.IncidentsTable), { loading: SectionLoading });
const CostsPreventionTable = dynamic(() => import('@/components/admin/costs-prevention-table').then((mod) => mod.CostsPreventionTable), { loading: SectionLoading });
const NonconformitiesTable = dynamic(() => import('@/components/admin/nonconformities-table').then((mod) => mod.NonconformitiesTable), { loading: SectionLoading });
const EmployeesTable = dynamic(() => import('@/components/admin/employees-table').then((mod) => mod.EmployeesTable), { loading: SectionLoading });
const JobRolesTable = dynamic(() => import('@/components/admin/job-roles-table').then((mod) => mod.JobRolesTable), { loading: SectionLoading });
const SubcontractorsTable = dynamic(() => import('@/components/admin/subcontractors-table').then((mod) => mod.SubcontractorsTable), { loading: SectionLoading });
const DataImportsDashboard = dynamic(() => import('@/components/admin/data-imports-dashboard').then((mod) => mod.DataImportsDashboard), { loading: SectionLoading });
const CompanySettings = dynamic(() => import('@/components/admin/company-settings').then((mod) => mod.CompanySettings), { loading: SectionLoading });

export default function CompanyPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading: isSessionLoading } = useSession();
  const companyId = params.companyId as string;

  const requestedSection = searchParams.get('section') as AdminSection | null;
  const initialSection = requestedSection && adminSections.some((section) => section.value === requestedSection) ? requestedSection : 'fireExtinguishers';

  const [activeSection, setActiveSection] = useState<AdminSection>(initialSection);
  const [renderedSection, setRenderedSection] = useState<AdminSection | null>(initialSection);
  const [isSectionSwitching, setIsSectionSwitching] = useState(false);
  const [company, setCompany] = useState<Company | null>(null);
  const [isCompanyLoading, setIsCompanyLoading] = useState(true);
  const [isAuthorizing, setIsAuthorizing] = useState(() => !user);
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [menuSearch, setMenuSearch] = useState('');
  const [openMenuGroups, setOpenMenuGroups] = useState<string[]>(() => navigationGroups.filter((group) => group.defaultOpen).map((group) => group.id));

  const loadCompany = async () => {
    if (!companyId) return;

    setIsCompanyLoading(true);
    const result = await getCompanyById(companyId);

    if (result.success && result.data) {
      setCompany(result.data);
    } else {
      setCompany(null);
    }

    setIsCompanyLoading(false);
  };

  useEffect(() => {
    if (isSessionLoading) {
      return;
    }

    if (!user) {
      router.replace('/login');
      return;
    }

    if (user.role !== 'admin') {
      router.replace('/reports');
      return;
    }

    if (user.companyId && user.companyId !== companyId) {
      router.replace(`/company/${user.companyId}`);
      return;
    }

    setIsAuthorizing(false);
    void loadCompany();
  }, [companyId, isSessionLoading, router, user]);

  useEffect(() => {
    if (!requestedSection) {
      return;
    }

    if (adminSections.some((section) => section.value === requestedSection) && requestedSection !== activeSection) {
      setActiveSection(requestedSection);
      setRenderedSection(requestedSection);
    }
  }, [activeSection, requestedSection]);

  useEffect(() => {
    const syncFromLocation = () => {
      const params = new URLSearchParams(window.location.search);
      const nextSection = params.get('section') as AdminSection | null;
      if (nextSection && adminSections.some((section) => section.value === nextSection)) {
        setActiveSection(nextSection);
        setRenderedSection(nextSection);
      }
    };

    const handleSectionEvent = (event: Event) => {
      const detail = (event as SectionNavigationEvent).detail;
      if (!detail?.section || !adminSections.some((section) => section.value === detail.section)) return;
      setActiveSection(detail.section);
      setIsMobileMenuOpen(false);
      setIsSectionSwitching(true);
      setRenderedSection(null);
      window.setTimeout(() => {
        setRenderedSection(detail.section);
        setIsSectionSwitching(false);
      }, 30);
    };

    window.addEventListener('popstate', syncFromLocation);
    window.addEventListener('phidocs:section-change', handleSectionEvent);
    return () => {
      window.removeEventListener('popstate', syncFromLocation);
      window.removeEventListener('phidocs:section-change', handleSectionEvent);
    };
  }, []);

  const activeMenuGroupId = useMemo(() => {
    return navigationGroups.find((group) => group.items.some((item) => item.type === 'section' && item.section === activeSection))?.id;
  }, [activeSection]);

  useEffect(() => {
    if (!activeMenuGroupId) return;
    setOpenMenuGroups((current) => (current.includes(activeMenuGroupId) ? current : [...current, activeMenuGroupId]));
  }, [activeMenuGroupId]);

  const currentSection = useMemo(() => {
    if (!renderedSection || isSectionSwitching) return <SectionLoading />;

    switch (renderedSection) {
      case 'dashboardGeneral':
        return <SafetyDashboardGeneral companyId={companyId} companyName={company?.name} />;
      case 'collaborators':
        return <CollaboratorsTable companyId={companyId} companyName={company?.name} />;
      case 'epiDeliveries':
        return <EpiDeliveriesTable companyId={companyId} companyName={company?.name} />;
      case 'trainings':
        return <TrainingsTable companyId={companyId} />;
      case 'inspections':
        return <InspectionsTable companyId={companyId} />;
      case 'fireExtinguishers':
        return <FireExtinguishersDashboard companyId={companyId} companyName={company?.name} />;
      case 'incidents':
        return <IncidentsTable companyId={companyId} />;
      case 'costsPrevention':
        return <CostsPreventionTable companyId={companyId} />;
      case 'nonconformities':
        return <NonconformitiesTable companyId={companyId} />;
      case 'employees':
        return <EmployeesTable companyId={companyId} searchTerm={employeeSearch} />;
      case 'teamAccess':
        return <TeamAccess />;
      case 'jobRoles':
        return <JobRolesTable companyId={companyId} />;
      case 'subcontractors':
        return <SubcontractorsTable companyId={companyId} />;
      case 'dataImports':
        return <DataImportsDashboard companyId={companyId} companyName={company?.name} />;
      case 'settings':
        if (!company) {
          return (
            <Skeleton className="h-[520px] w-full rounded-2xl" />
          );
        }

        return (
          <CompanySettings company={company} onCompanyUpdate={loadCompany} />
        );
      case 'works':
      default:
        return <WorksTable companyId={companyId} />;
    }
  }, [company, companyId, employeeSearch, isSectionSwitching, renderedSection]);

  const isSettingsSection = activeSection === 'settings';

  const handleSectionChange = (section: AdminSection) => {
    if (section === activeSection && renderedSection === section) {
      setIsMobileMenuOpen(false);
      return;
    }

    setIsMobileMenuOpen(false);
    navigateCompanySection(companyId, section);
  };

  const handleSignOut = async () => {
    await signOut();
    await createSupabaseBrowserClient().auth.signOut();
    router.push('/login');
  };

  const sidebarWidthClass = isSidebarCollapsed ? 'lg:w-24' : 'lg:w-80';
  const mainOffsetClass = isSidebarCollapsed ? 'lg:ml-24' : 'lg:ml-80';
  const menuQuery = menuSearch.trim().toLowerCase();
  const itemMatchesSearch = (item: NavigationItem) => {
    if (!menuQuery) return true;
    if (item.type === 'section') {
      const section = getSection(item.section);
      return `${item.label || section.label} ${item.description || section.description} ${(item.keywords || []).join(' ')}`.toLowerCase().includes(menuQuery);
    }
    return `${item.label} ${item.description} ${(item.keywords || []).join(' ')}`.toLowerCase().includes(menuQuery);
  };
  const filteredNavigationGroups = navigationGroups
    .map((group) => ({
      ...group,
      items: group.items.filter(itemMatchesSearch),
    }))
    .filter((group) => group.items.length > 0);

  const itemClass = (active: boolean, compact = false) => cn(
    'group flex w-full items-center gap-3 rounded-xl text-left transition-all duration-150',
    compact ? 'px-3 py-2 text-[0.88rem]' : 'px-3 py-2.5 text-[0.92rem]',
    active
      ? 'border-l-4 font-semibold shadow-sm'
      : 'text-[#6e6a61] hover:bg-[#e3e0d8] hover:text-[#111111]',
    isSidebarCollapsed && !compact && !isMobileMenuOpen && 'justify-center px-2',
  );

  const renderSectionButton = (item: Extract<NavigationItem, { type: 'section' }>, compact = false, itemKey?: string) => {
    const section = getSection(item.section);
    const Icon = item.icon || section.icon;
    const label = item.label || section.label;
    const description = item.description || section.description;
    const isActive = activeSection === section.value && item.label !== 'Dashboard';
    const color = getModuleColor(item.module || moduleColorForSection(section.value));

    return (
      <button
        key={itemKey || `${section.value}-${label}`}
        type="button"
        title={description}
        onClick={() => handleSectionChange(section.value)}
        className={itemClass(isActive, compact)}
        style={isActive ? { backgroundColor: color.soft, borderLeftColor: color.primary, color: color.text } : undefined}
      >
        <Icon className={cn('shrink-0', compact ? 'h-4 w-4' : 'h-5 w-5')} style={{ color: isActive ? color.icon : color.primary }} />
        {!isSidebarCollapsed || compact || isMobileMenuOpen ? <span className="truncate">{label}</span> : null}
      </button>
    );
  };

  const renderNavigation = (mobile = false) => (
    <nav className="flex-1 overflow-y-auto px-3 pb-3">
      {!isSidebarCollapsed || mobile ? (
        <div className="mb-4 px-1">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6e6a61]" />
            <input
              value={menuSearch}
              onChange={(event) => setMenuSearch(event.target.value)}
              placeholder="Buscar modulo..."
              className="h-10 w-full rounded-xl border border-[#cfcbc0] bg-[#f7f5f0] pl-9 pr-3 text-sm text-[#111111] outline-none focus:border-[#7a1f1f]"
            />
          </div>
        </div>
      ) : null}

      <div className="space-y-2.5">
        {filteredNavigationGroups.map((group) => (
          <section key={group.title} className="space-y-1.5">
            {!isSidebarCollapsed || mobile ? (
              <button
                type="button"
                onClick={() => setOpenMenuGroups((current) => current.includes(group.id) ? current.filter((id) => id !== group.id) : [...current, group.id])}
                className="flex w-full items-center justify-between rounded-lg px-3 py-1.5 text-left text-[0.68rem] font-bold uppercase tracking-[0.16em] text-[#6e6a61] hover:bg-[#e3e0d8]"
              >
                <span>{group.title}</span>
                <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', (openMenuGroups.includes(group.id) || menuQuery) && 'rotate-180')} />
              </button>
            ) : (
              <div className="mx-auto h-px w-10 bg-[#e3e0d8]" />
            )}
            {(openMenuGroups.includes(group.id) || Boolean(menuQuery) || isSidebarCollapsed) ? <div className="space-y-1">
              {group.items.map((item, index) => {
                if (item.type === 'section') return renderSectionButton(item, false, `${group.id}-${index}-${item.section}-${item.label || ''}`);

                if (item.type === 'link') {
                  const Icon = item.icon;
                  const color = getModuleColor(item.module);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      title={item.description}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={itemClass(false)}
                    >
                      <Icon className="h-5 w-5 shrink-0" style={{ color: color.icon }} />
                      {!isSidebarCollapsed || mobile || isMobileMenuOpen ? <span className="truncate">{item.label}</span> : null}
                    </Link>
                  );
                }

                return null;
              })}
            </div> : null}
          </section>
        ))}
      </div>
    </nav>
  );

  if (isSessionLoading || isAuthorizing) {
    return (
      <div className="min-h-screen bg-[#f2f1ed]">
        <div className="flex h-16 items-center border-b border-[#cfcbc0] bg-[#f7f5f0] px-6">
          <Logo className="h-auto w-[170px]" />
        </div>
        <div className="mx-auto flex max-w-[1600px] gap-6 px-6 py-8">
          <Skeleton className="hidden h-[720px] w-80 rounded-none lg:block" />
          <div className="flex-1 space-y-6">
            <Skeleton className="h-10 w-64 rounded-lg" />
            <Skeleton className="h-6 w-96 rounded-lg" />
            <Skeleton className="h-[540px] w-full rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f2f1ed]">
      <header className="fixed inset-x-0 top-0 z-30 flex h-16 items-center border-b border-[#cfcbc0] bg-[#f7f5f0] px-6 shadow-sm">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsMobileMenuOpen(true)}
            className="h-10 w-10 rounded-full text-[#111111] hover:bg-[#ebe9e3] lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <Logo className="h-auto w-[170px]" />
        </div>
        <div className="ml-auto flex items-center gap-4">
          <div className="relative hidden lg:block">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#6e6a61]" />
            <input
              value={activeSection === 'employees' ? employeeSearch : ''}
              onChange={(event) => {
                if (activeSection === 'employees') {
                  setEmployeeSearch(event.target.value);
                }
              }}
              placeholder="Buscar..."
              className="h-14 w-[300px] rounded-2xl border border-[#cfcbc0] bg-[#f7f5f0] pl-12 pr-4 text-[1rem] text-[#111111] outline-none ring-0 placeholder:text-[#6e6a61] focus:border-[#7a1f1f]"
            />
          </div>
          <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full text-[#111111] hover:bg-[#ebe9e3]">
            <Bell className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full text-[#111111] hover:bg-[#ebe9e3]">
            <CircleHelp className="h-4 w-4" />
          </Button>
          <UserNav />
        </div>
      </header>

      <aside className={cn('fixed left-0 top-16 z-20 hidden h-[calc(100vh-4rem)] flex-col border-r border-[#cfcbc0] bg-[#f2f1ed] transition-all duration-200 lg:flex', sidebarWidthClass)}>
        <div className={cn('px-5 pb-4 pt-4', isSidebarCollapsed && 'px-3')}>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsSidebarCollapsed((current) => !current)}
            className={cn('h-9 rounded-xl text-[#6e6a61] hover:bg-[#e3e0d8]', isSidebarCollapsed ? 'mx-auto w-11' : 'w-full justify-start px-3')}
            title={isSidebarCollapsed ? 'Expandir menu' : 'Recolher menu'}
          >
            {isSidebarCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <><PanelLeftClose className="h-4 w-4" /><span className="ml-2 text-sm">Recolher menu</span></>}
          </Button>
        </div>

        {renderNavigation(false)}

        <div className={cn('mt-auto border-t border-[#cfcbc0] px-3 py-4', isSidebarCollapsed && 'px-2')}>
          <div className="space-y-1">
            <Button
              variant="ghost"
              className={cn('h-11 rounded-xl text-[#6e6a61] hover:bg-[#e3e0d8] hover:text-[#111111]', isSidebarCollapsed ? 'w-full justify-center px-0' : 'w-full justify-start px-3')}
              title="Suporte"
            >
              <CircleHelp className="h-4 w-4" />
              {!isSidebarCollapsed ? <span>Suporte</span> : null}
            </Button>
            <Button
              variant="ghost"
              onClick={handleSignOut}
              className={cn('h-11 rounded-xl text-[#7a1f1f] hover:bg-[#f0e2e0] hover:text-[#7a1f1f]', isSidebarCollapsed ? 'w-full justify-center px-0' : 'w-full justify-start px-3')}
              title="Sair"
            >
              <LogOut className="h-4 w-4" />
              {!isSidebarCollapsed ? <span>Sair</span> : null}
            </Button>
          </div>
          {!isSidebarCollapsed ? <p className="mt-3 px-3 text-xs text-[#6e6a61]">Versao {process.env.NEXT_PUBLIC_APP_VERSION || 'dev'}</p> : null}
        </div>
      </aside>

      {isMobileMenuOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button type="button" aria-label="Fechar menu" className="absolute inset-0 bg-black/35" onClick={() => setIsMobileMenuOpen(false)} />
          <aside className="relative flex h-full w-[min(88vw,22rem)] flex-col border-r border-[#cfcbc0] bg-[#f2f1ed] shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4">
              <div>
                <p className="text-lg font-semibold text-[#111111]">Menu</p>
                <p className="text-sm text-[#6e6a61]">Gestao SST</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(false)} className="rounded-full">
                <X className="h-5 w-5" />
              </Button>
            </div>
            {renderNavigation(true)}
            <div className="border-t border-[#cfcbc0] p-4">
              <Button variant="ghost" onClick={handleSignOut} className="w-full justify-start rounded-xl text-[#7a1f1f] hover:bg-[#f0e2e0] hover:text-[#7a1f1f]">
                <LogOut className="h-4 w-4" />
                Sair
              </Button>
            </div>
          </aside>
        </div>
      ) : null}

      <main className={cn('min-h-screen pt-16 transition-[margin] duration-200', mainOffsetClass)}>
        <div className={isSettingsSection ? 'mx-auto max-w-[1600px] px-4 py-8 sm:px-8' : 'mx-auto max-w-[1600px] px-4 py-6 sm:px-6'}>
          {!['works', 'dashboardGeneral', 'collaborators', 'epiDeliveries', 'trainings', 'inspections', 'incidents', 'costsPrevention', 'nonconformities', 'employees', 'jobRoles', 'dataImports'].includes(activeSection) && (
            isSettingsSection ? (
              <div className="mb-8">
                {isCompanyLoading ? (
                  <div className="space-y-3">
                    <Skeleton className="h-12 w-80 rounded-lg" />
                    <Skeleton className="h-6 w-[44rem] max-w-full rounded-lg" />
                  </div>
                ) : (
                  <>
                    <h1 className="font-headline text-[4rem] font-bold leading-[1.05] tracking-[-0.03em] text-[#111111]">
                      Configuracoes da Empresa
                    </h1>
                    <p className="mt-4 max-w-4xl text-[1.2rem] leading-10 text-[#6e6a61]">
                      Gerencie a identidade da sua organizacao e as integracoes de automacao n8n.
                    </p>
                  </>
                )}
              </div>
            ) : (
              <div className="mb-6 rounded-2xl border border-[#cfcbc0] bg-white px-6 py-5 shadow-sm">
                {isCompanyLoading ? (
                  <div className="space-y-3">
                    <Skeleton className="h-9 w-72 rounded-lg" />
                    <Skeleton className="h-5 w-[32rem] max-w-full rounded-lg" />
                  </div>
                ) : (
                  <>
                    <h1 className="font-headline text-[2rem] leading-tight text-[#111111]">{company?.name || 'Empresa'}</h1>
                    <p className="mt-2 max-w-3xl text-body-md text-[#6e6a61]">
                      Gerencie obras, funcionarios, cargos, terceirizadas e configuracoes da empresa no mesmo padrao visual do painel principal.
                    </p>
                  </>
                )}
              </div>
            )
          )}

          {currentSection}
        </div>
      </main>
    </div>
  );
}
