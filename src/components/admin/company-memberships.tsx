'use client';

import { useEffect, useState, useTransition } from 'react';
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
import { Loader2, Trash2, UserPlus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  addCompanyMembershipByEmail,
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

interface CompanyMembershipsProps {
  companyId: string;
}

export function CompanyMemberships({ companyId }: CompanyMembershipsProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [users, setUsers] = useState<MembershipUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [newRole, setNewRole] = useState<MembershipRole>('user');

  const fetchUsers = async () => {
    setIsLoading(true);
    const result = await getCompanyMembershipUsers(companyId);
    if (result.success && result.data) {
      setUsers(result.data);
    } else {
      toast({
        variant: 'destructive',
        title: 'Erro ao carregar acessos',
        description: result.error,
      });
    }
    setIsLoading(false);
  };

  useEffect(() => {
    if (companyId) {
      fetchUsers();
    }
  }, [companyId]);

  const handleAddMembership = () => {
    startTransition(async () => {
      const result = await addCompanyMembershipByEmail({
        companyId,
        email,
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
      setEmail('');
      await fetchUsers();
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
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Acessos de Usuários</CardTitle>
        <CardDescription>
          Gerencie memberships desta empresa. Você pode adicionar por e-mail, ajustar role e remover acesso.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_180px_auto] gap-3">
          <div className="space-y-2">
            <Label htmlFor="membership-email">E-mail do usuário</Label>
            <Input
              id="membership-email"
              type="email"
              placeholder="usuario@empresa.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={isPending}
            />
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
              disabled={isPending || !email.trim()}
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
