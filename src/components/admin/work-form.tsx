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

  const fieldClassName = 'h-11 rounded-md border border-[#d7dde6] bg-white text-[#191c1e] placeholder:text-[#8b97ab] focus-visible:border-[#ccb4a6] focus-visible:ring-[#9e4300]/15';
  const labelClassName = 'text-[0.95rem] font-medium text-[#6f7f97]';

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel className={labelClassName}>Nome da Obra</FormLabel>
              <FormControl>
                <Input className={fieldClassName} placeholder="Nome da obra ou projeto" {...field} />
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
              <FormLabel className={labelClassName}>Endereco da Obra</FormLabel>
              <FormControl>
                <Input className={fieldClassName} placeholder="Endereco completo da obra" {...field} />
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
              <FormLabel className={labelClassName}>Local/Pavimento</FormLabel>
              <FormControl>
                <Input className={fieldClassName} placeholder="Ex: Pavimento 3, Bloco B" {...field} />
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
                <FormLabel className={labelClassName}>Data de Inicio</FormLabel>
                <FormControl>
                  <Input className={fieldClassName} type="date" {...field} />
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
                <FormLabel className={labelClassName}>Data de Termino</FormLabel>
                <FormControl>
                  <Input className={fieldClassName} type="date" {...field} />
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
