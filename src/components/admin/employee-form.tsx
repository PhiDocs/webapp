'use client';
import { useState } from 'react';

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
import { DialogFooter } from '@/components/ui/dialog';
import { Loader2, Plus, List } from 'lucide-react';
import type { Employee, EmployeeFormValues, JobRole, Subcontractor } from '@/lib/types';
import { employeeFormSchema } from '@/lib/types';

interface EmployeeFormProps {
  onSubmit: (values: EmployeeFormValues) => void;
  defaultValues?: Partial<Employee> | null;
  isPending: boolean;
  jobRoles: JobRole[];
  subcontractors: Subcontractor[];
}

export function EmployeeForm({
  onSubmit,
  defaultValues,
  isPending,
  jobRoles,
  subcontractors,
}: EmployeeFormProps) {
  const [isCreatingRole, setIsCreatingRole] = useState(!defaultValues?.roleId);

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
          <div className="flex items-center justify-between">
            <FormLabel>Função</FormLabel>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 text-xs text-muted-foreground hover:text-primary"
              onClick={() => {
                setIsCreatingRole(!isCreatingRole);
                // Reset values when switching
                if (!isCreatingRole) {
                  form.setValue('roleId', 'new');
                  form.setValue('roleName', '');
                } else {
                  form.setValue('roleId', '');
                  form.setValue('roleName', undefined);
                }
              }}
            >
              {isCreatingRole ? (
                <>
                  <List className="mr-1 h-3 w-3" />
                  Selecionar Existente
                </>
              ) : (
                <>
                  <Plus className="mr-1 h-3 w-3" />
                  Criar Nova Função
                </>
              )}
            </Button>
          </div>

          {isCreatingRole ? (
            <FormField
              control={form.control}
              name="roleName"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input placeholder="Digite o nome do novo cargo" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          ) : (
            <FormField
              control={form.control}
              name="roleId"
              render={({ field }) => (
                <FormItem>
                  <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um cargo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {jobRoles.map((role) => (
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
          )}
        </div>
        <DialogFooter>
          <Button type="submit" disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}
