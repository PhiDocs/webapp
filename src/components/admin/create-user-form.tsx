'use client';

import { useEffect } from 'react';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { DialogFooter } from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';
import type { Company, CreateUserFormValues } from '@/lib/types';
import { createUserFormSchema } from '@/lib/types';

interface CreateUserFormProps {
  onSubmit: (values: CreateUserFormValues) => void;
  isPending: boolean;
  companies: Company[];
}

export function CreateUserForm({ onSubmit, isPending, companies }: CreateUserFormProps) {
  const form = useForm<CreateUserFormValues>({
    resolver: zodResolver(createUserFormSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      companyId: '',
      companyRole: 'user',
      grantCompanyCreate: false,
    },
  });

  const selectedCompanyId = form.watch('companyId');
  const hasCompanySelected = Boolean(selectedCompanyId && selectedCompanyId !== '__none__');

  useEffect(() => {
    if (hasCompanySelected) {
      form.setValue('grantCompanyCreate', false);
    }
  }, [hasCompanySelected, form]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome</FormLabel>
              <FormControl>
                <Input placeholder="Nome completo" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>E-mail</FormLabel>
              <FormControl>
                <Input type="email" placeholder="email@exemplo.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Senha</FormLabel>
              <FormControl>
                <Input type="password" placeholder="Mínimo 6 caracteres" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="companyId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Empresa (opcional)</FormLabel>
              <Select
                onValueChange={(value) => field.onChange(value === '__none__' ? '' : value)}
                value={field.value || '__none__'}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Nenhuma empresa" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="__none__">Nenhuma empresa</SelectItem>
                  {companies.map((company) => (
                    <SelectItem key={company.id} value={company.id}>
                      {company.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        {hasCompanySelected ? (
          <FormField
            control={form.control}
            name="companyRole"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Role na empresa</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="user">Usuário</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        ) : (
          <FormField
            control={form.control}
            name="grantCompanyCreate"
            render={({ field }) => (
              <FormItem className="flex items-center gap-2 space-y-0 rounded-md border p-3">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    disabled={isPending}
                  />
                </FormControl>
                <FormLabel className="font-normal cursor-pointer">
                  Permitir criar empresa
                </FormLabel>
              </FormItem>
            )}
          />
        )}
        <DialogFooter>
          <Button type="submit" disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Criar usuário
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}
