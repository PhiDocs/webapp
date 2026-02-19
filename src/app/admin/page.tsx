'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { Header } from '@/components/header';
import { UserNav } from '@/components/auth/user-nav';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Building2, Shield, Users, UserCog, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import type { Company } from '@/lib/types';
import type { AclPermission } from '@/lib/acl';
import {
  createCompanyAsSuperAdmin,
  getGlobalCompanies,
  getGlobalUsers,
  setUserPermissions,
  getSuperAdminOverview,
} from '@/server/super-admin-actions';
import { CompanyMemberships } from '@/components/admin/company-memberships';
import { Checkbox } from '@/components/ui/checkbox';
import { useSession } from '@/components/auth/session-provider';

type Overview = {
  companiesCount: number;
  usersCount: number;
  superAdminsCount: number;
  companyAdminsCount: number;
};

type GlobalUser = {
  uid: string;
  name: string;
  email: string;
  role: 'super-admin' | 'admin' | 'user';
  isSuperAdmin: boolean;
  activeCompanyId: string | null;
  membershipsCount: number;
  activeMembershipsCount: number;
  createdAt?: string;
  permissions: AclPermission[];
};

export default function AdminPage() {
  const { user } = useSession();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [isLoading, setIsLoading] = useState(true);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [users, setUsers] = useState<GlobalUser[]>([]);
  const [companyName, setCompanyName] = useState('');
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);

  const selectedCompany = useMemo(
    () => companies.find((company) => company.id === selectedCompanyId) ?? null,
    [companies, selectedCompanyId]
  );
  const canCreateCompany = Boolean(user?.permissions?.includes('company.create'));

  const reloadData = async () => {
    setIsLoading(true);
    const [overviewResult, companiesResult, usersResult] = await Promise.all([
      getSuperAdminOverview(),
      getGlobalCompanies(),
      getGlobalUsers(),
    ]);

    if (overviewResult.success && overviewResult.data) {
      setOverview(overviewResult.data);
    } else {
      toast({
        variant: 'destructive',
        title: 'Falha ao carregar métricas',
        description: overviewResult.error,
      });
    }

    if (companiesResult.success && companiesResult.data) {
      setCompanies(companiesResult.data);
      setSelectedCompanyId((current) => {
        if (current && companiesResult.data.some((company) => company.id === current)) {
          return current;
        }
        return companiesResult.data[0]?.id ?? null;
      });
    } else {
      toast({
        variant: 'destructive',
        title: 'Falha ao carregar empresas',
        description: companiesResult.error,
      });
    }

    if (usersResult.success && usersResult.data) {
      setUsers(usersResult.data);
    } else {
      toast({
        variant: 'destructive',
        title: 'Falha ao carregar usuários',
        description: usersResult.error,
      });
    }

    setIsLoading(false);
  };

  useEffect(() => {
    void reloadData();
  }, []);

  const handleCreateCompany = () => {
    startTransition(async () => {
      const trimmedName = companyName.trim();
      if (!trimmedName) {
        toast({
          variant: 'destructive',
          title: 'Nome obrigatório',
          description: 'Informe o nome da empresa para criar.',
        });
        return;
      }

      const result = await createCompanyAsSuperAdmin({
        name: trimmedName,
        logo: '',
        n8nProductionUrl: '',
        n8nTestUrl: '',
      });

      if (!result.success) {
        toast({
          variant: 'destructive',
          title: 'Falha ao criar empresa',
          description: result.error,
        });
        return;
      }

      toast({
        title: 'Empresa criada',
        description: 'A empresa foi criada com sucesso.',
      });
      setCompanyName('');
      await reloadData();
    });
  };

  const handleCompanyCreatePermissionChange = (targetUser: GlobalUser, checked: boolean) => {
    startTransition(async () => {
      const nextPermissions = checked
        ? Array.from(new Set([...(targetUser.permissions ?? []), 'company.create' as const]))
        : (targetUser.permissions ?? []).filter((permission) => permission !== 'company.create');

      const result = await setUserPermissions({
        userId: targetUser.uid,
        permissions: nextPermissions,
      });

      if (!result.success) {
        toast({
          variant: 'destructive',
          title: 'Falha ao atualizar permissões',
          description: result.error,
        });
        return;
      }

      setUsers((currentUsers) => currentUsers.map((item) => (
        item.uid === targetUser.uid
          ? { ...item, permissions: nextPermissions }
          : item
      )));

      toast({
        title: 'Permissões atualizadas',
        description: `Permissão company.create ${checked ? 'concedida' : 'removida'} para ${targetUser.email}.`,
      });
    });
  };

    return (
        <div className="min-h-screen bg-background flex flex-col">
            <Header>
                <UserNav />
            </Header>
            <main className="flex-grow container mx-auto p-4 md:p-6 space-y-6">
                <div>
                    <h1 className="text-3xl font-bold">Super Admin</h1>
                    <p className="text-muted-foreground mt-2">
                        Gerenciamento global de empresas, usuários e permissões administrativas.
                    </p>
                </div>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardDescription>Empresas</CardDescription>
                            <CardTitle className="text-2xl flex items-center justify-between">
                                {overview?.companiesCount ?? (isLoading ? '-' : '0')}
                                <Building2 className="h-5 w-5 text-muted-foreground" />
                            </CardTitle>
                        </CardHeader>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardDescription>Usuários</CardDescription>
                            <CardTitle className="text-2xl flex items-center justify-between">
                                {overview?.usersCount ?? (isLoading ? '-' : '0')}
                                <Users className="h-5 w-5 text-muted-foreground" />
                            </CardTitle>
                        </CardHeader>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardDescription>Admins de Empresa</CardDescription>
                            <CardTitle className="text-2xl flex items-center justify-between">
                                {overview?.companyAdminsCount ?? (isLoading ? '-' : '0')}
                                <UserCog className="h-5 w-5 text-muted-foreground" />
                            </CardTitle>
                        </CardHeader>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardDescription>Super Admins</CardDescription>
                            <CardTitle className="text-2xl flex items-center justify-between">
                                {overview?.superAdminsCount ?? (isLoading ? '-' : '0')}
                                <Shield className="h-5 w-5 text-muted-foreground" />
                            </CardTitle>
                        </CardHeader>
                    </Card>
                </div>

                <Tabs defaultValue="companies">
                    <TabsList className="grid w-full grid-cols-1 md:grid-cols-3">
                        <TabsTrigger value="companies">Empresas</TabsTrigger>
                        <TabsTrigger value="users">Usuários</TabsTrigger>
                        <TabsTrigger value="access">Acessos por Empresa</TabsTrigger>
                    </TabsList>

                    <TabsContent value="companies" className="mt-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Empresas</CardTitle>
                                <CardDescription>Crie novas empresas e visualize as existentes.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {canCreateCompany ? (
                                    <div className="grid gap-3 md:grid-cols-[1fr_auto]">
                                        <div className="space-y-2">
                                            <Label htmlFor="company-name">Nome da nova empresa</Label>
                                            <Input
                                                id="company-name"
                                                value={companyName}
                                                onChange={(event) => setCompanyName(event.target.value)}
                                                placeholder="Ex.: Studio Operações"
                                                disabled={isPending}
                                            />
                                        </div>
                                        <div className="md:self-end">
                                            <Button onClick={handleCreateCompany} disabled={isPending || !companyName.trim()}>
                                                {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                                Criar empresa
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                                        Você não possui a permissão <code>company.create</code>. Solicite ao super admin do sistema.
                                    </div>
                                )}

                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Empresa</TableHead>
                                            <TableHead>ID</TableHead>
                                            <TableHead>Dono</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {isLoading ? (
                                            <TableRow>
                                                <TableCell colSpan={3} className="h-24 text-center">
                                                    <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                                                </TableCell>
                                            </TableRow>
                                        ) : companies.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                                                    Nenhuma empresa cadastrada.
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            companies.map((company) => (
                                                <TableRow key={company.id}>
                                                    <TableCell className="font-medium">{company.name}</TableCell>
                                                    <TableCell className="font-mono text-xs">{company.id}</TableCell>
                                                    <TableCell>{company.ownerUid ?? '-'}</TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="users" className="mt-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Usuários Globais</CardTitle>
                                <CardDescription>Visão global dos usuários e seus níveis de acesso.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Nome</TableHead>
                                            <TableHead>E-mail</TableHead>
                                            <TableHead>Role</TableHead>
                                            <TableHead>Permissões</TableHead>
                                            <TableHead>Memberships</TableHead>
                                            <TableHead>Empresa ativa</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {isLoading ? (
                                            <TableRow>
                                                <TableCell colSpan={6} className="h-24 text-center">
                                                    <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                                                </TableCell>
                                            </TableRow>
                                        ) : users.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                                                    Nenhum usuário encontrado.
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            users.map((user) => (
                                                <TableRow key={user.uid}>
                                                    <TableCell className="font-medium">{user.name}</TableCell>
                                                    <TableCell>{user.email}</TableCell>
                                                    <TableCell>
                                                        <Badge variant={user.role === 'super-admin' ? 'default' : 'secondary'}>
                                                            {user.role}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center gap-2">
                                                            <Checkbox
                                                                id={`permission-company-create-${user.uid}`}
                                                                checked={user.permissions.includes('company.create')}
                                                                onCheckedChange={(checked) => handleCompanyCreatePermissionChange(user, Boolean(checked))}
                                                                disabled={isPending}
                                                            />
                                                            <Label
                                                                htmlFor={`permission-company-create-${user.uid}`}
                                                                className="text-xs font-normal"
                                                            >
                                                                company.create
                                                            </Label>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>{user.activeMembershipsCount} ativos / {user.membershipsCount} total</TableCell>
                                                    <TableCell className="font-mono text-xs">{user.activeCompanyId ?? '-'}</TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="access" className="mt-6 space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Selecionar empresa para gerenciar acessos</CardTitle>
                                <CardDescription>
                                    Escolha a empresa e use os controles abaixo para promover/rebaixar admin e remover acessos.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <Label htmlFor="selected-company">Empresa</Label>
                                <select
                                    id="selected-company"
                                    className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                                    value={selectedCompanyId ?? ''}
                                    onChange={(event) => setSelectedCompanyId(event.target.value || null)}
                                >
                                    {companies.map((company) => (
                                        <option key={company.id} value={company.id}>
                                            {company.name}
                                        </option>
                                    ))}
                                </select>
                            </CardContent>
                        </Card>
                        {selectedCompany ? (
                            <CompanyMemberships companyId={selectedCompany.id} />
                        ) : (
                            <Card>
                                <CardContent className="pt-6 text-sm text-muted-foreground">
                                    Nenhuma empresa disponível para gerenciar acessos.
                                </CardContent>
                            </Card>
                        )}
                    </TabsContent>
                </Tabs>
            </main>
        </div>
    );
}
