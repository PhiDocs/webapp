'use client';

import type { UseFormReturn } from 'react-hook-form';
import { useFieldArray, useWatch, useForm } from 'react-hook-form';
import type { SafetyFormValues } from '@/lib/types';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { ptChecklistItems } from '@/lib/data/pt-checklist';
import { Button } from './ui/button';
import { PlusCircle, Trash2, Mail, MessageCircle } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Switch } from './ui/switch';
import { Badge } from './ui/badge';
import { PhoneInput } from './ui/phone-input';
import { ptBr } from '@/lib/data/strings';
import { PT_FIT_STATUS } from '@/lib/constants';


interface PTFormProps {
  form: ReturnType<typeof useForm<SafetyFormValues>>;
}

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
    <h3 className="text-base font-semibold text-primary bg-primary/10 p-2 rounded-md my-4">
      {children}
    </h3>
  );

const AssinafyBadge = () => (
  <div className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm text-muted-foreground">
    <Badge variant="secondary" className="flex items-center gap-1">
      <Mail className="h-3 w-3" />
      Assinatura por e-mail
    </Badge>
    A assinatura será enviada por e-mail via Assinafy.
  </div>
);

const AssinafyContactFields = ({
  form,
  fieldPrefix,
}: {
  form: UseFormReturn<SafetyFormValues>;
  fieldPrefix: string;
}) => (
  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
    <FormField
      control={form.control}
      name={`${fieldPrefix}.email` as any}
      render={({ field }) => (
        <FormItem>
          <FormLabel className="flex items-center gap-2 text-xs font-normal">
            <Mail className="h-3 w-3" />
            {ptBr.auth.email}
          </FormLabel>
          <FormControl>
            <Input placeholder={ptBr.auth.emailPlaceholder} {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
    <FormField
      control={form.control}
      name={`${fieldPrefix}.phone` as any}
      render={({ field }) => (
        <FormItem>
          <FormLabel className="flex items-center gap-2 text-xs font-normal">
            <MessageCircle className="h-3 w-3" />
            Telefone (opcional)
          </FormLabel>
          <FormControl>
            <PhoneInput value={field.value} onChange={field.onChange} onBlur={field.onBlur} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  </div>
);

const CheckboxField = ({ form, name, label }: { form: UseFormReturn<SafetyFormValues>, name: string, label: string }) => (
    <FormField
      control={form.control}
      name={name as any}
      render={({ field }) => (
        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
          <FormControl>
            <Checkbox
              checked={field.value}
              onCheckedChange={field.onChange}
            />
          </FormControl>
          <FormLabel className="font-normal text-sm">{label}</FormLabel>
        </FormItem>
      )}
    />
  );

  const DynamicTeamSection = ({
    form,
    name,
    title,
    showEmpresa,
  }: {
    form: UseFormReturn<SafetyFormValues>;
    name: "pt.ptVigias" | "pt.ptResgatistas" | "pt.ptColaboradores";
    title: string;
    showEmpresa: boolean;
  }) => {
    const { control } = form;
    const { fields, append, remove } = useFieldArray({
      control,
      name,
    });
  
    return (
      <>
        <div className="flex items-center justify-between">
          <SectionTitle>{title}</SectionTitle>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => append({ name: '', rgCpf: '', func: '', empresa: '', apto: PT_FIT_STATUS.EMPTY, email: '', phone: '', useAssinafy: true })}
          >
            <PlusCircle className="mr-2 h-4 w-4" /> {ptBr.actions.add}
          </Button>
        </div>
        <div className="space-y-4">
          {fields.map((item, index) => (
            <div key={item.id} className="flex flex-col gap-2 rounded-lg border p-4">
              <div className="flex items-start gap-2">
                <div className={`grid grid-cols-1 ${showEmpresa ? 'md:grid-cols-4' : 'md:grid-cols-3'} gap-4 flex-grow`}>
                  <FormField control={control} name={`${name}.${index}.name`} render={({ field }) => (<FormItem><FormLabel className={index !== 0 ? 'sr-only' : ''}>{ptBr.ptForm.name}</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
                  <FormField control={control} name={`${name}.${index}.rgCpf`} render={({ field }) => (<FormItem><FormLabel className={index !== 0 ? 'sr-only' : ''}>{ptBr.ptForm.rgCpf}</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
                  <FormField control={control} name={`${name}.${index}.func`} render={({ field }) => (<FormItem><FormLabel className={index !== 0 ? 'sr-only' : ''}>{ptBr.ptForm.role}</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
                  {showEmpresa && <FormField control={control} name={`${name}.${index}.empresa`} render={({ field }) => (<FormItem><FormLabel className={index !== 0 ? 'sr-only' : ''}>{ptBr.ptForm.company}</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />}
                  <FormField
                    control={control}
                    name={`${name}.${index}.apto`}
                    render={({ field }) => (
                      <FormItem className="space-y-2"><FormLabel className={index !== 0 ? 'sr-only' : ''}>{ptBr.ptForm.isFit}</FormLabel>
                        <FormControl>
                          <RadioGroup onValueChange={field.onChange} value={field.value} className="flex items-center space-x-4">
                            <FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value={PT_FIT_STATUS.YES} /></FormControl><FormLabel className="font-normal">{ptBr.ptForm.yes}</FormLabel></FormItem>
                            <FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value={PT_FIT_STATUS.NO} /></FormControl><FormLabel className="font-normal">{ptBr.ptForm.no}</FormLabel></FormItem>
                          </RadioGroup>
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
                <Button type="button" variant="ghost" size="icon" className="mt-8" onClick={() => remove(index)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
              <AssinafyContactFields form={form} fieldPrefix={`${name}.${index}`} />
              <AssinafyBadge />
            </div>
          ))}
        </div>
      </>
    );
  };

  const SignerField = ({ form, fieldPrefix, label }: { form: ReturnType<typeof useForm<SafetyFormValues>>, fieldPrefix: string, label: string }) => {
    return (
        <div className="flex flex-col gap-2 rounded-lg border p-4">
            <FormLabel className="text-sm font-semibold">{label}</FormLabel>
            <FormField
                control={form.control}
                name={`${fieldPrefix}.name` as any}
                render={({ field }) => (
                    <FormItem>
                        <FormLabel className='text-xs font-normal'>{ptBr.ptForm.signerName}</FormLabel>
                        <FormControl><Input {...field} placeholder={ptBr.ptForm.signerNamePlaceholder} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />
            <AssinafyContactFields form={form} fieldPrefix={fieldPrefix} />
            <AssinafyBadge />
        </div>
    );
  };


export function PTForm({ form }: PTFormProps) {
    const { control } = form;

    const enableEspacoConfinado = useWatch({ control, name: 'pt.ptEnableEspacoConfinado' });
    const enableVigia = useWatch({ control, name: 'pt.ptEnableVigia' });
    const enableResgatistas = useWatch({ control, name: 'pt.ptEnableResgatistas' });

    return (
        <div className="space-y-6">
          <Separator />
          <h3 className="text-lg font-semibold">{ptBr.ptForm.title}</h3>
          
          {/* Header Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                  control={control}
                  name="pt.ptLocalAtividade"
                  render={({ field }) => (
                      <FormItem>
                          <FormLabel>{ptBr.ptForm.location}</FormLabel>
                          <FormControl><Input {...field} /></FormControl>
                          <FormMessage />
                      </FormItem>
                  )}
              />
              <FormField
                  control={control}
                  name="pt.ptEquipamentoLinha"
                  render={({ field }) => (
                      <FormItem>
                          <FormLabel>{ptBr.ptForm.equipment}</FormLabel>
                          <FormControl><Input {...field} /></FormControl>
                          <FormMessage />
                      </FormItem>
                  )}
              />
              <FormField
                  control={control}
                  name="pt.ptData"
                  render={({ field }) => (
                      <FormItem>
                          <FormLabel>{ptBr.ptForm.date}</FormLabel>
                          <FormControl><Input type="date" {...field} /></FormControl>
                          <FormMessage />
                      </FormItem>
                  )}
              />
              <div className="grid grid-cols-2 gap-2">
                <FormField
                    control={control}
                    name="pt.ptHoraInicio"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>{ptBr.ptForm.startTime}</FormLabel>
                            <FormControl><Input type="time" {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={control}
                    name="pt.ptHoraFim"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>{ptBr.ptForm.endTime}</FormLabel>
                            <FormControl><Input type="time" {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
              </div>
          </div>
           <FormField
              control={control}
              name="pt.ptDescricaoTarefa"
              render={({ field }) => (
                  <FormItem>
                      <FormLabel>{ptBr.ptForm.taskDescription}</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                      <FormMessage />
                  </FormItem>
              )}
          />

          {/* Checklist sections */}
          {ptChecklistItems.map((section) => (
            <div key={section.id}>
                <SectionTitle>{ptBr.ptChecklist.titles[section.id as keyof typeof ptBr.ptChecklist.titles]}</SectionTitle>
                <div className={`grid grid-cols-1 ${section.columns === 2 ? 'md:grid-cols-2' : ''} ${section.columns === 3 ? 'md:grid-cols-3' : ''} gap-x-8 gap-y-3`}>
                    {section.items.map((item) => (
                       <CheckboxField key={item.id} form={form} name={`pt.ptChecklist.${item.id}`} label={ptBr.ptChecklist.items[item.id as keyof typeof ptBr.ptChecklist.items]} />
                    ))}
                </div>
            </div>
          ))}

          <Separator />
          
          <DynamicTeamSection form={form} name="pt.ptColaboradores" title={ptBr.ptForm.collaborators} showEmpresa={true} />

          {/* Optional Sections Toggles */}
          <div className='space-y-4 rounded-lg border p-4'>
            <FormField
              control={form.control}
              name="pt.ptEnableEspacoConfinado"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between">
                  <FormLabel>{ptBr.ptForm.confinedSpace}</FormLabel>
                  <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                </FormItem>
              )}
            />
            {enableEspacoConfinado && (
              <div className="border-t pt-4 mt-4">
                  <SectionTitle>{ptBr.ptForm.confinedSpaceTitle}</SectionTitle>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <FormField control={control} name="pt.ptOxigenio" render={({ field }) => (<FormItem><FormLabel>{ptBr.ptForm.oxygen}</FormLabel><FormControl><Input {...field} placeholder={ptBr.ptForm.oxygenPlaceholder} /></FormControl></FormItem>)} />
                    <FormField control={control} name="pt.ptLE" render={({ field }) => (<FormItem><FormLabel>{ptBr.ptForm.le}</FormLabel><FormControl><Input {...field} placeholder={ptBr.ptForm.lePlaceholder} /></FormControl></FormItem>)} />
                    <FormField control={control} name="pt.ptH2S" render={({ field }) => (<FormItem><FormLabel>{ptBr.ptForm.h2s}</FormLabel><FormControl><Input {...field} placeholder={ptBr.ptForm.h2sPlaceholder} /></FormControl></FormItem>)} />
                    <FormField control={control} name="pt.ptCO2" render={({ field }) => (<FormItem><FormLabel>{ptBr.ptForm.co2}</FormLabel><FormControl><Input {...field} placeholder={ptBr.ptForm.co2Placeholder} /></FormControl></FormItem>)} />
                    <FormField control={control} name="pt.ptObservacao" render={({ field }) => (<FormItem><FormLabel>{ptBr.ptForm.observation}</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
                    <FormField control={control} name="pt.ptVisto" render={({ field }) => (<FormItem><FormLabel>{ptBr.ptForm.signature}</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
                  </div>
              </div>
            )}
            <Separator />
            <FormField
              control={form.control}
              name="pt.ptEnableVigia"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between">
                  <FormLabel>{ptBr.ptForm.needsLookout}</FormLabel>
                  <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                </FormItem>
              )}
            />
             {enableVigia && (
              <div className="border-t pt-4 mt-4">
                 <DynamicTeamSection form={form} name="pt.ptVigias" title={ptBr.ptForm.lookouts} showEmpresa={false} />
              </div>
            )}
            <Separator />
             <FormField
              control={form.control}
              name="pt.ptEnableResgatistas"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between">
                  <FormLabel>{ptBr.ptForm.needsRescueTeam}</FormLabel>
                  <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                </FormItem>
              )}
            />
            {enableResgatistas && (
                <div className="border-t pt-4 mt-4">
                    <DynamicTeamSection form={form} name="pt.ptResgatistas" title={ptBr.ptForm.rescueTeam} showEmpresa={true} />
                </div>
            )}
          </div>
          
           {/* Signatures */}
          <SectionTitle>{ptBr.ptForm.signatures}</SectionTitle>
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <SignerField form={form} fieldPrefix="pt.ptGestorArea" label={ptBr.ptForm.areaManager} />
                <SignerField form={form} fieldPrefix="pt.ptResponsavelAtividade" label={ptBr.ptForm.activityResponsible} />
                <SignerField form={form} fieldPrefix="pt.ptSesmt" label={ptBr.ptForm.sesmt} />
           </div>


        </div>
      );
}
