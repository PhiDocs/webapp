'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import {
  Bell,
  Briefcase,
  CircleHelp,
  HardHat,
  LogOut,
  Search,
  Settings,
  Shield,
  UserCog,
  Users,
} from 'lucide-react';
import { UserNav } from '@/components/auth/user-nav';
import { useSession } from '@/components/auth/session-provider';
import { getCompanyById } from '@/server/company-actions';
import type { Company } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { EmployeesTable } from '@/components/admin/employees-table';
import { JobRolesTable } from '@/components/admin/job-roles-table';
import { SubcontractorsTable } from '@/components/admin/subcontractors-table';
import { CompanySettings } from '@/components/admin/company-settings';
import { WorksTable } from '@/components/admin/works-table';
import { Button } from '@/components/ui/button';
import { signOut } from '@/server/auth-actions';
import { createSupabaseBrowserClient } from '@/supabase/browser';

type AdminSection = 'works' | 'employees' | 'jobRoles' | 'subcontractors' | 'settings';

const adminSections: Array<{
  value: AdminSection;
  label: string;
  icon: typeof Briefcase;
}> = [
  { value: 'works', label: 'Obras', icon: HardHat },
  { value: 'employees', label: 'Funcionarios', icon: Users },
  { value: 'jobRoles', label: 'Cargos', icon: Shield },
  { value: 'subcontractors', label: 'Terceirizadas', icon: UserCog },
  { value: 'settings', label: 'Configuracoes', icon: Settings },
];

