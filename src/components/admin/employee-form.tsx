'use client';
import { useEffect, useState, useTransition } from 'react';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { PhoneInput } from '@/components/ui/phone-input';
import { Button } from '@/components/ui/button';
import { DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';
import type { Employee, EmployeeFormValues, JobRole, JobRoleFormValues, Subcontractor } from '@/lib/types';
import { employeeFormSchema } from '@/lib/types';
import { JobRoleForm } from '@/components/admin/job-role-form';
import { createJobRole } from '@/server/job-role-actions';
import { useToast } from '@/hooks/use-toast';
import { Dialog } from '@/components/ui/dialog';

interface EmployeeFormProps {
  onSubmit: (values: EmployeeFormValues) => void;
  defaultValues?: Partial<Employee> | null;
  isPending: boolean;
  jobRoles: JobRole[];
  subcontractors: Subcontractor[];
  companyId?: string;
}

export function EmployeeForm({
  onSubmit,
  defaultValues,
  isPending,
  jobRoles,
  subcontractors,
  companyId,
}: EmployeeFormProps) {
  const { toast } = useToast();
  const [roleOptions, setRoleOptions] = useState<JobRole[]>(jobRoles);
  const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false);
  const [isRolePending, startRoleTransition] = useTransition();

  useEffect(() => {
    setRoleOptions(jobRoles);
  }, [jobRoles]);

  const form = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeFormSchema),
    defaultValues: {
      firstName: defaultValues?.firstName || '',
      lastName: defaultValues?.lastName || '',
      email: defaultValues?.email || '',
      cpf: defaultValues?.cpf || '',
      phone: defaultValues?.phone || '',
      roleId: defaultValues?.roleId || '',
      roleName: defaultValues?.roleName || '',
    },
  });

  const handleCreateRole = (values: JobRoleFormValues) => {
    if (!companyId) {
      toast({
        variant: 'destructive',
        title: 'Empresa não identificada',
        description: 'Não foi possível criar o cargo.',
      });
      return;
    }

    startRoleTransition(async () => {
      const result = await createJobRole({ ...values, companyId });
      if (!result.success || !result.data?.id) {
        toast({
          variant: 'destructive',
          title: 'Erro ao criar cargo',
          description: result.error || 'Falha ao criar cargo.',
        });
        return;
      }

      const createdRole: JobRole = {
        id: result.data.id,
        companyId: result.data.companyId,
        name: result.data.name,
        responsibilities: result.data.responsibilities,
        requiredCertificates: result.data.requiredCertificates,
        createdAt: new Date().toISOString(),
      };

      setRoleOptions((current) => [createdRole, ...current]);
      form.setValue('roleId', createdRole.id, { shouldValidate: true });
      form.setValue('roleName', createdRole.name, { shouldValidate: true });
      setIsRoleDialogOpen(false);
      toast({ title: 'Cargo criado com sucesso!' });
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="firstName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nome</FormLabel>
                <FormControl>
                  <Input placeholder="Nome" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="lastName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Sobrenome</FormLabel>
                <FormControl>
                  <Input placeholder="Sobrenome" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type='email' placeholder="email@exemplo.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="cpf"
          render={({ field }) => (
            <FormItem>
              <FormLabel>CPF</FormLabel>
              <FormControl>
                <Input placeholder="000.000.000-00" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Telefone / WhatsApp</FormLabel>
              <FormControl>
                <PhoneInput value={field.value} onChange={field.onChange} onBlur={field.onBlur} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="space-y-2">
          <FormLabel>Função</FormLabel>
          <FormField
            control={form.control}
            name="roleId"
            render={({ field }) => (
              <FormItem>
                <Select
                  onValueChange={(value) => {
                    if (value === '__new__') {
                      setIsRoleDialogOpen(true);
                      return;
                    }
                    field.onChange(value);
                    const selectedRole = roleOptions.find((role) => role.id === value);
                    form.setValue('roleName', selectedRole?.name || '', { shouldValidate: true });
                  }}
                  defaultValue={field.value}
                  value={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um cargo" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="__new__">+ Novo cargo</SelectItem>
                    {roleOptions.map((role) => (
                      <SelectItem key={role.id} value={role.id}>
                        {role.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <DialogFooter>
          <Button type="submit" disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar
          </Button>
        </DialogFooter>
      </form>
      <Dialog open={isRoleDialogOpen} onOpenChange={setIsRoleDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Novo Cargo</DialogTitle>
          </DialogHeader>
          <JobRoleForm
            onSubmit={handleCreateRole}
            isPending={isRolePending}
          />
        </DialogContent>
      </Dialog>
    </Form>
  );
}
