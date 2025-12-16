'use client';

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
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { DialogFooter } from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';
import type { Work, WorkFormValues } from '@/lib/types';
import { workFormSchema } from '@/lib/types';

interface WorkFormProps {
  onSubmit: (values: Omit<WorkFormValues, 'companyId'>) => void;
  defaultValues?: Partial<Work> | null;
  isPending: boolean;
}

export function WorkForm({ onSubmit, defaultValues, isPending }: WorkFormProps) {
  const form = useForm<Omit<WorkFormValues, 'companyId'>>({
    resolver: zodResolver(workFormSchema.omit({ companyId: true })),
    defaultValues: {
      name: defaultValues?.name || '',
      address: defaultValues?.address || '',
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome da Obra</FormLabel>
              <FormControl>
                <Input placeholder="Nome da obra ou projeto" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Endereço da Obra</FormLabel>
              <FormControl>
                <Input placeholder="Endereço completo da obra" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
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