export default function CompanyPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading: isSessionLoading } = useSession();
  const companyId = params.companyId as string;

  const [activeSection, setActiveSection] = useState<AdminSection>('works');
  const [company, setCompany] = useState<Company | null>(null);
  const [isCompanyLoading, setIsCompanyLoading] = useState(true);
  const [isAuthorizing, setIsAuthorizing] = useState(() => !user);
  const [employeeSearch, setEmployeeSearch] = useState('');

  const requestedSection = searchParams.get('section') as AdminSection | null;

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
    }
  }, [activeSection, requestedSection]);

  const currentSection = useMemo(() => {
    switch (activeSection) {
      case 'employees':
        return <EmployeesTable companyId={companyId} searchTerm={employeeSearch} />;
      case 'jobRoles':
        return <JobRolesTable companyId={companyId} />;
      case 'subcontractors':
        return <SubcontractorsTable companyId={companyId} />;
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
  }, [activeSection, company, companyId]);

  const isSettingsSection = activeSection === 'settings';

  const handleSectionChange = (section: AdminSection) => {
    setActiveSection(section);

    const params = new URLSearchParams(searchParams.toString());
    params.set('section', section);
    router.replace(`/company/${companyId}?${params.toString()}`, { scroll: false });
  };

  const handleSignOut = async () => {
    await signOut();
    await createSupabaseBrowserClient().auth.signOut();
    router.push('/login');
  };

  if (isSessionLoading || isAuthorizing) {
    return (
      <div className="min-h-screen bg-[#f7f9fc]">
        <div className="flex h-16 items-center border-b border-[#e6cfc1] bg-[#f8f8f8] px-6">
          <span className="font-headline text-h3 tracking-tight text-[#9e4300]">PhiDocs</span>
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
    <div className="min-h-screen bg-[#f7f9fc]">
      <header className="fixed inset-x-0 top-0 z-30 flex h-16 items-center border-b border-[#e6cfc1] bg-[#f8f8f8] px-6 shadow-sm">
        <div className="flex items-center gap-4">
          <span className="font-headline text-[2.1rem] font-semibold tracking-tight text-[#9e4300]">PhiDocs</span>
          <nav className="ml-8 hidden items-center gap-10 text-body-md text-[#584237] md:flex">
            <Link href="/reports" className="transition-colors hover:text-[#b74813]">
              Relatorios
            </Link>
            <Link href="/documents" className="transition-colors hover:text-[#b74813]">
              Documentos
            </Link>
          </nav>
        </div>
        <div className="ml-auto flex items-center gap-4">
          <div className="relative hidden lg:block">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#584237]" />
            <input
              value={activeSection === 'employees' ? employeeSearch : ''}
              onChange={(event) => {
                if (activeSection === 'employees') {
                  setEmployeeSearch(event.target.value);
                }
              }}
              placeholder="Buscar..."
              className="h-14 w-[300px] rounded-2xl border border-[#e0c0b1] bg-[#f8f8f8] pl-12 pr-4 text-[1rem] text-[#191c1e] outline-none ring-0 placeholder:text-[#6c7280] focus:border-[#f46e11]"
            />
          </div>
          <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full text-[#415778] hover:bg-[#eef1f5]">
            <Bell className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full text-[#415778] hover:bg-[#eef1f5]">
            <CircleHelp className="h-4 w-4" />
          </Button>
          <UserNav />
        </div>
      </header>

      <aside className="fixed left-0 top-16 z-20 hidden h-[calc(100vh-4rem)] w-80 flex-col border-r border-[#e0c0b1] bg-[#f3f4f6] lg:flex">
        <div className="px-8 pb-8 pt-7">
          <div className="flex items-center gap-4">
            <div className="rounded-xl p-2 text-[#9e4300]">
              <Shield className="h-10 w-10" />
            </div>
            <div>
              <h1 className="font-headline text-[2rem] font-semibold leading-9 text-[#191c1e]">Gestao PhiDocs</h1>
              <p className="mt-2 text-[1rem] text-[#4f5f7a]">Safety Compliance AI</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-4">
          <ul className="space-y-1.5">
            {adminSections.map((section) => {
              const Icon = section.icon;
              const isActive = activeSection === section.value;

              return (
                <li key={section.value}>
                  <button
                    type="button"
                    onClick={() => handleSectionChange(section.value)}
                    className={[
                      'mx-0 flex w-full items-center gap-4 rounded-2xl px-4 py-4 text-left text-[1rem] transition-colors',
                      isActive
                        ? 'bg-[#ff6f08] font-medium text-[#341100] shadow-sm'
                        : 'text-[#4f5f7a] hover:bg-[#e6e8eb] hover:text-[#191c1e]',
                    ].join(' ')}
                  >
                    <Icon className="h-5 w-5" />
                    {section.label}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="mt-auto border-t border-[#e0c0b1] px-4 py-5">
          <div className="pb-6">
            <Button className="h-16 w-full rounded-2xl bg-[#9e4300] text-[1rem] font-semibold text-white shadow-[0_8px_24px_rgba(158,67,0,0.18)] hover:bg-[#8c3b00]">
              <Briefcase className="h-5 w-5" />
              Novo Relatorio
            </Button>
          </div>
          <div className="space-y-1">
            <Button
              variant="ghost"
              className="h-14 justify-start rounded-2xl px-4 text-[1rem] text-[#4f5f7a] hover:bg-[#e6e8eb] hover:text-[#191c1e]"
            >
              <CircleHelp className="h-4 w-4" />
              Suporte
            </Button>
            <Button
              variant="ghost"
              onClick={handleSignOut}
              className="h-14 justify-start rounded-2xl px-4 text-[1rem] text-[#d01818] hover:bg-[#fbe2df] hover:text-[#d01818]"
            >
              <LogOut className="h-4 w-4" />
              Sair
            </Button>
          </div>
        </div>
      </aside>

      <main className="min-h-screen pt-16 lg:ml-80">
        <div className={isSettingsSection ? 'mx-auto max-w-[1600px] px-4 py-8 sm:px-8' : 'mx-auto max-w-[1600px] px-4 py-6 sm:px-6'}>
          {!['works', 'employees', 'jobRoles'].includes(activeSection) && (
            isSettingsSection ? (
              <div className="mb-8">
                {isCompanyLoading ? (
                  <div className="space-y-3">
                    <Skeleton className="h-12 w-80 rounded-lg" />
                    <Skeleton className="h-6 w-[44rem] max-w-full rounded-lg" />
                  </div>
                ) : (
                  <>
                    <h1 className="font-headline text-[4rem] font-bold leading-[1.05] tracking-[-0.03em] text-[#191c1e]">
                      Configuracoes da Empresa
                    </h1>
                    <p className="mt-4 max-w-4xl text-[1.2rem] leading-10 text-[#4f5f7a]">
                      Gerencie a identidade da sua organizacao e as integracoes de automacao n8n.
                    </p>
                  </>
                )}
              </div>
            ) : (
              <div className="mb-6 rounded-2xl border border-[#e0c0b1] bg-white px-6 py-5 shadow-sm">
                {isCompanyLoading ? (
                  <div className="space-y-3">
                    <Skeleton className="h-9 w-72 rounded-lg" />
                    <Skeleton className="h-5 w-[32rem] max-w-full rounded-lg" />
                  </div>
                ) : (
                  <>
                    <h1 className="font-headline text-[2rem] leading-tight text-[#191c1e]">{company?.name || 'Empresa'}</h1>
                    <p className="mt-2 max-w-3xl text-body-md text-[#4f5f7a]">
                      Gerencie obras, funcionarios, cargos, terceirizadas e configuracoes da empresa no mesmo padrao visual do painel principal.
                    </p>
                  </>
                )}
              </div>
            )
          )}

          <div className="lg:hidden">
            <div className="mb-6 overflow-x-auto rounded-2xl border border-[#e0c0b1] bg-white p-2 shadow-sm">
              <div className="flex min-w-max gap-2">
                {adminSections.map((section) => {
                  const Icon = section.icon;
                  const isActive = activeSection === section.value;

                  return (
                    <button
                      key={section.value}
                      type="button"
                      onClick={() => handleSectionChange(section.value)}
                      className={[
                        'flex items-center gap-2 rounded-md px-4 py-2 text-sm transition-colors',
                        isActive
                          ? 'bg-[#f46e11] font-semibold text-white'
                          : 'bg-[#f3f4f6] text-[#4f5f7a] hover:bg-[#e6e8eb] hover:text-[#191c1e]',
                      ].join(' ')}
                    >
                      <Icon className="h-4 w-4" />
                      {section.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {currentSection}
        </div>
      </main>
    </div>
  );
}
