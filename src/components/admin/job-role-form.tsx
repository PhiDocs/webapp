'use client';

import { useForm, useFieldArray } from 'react-hook-form';
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
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { DialogFooter } from '@/components/ui/dialog';
import { Loader2, PlusCircle, Trash2 } from 'lucide-react';
import type { JobRole, JobRoleFormValues } from '@/lib/types';
import { jobRoleFormSchema } from '@/lib/types';

interface JobRoleFormProps {
  onSubmit: (values: JobRoleFormValues) => void;
  defaultValues?: Partial<JobRole> | null;
  isPending: boolean;
}

export function JobRoleForm({ onSubmit, defaultValues, isPending }: JobRoleFormProps) {
  const form = useForm<JobRoleFormValues>({
    resolver: zodResolver(jobRoleFormSchema),
    defaultValues: {
      name: defaultValues?.name || '',
      responsibilities: defaultValues?.responsibilities || '',
      requiredCertificates: defaultValues?.requiredCertificates?.map((c) => ({ value: c })) || [{ value: '' }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'requiredCertificates',
  });

  const fieldClassName = 'rounded-md border border-[#d7dde6] bg-white text-[#191c1e] placeholder:text-[#8b97ab] focus-visible:border-[#ccb4a6] focus-visible:ring-[#9e4300]/15';
  const inputClassName = `h-11 ${fieldClassName}`;
  const textareaClassName = `min-h-[110px] ${fieldClassName}`;
  const labelClassName = 'text-[0.95rem] font-medium text-[#6f7f97]';

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel className={labelClassName}>Nome do Cargo</FormLabel>
              <FormControl>
                <Input className={inputClassName} placeholder="Ex: Soldador" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="responsibilities"
          render={({ field }) => (
            <FormItem>
              <FormLabel className={labelClassName}>Responsabilidades</FormLabel>
              <FormControl>
                <Textarea className={textareaClassName} placeholder="Descreva as principais responsabilidades do cargo" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div>
          <div className="mb-2 flex items-center justify-between">
            <FormLabel className={labelClassName}>Certificados Necessarios (Opcional)</FormLabel>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-[#d7dde6] text-[#6f7f97] hover:bg-[#f7f9fc] hover:text-[#9e4300]"
              onClick={() => append({ value: '' })}
            >
              <PlusCircle className="mr-2 h-4 w-4" /> Adicionar
            </Button>
          </div>

          <div className="space-y-2">
            {fields.map((field, index) => (
              <FormField
                key={field.id}
                control={form.control}
                name={`requiredCertificates.${index}.value`}
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center gap-2">
                      <FormControl>
                        <Input className={inputClassName} placeholder="Ex: NR-35" {...field} />
                      </FormControl>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => remove(index)}
                        disabled={fields.length <= 1 && form.getValues(`requiredCertificates.${index}.value`) === ''}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ))}
          </div>
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
