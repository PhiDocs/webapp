'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ChevronsUpDown, Check, Loader2, Search, Trash2, UserPlus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import {
  addCompanyMembershipByUserId,
  getAvailableUsersForCompany,
  getCompanyMembershipUsers,
  removeCompanyMembership,
  updateCompanyMembershipRole,
} from '@/server/membership-actions';

type MembershipRole = 'admin' | 'user';

type MembershipUser = {
  uid: string;
  name: string;
  email: string;
  role: MembershipRole;
  status: 'active' | 'inactive';
  joinedAt: string;
  isActiveCompany: boolean;
};

type AvailableUser = {
  uid: string;
  name: string;
  email: string;
};

interface CompanyMembershipsProps {
  companyId: string;
}

export function CompanyMemberships({ companyId }: CompanyMembershipsProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [users, setUsers] = useState<MembershipUser[]>([]);
  const [availableUsers, setAvailableUsers] = useState<AvailableUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newRole, setNewRole] = useState<MembershipRole>('user');
  const [selectedUser, setSelectedUser] = useState<AvailableUser | null>(null);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filteredAvailableUsers = useMemo(() => {
    if (!search.trim()) return availableUsers;
    const term = search.toLowerCase();
    return availableUsers.filter(
      (user) => user.name.toLowerCase().includes(term) || user.email.toLowerCase().includes(term)
    );
  }, [availableUsers, search]);

  const fetchData = async () => {
    setIsLoading(true);
    const [membersResult, availableResult] = await Promise.all([
      getCompanyMembershipUsers(companyId),
      getAvailableUsersForCompany(companyId),
    ]);

    if (membersResult.success && membersResult.data) {
      setUsers(membersResult.data);
    } else {
      toast({
        variant: 'destructive',
        title: 'Erro ao carregar acessos',
        description: membersResult.error,
      });
    }

    if (availableResult.success && availableResult.data) {
      setAvailableUsers(availableResult.data);
    }

    setIsLoading(false);
  };

  useEffect(() => {
    if (companyId) {
      fetchData();
    }
  }, [companyId]);

  const handleAddMembership = () => {
    if (!selectedUser) return;

    startTransition(async () => {
      const result = await addCompanyMembershipByUserId({
        companyId,
        userId: selectedUser.uid,
        role: newRole,
      });

      if (!result.success) {
        toast({
          variant: 'destructive',
          title: 'Erro ao adicionar acesso',
          description: result.error,
        });
        return;
      }

      toast({ title: 'Acesso adicionado com sucesso.' });
      setSelectedUser(null);
      setSearch('');
      await fetchData();
    });
  };

  const handleRoleChange = (userId: string, role: MembershipRole) => {
    startTransition(async () => {
      const result = await updateCompanyMembershipRole({
        userId,
        companyId,
        role,
      });

      if (!result.success) {
        toast({
          variant: 'destructive',
          title: 'Erro ao atualizar role',
          description: result.error,
        });
        return;
      }

      setUsers((current) => current.map((user) => (user.uid === userId ? { ...user, role } : user)));
      toast({ title: 'Permissão atualizada.' });
    });
  };

  const handleRemoveMembership = (userId: string) => {
    startTransition(async () => {
      const result = await removeCompanyMembership({ userId, companyId });
      if (!result.success) {
        toast({
          variant: 'destructive',
          title: 'Erro ao remover acesso',
          description: result.error,
        });
        return;
      }

      setUsers((current) => current.filter((user) => user.uid !== userId));
      toast({ title: 'Acesso removido com sucesso.' });
      await fetchData();
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Acessos de Usuários</CardTitle>
        <CardDescription>
          Gerencie memberships desta empresa. Selecione um usuário, ajuste a role e adicione.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_180px_auto] gap-3">
          <div className="space-y-2">
            <Label>Usuário</Label>
            <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={isPopoverOpen}
                  className="w-full justify-between font-normal"
                  disabled={isPending}
                >
                  {selectedUser ? (
                    <span className="truncate">{selectedUser.name} ({selectedUser.email})</span>
                  ) : (
                    <span className="text-muted-foreground">Selecione um usuário...</span>
                  )}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                <div className="flex items-center border-b px-3">
                  <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                  <Input
                    placeholder="Buscar por nome ou e-mail..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="border-0 shadow-none focus-visible:ring-0 h-10"
                  />
                </div>
                <div className="max-h-60 overflow-y-auto p-1">
                  {filteredAvailableUsers.length === 0 ? (
                    <p className="py-6 text-center text-sm text-muted-foreground">
                      Nenhum usuário disponível.
                    </p>
                  ) : (
                    filteredAvailableUsers.map((user) => (
                      <button
                        key={user.uid}
                        type="button"
                        className={cn(
                          'relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground',
                          selectedUser?.uid === user.uid && 'bg-accent'
                        )}
                        onClick={() => {
                          setSelectedUser(user);
                          setIsPopoverOpen(false);
                          setSearch('');
                        }}
                      >
                        <Check
                          className={cn(
                            'mr-2 h-4 w-4',
                            selectedUser?.uid === user.uid ? 'opacity-100' : 'opacity-0'
                          )}
                        />
                        <div className="flex flex-col items-start">
                          <span className="font-medium">{user.name}</span>
                          <span className="text-xs text-muted-foreground">{user.email}</span>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label htmlFor="membership-role">Role</Label>
            <Select value={newRole} onValueChange={(value) => setNewRole(value as MembershipRole)} disabled={isPending}>
              <SelectTrigger id="membership-role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">user</SelectItem>
                <SelectItem value="admin">admin</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="md:self-end">
            <Button
              onClick={handleAddMembership}
              disabled={isPending || !selectedUser}
              className="w-full md:w-auto"
            >
              {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
              Adicionar
            </Button>
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Usuário</TableHead>
              <TableHead>E-mail</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                </TableCell>
              </TableRow>
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  Nenhum acesso cadastrado para esta empresa.
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user.uid}>
                  <TableCell className="font-medium">{user.name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <Select
                      value={user.role}
                      onValueChange={(value) => handleRoleChange(user.uid, value as MembershipRole)}
                      disabled={isPending}
                    >
                      <SelectTrigger className="w-[130px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">user</SelectItem>
                        <SelectItem value="admin">admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Badge variant={user.status === 'active' ? 'default' : 'secondary'}>{user.status}</Badge>
                      {user.isActiveCompany ? <Badge variant="outline">empresa ativa</Badge> : null}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveMembership(user.uid)}
                      disabled={isPending}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                      <span className="sr-only">Remover acesso</span>
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
