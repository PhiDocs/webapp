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
import type { Work, WorkClientFormValues } from '@/lib/types';
import { workClientFormSchema } from '@/lib/types';
interface WorkFormProps {
  onSubmit: (values: WorkClientFormValues) => void;
  defaultValues?: Partial<Work> | null;
  isPending: boolean;
}

export function WorkForm({ onSubmit, defaultValues, isPending }: WorkFormProps) {
  const form = useForm<WorkClientFormValues>({
    resolver: zodResolver(workClientFormSchema),
    defaultValues: {
      name: defaultValues?.name || '',
      address: defaultValues?.address || '',
      workLocationDetails: defaultValues?.workLocationDetails || '',
      startDate: defaultValues?.startDate ? defaultValues.startDate.split('T')[0] : '',
      endDate: defaultValues?.endDate ? defaultValues.endDate.split('T')[0] : '',
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
        <FormField
          control={form.control}
          name="workLocationDetails"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Local/Pavimento</FormLabel>
              <FormControl>
                <Input placeholder="Ex: Pavimento 3, Bloco B" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
         <div className="grid grid-cols-2 gap-4">
            <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Data de Início</FormLabel>
                    <FormControl>
                        <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
            />
            <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Data de Término</FormLabel>
                    <FormControl>
                        <Input type="date" {...field} />
                    </FormControl>
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
    </Form>
  );
}
