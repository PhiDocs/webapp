'use client';

import { useState } from 'react';

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
import { cn } from '@/lib/utils';
import { PT_FIT_STATUS } from '@/lib/constants';
import {
  controlesSugeridos, exigeEspacoConfinado, exigeResgatista, exigeVigia,
  idsValidos, regrasAtivas, secaoVisivel, type OrigemControle,
} from '@/lib/pt-rules';
import { getPtControlSuggestions } from '@/server/ai-actions';
import { Check, Sparkles } from 'lucide-react';
import { PtSuggestedControls } from './pt-suggested-controls';
import { DocumentActivityPicker } from './document-activity-picker';


interface PTFormProps {
  /** Etapa visivel do assistente. Cada bloco so aparece na etapa dele. */
  passoVisivel?: number;
  /** Participantes e assinaturas passam a ser o seletor de pessoas da APR. */
  pessoasExternas?: boolean;
  recentActivities?: string[];
  similarActivities?: string[];
  form: ReturnType<typeof useForm<SafetyFormValues>>;
}

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
    <h3 className="text-base font-semibold text-primary bg-primary/10 p-2 rounded-md my-4">
      {children}
    </h3>
  );

/**
 * Chave de uma exigencia (espaco confinado, vigia, equipe de resgate).
 *
 * O estado mostrado e o efetivo, nao so o que a pessoa marcou na mao: quando o
 * tipo de atividade ja obriga, a chave aparece ligada e travada, com o motivo
 * do lado. Antes ela ficava apagada enquanto a secao que ela controla aparecia
 * logo abaixo, o que dava a impressao de botao quebrado.
 */
const ExigenciaSwitch = ({
  rotulo,
  ligado,
  porRegra,
  onChange,
}: {
  rotulo: string;
  ligado: boolean;
  porRegra: boolean;
  onChange: (valor: boolean) => void;
}) => (
  <FormItem className="flex flex-row items-center justify-between gap-4">
    <div className="min-w-0">
      <FormLabel>{rotulo}</FormLabel>
      {porRegra && (
        <p className="mt-0.5 text-xs text-[#8a5a00]">
          Obrigatorio para o tipo de atividade marcado. Nao da para desligar.
        </p>
      )}
    </div>
    <FormControl>
      <Switch
        checked={ligado}
        disabled={porRegra}
        onCheckedChange={onChange}
        aria-label={rotulo}
      />
    </FormControl>
  </FormItem>
);

/**
 * Item do checklist. Quando ha sugestao para ele, a marca aparece ao lado do
 * proprio item — e clicar nela marca a caixa, sem tirar a pessoa do contexto.
 */
const CheckboxField = ({
  form,
  name,
  label,
  sugestao,
  onAceitarSugestao,
}: {
  form: UseFormReturn<SafetyFormValues>;
  name: string;
  label: string;
  sugestao?: OrigemControle;
  onAceitarSugestao?: () => void;
}) => (
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
          <FormLabel className="font-normal text-sm">
            {label}
            {sugestao && !form.getValues(name as never) && (
              <button
                type="button"
                onClick={(evento) => {
                  evento.preventDefault();
                  onAceitarSugestao?.();
                }}
                title="Clique para marcar este item"
                className={cn(
                  'ml-2 inline-flex items-center gap-1 rounded-pill border px-2 py-0.5 align-middle text-[10px] font-semibold uppercase tracking-[0.05em] transition-colors',
                  sugestao === 'ia'
                    ? 'border-[#8a5a00] bg-[#faf3e4] text-[#8a5a00] hover:bg-[#f2e6c8]'
                    : 'border-[#1b5e3f] bg-[#eaf2ed] text-[#1b5e3f] hover:bg-[#dde9e2]',
                )}
              >
                {sugestao === 'ia' ? <Sparkles className="h-2.5 w-2.5" /> : <Check className="h-2.5 w-2.5" />}
                {sugestao === 'ia' ? 'Sugestão da IA' : 'Sugerido'}
              </button>
            )}
          </FormLabel>
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
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <FormField
                  control={control}
                  name={`${name}.${index}.email`}
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
                  control={control}
                  name={`${name}.${index}.phone`}
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
              <div className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm text-muted-foreground">
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Mail className="h-3 w-3" />
                  Assinatura por e-mail
                </Badge>
                A assinatura será enviada por e-mail via Assinafy.
              </div>
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
            <div className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm text-muted-foreground">
                <Badge variant="secondary" className="flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    Assinatura por e-mail
                </Badge>
                A assinatura será enviada por e-mail via Assinafy.
            </div>
        </div>
    );
  };


export function PTForm({ form, passoVisivel = 1, pessoasExternas = false, recentActivities = [], similarActivities = [] }: PTFormProps) {
    const { control } = form;

    const checklist = useWatch({ control, name: 'pt.ptChecklist' }) || {};
    // Espaco confinado marcado no checklist ja liga a avaliacao e o vigia.
    const espacoConfinadoPorRegra = exigeEspacoConfinado(checklist);
    const vigiaPorRegra = exigeVigia(checklist);
    const enableEspacoConfinadoManual = useWatch({ control, name: 'pt.ptEnableEspacoConfinado' });
    const enableEspacoConfinado = enableEspacoConfinadoManual || espacoConfinadoPorRegra;
    const enableVigiaManual = useWatch({ control, name: 'pt.ptEnableVigia' });
    const enableVigia = enableVigiaManual || vigiaPorRegra;
    const descricaoTarefa = useWatch({ control, name: 'pt.ptDescricaoTarefa' }) || '';
    const registrosDeControle = useWatch({ control, name: 'pt.ptControlesAdicionados' }) || [];

    // As sugestoes vivem aqui para poderem aparecer ao lado de cada item.
    const [sugestoesIa, setSugestoesIa] = useState<string[]>([]);
    const [motivoIa, setMotivoIa] = useState('');
    const [carregandoIa, setCarregandoIa] = useState(false);
    const [erroIa, setErroIa] = useState('');

    const pedirSugestoes = async () => {
      setCarregandoIa(true);
      setErroIa('');
      const disponiveis = [...idsValidos()].map((id) => ({
        id,
        rotulo: ptBr.ptChecklist.items[id as keyof typeof ptBr.ptChecklist.items] || id,
      }));
      const resultado = await getPtControlSuggestions({
        descricaoTarefa,
        atividadesMarcadas: regrasAtivas(checklist).map((regra) => regra.rotulo),
        idsDisponiveis: disponiveis,
      });
      if (resultado.error || !resultado.data) {
        setErroIa(resultado.error || 'Nao foi possivel gerar sugestoes.');
      } else {
        setSugestoesIa(resultado.data.itemIds);
        setMotivoIa(resultado.data.rationale);
      }
      setCarregandoIa(false);
    };

    // Qual marca cada item recebe. A IA tem prioridade visual sobre a regra.
    const sugestaoPorItem = new Map<string, OrigemControle>();
    for (const item of controlesSugeridos(checklist)) {
      sugestaoPorItem.set(item.itemId, 'regra');
    }
    for (const itemId of sugestoesIa) {
      if (!checklist?.[itemId]) sugestaoPorItem.set(itemId, 'ia');
    }

    // Aplicar e remover controle sempre deixam rastro de onde veio a decisao.
    const aplicarControle = (itemId: string, origem: OrigemControle) => {
      form.setValue(`pt.ptChecklist.${itemId}` as never, true as never, { shouldDirty: true });
      const registros = form.getValues('pt.ptControlesAdicionados') || [];
      const semEste = registros.filter((registro) => registro.itemId !== itemId);
      form.setValue('pt.ptControlesAdicionados', [
        ...semEste,
        { itemId, origem, em: new Date().toISOString() },
      ], { shouldDirty: true });
    };

    const removerControle = (itemId: string) => {
      form.setValue(`pt.ptChecklist.${itemId}` as never, false as never, { shouldDirty: true });
      const registros = form.getValues('pt.ptControlesAdicionados') || [];
      form.setValue('pt.ptControlesAdicionados', registros.map((registro) =>
        registro.itemId === itemId
          ? { ...registro, removidoEm: new Date().toISOString() }
          : registro,
      ), { shouldDirty: true });
    };
    const enableResgatistasManual = useWatch({ control, name: 'pt.ptEnableResgatistas' });
    const resgatistaPorRegra = exigeResgatista(checklist);
    const enableResgatistas = enableResgatistasManual || resgatistaPorRegra;

    return (
        <div className="space-y-6">
          {/* ---------- Etapa: atividade ---------- */}
          <div className={cn('space-y-6', passoVisivel !== 1 && 'hidden')}>
          <div className="overflow-hidden rounded-md border border-[#cfcbc0] bg-white">
            <div className="bg-[#111111] px-5 py-3">
              <h3 className="font-headline text-h3 text-white">Dados da atividade</h3>
              <p className="mt-0.5 text-xs text-white/80">Onde, quando e o que sera feito.</p>
            </div>
            <div className="space-y-4 p-5">
          
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
            </div>
          </div>

          <DocumentActivityPicker
            titulo="Qual e a tarefa?"
            dica="Descreva o que sera executado. Quanto mais detalhe, melhores ficam as sugestoes de controle na proxima etapa."
            placeholder="Ex.: solda no costado do tanque 02, a 8 metros de altura"
            valor={descricaoTarefa}
            onChange={(texto) => form.setValue('pt.ptDescricaoTarefa', texto, { shouldDirty: true, shouldValidate: true })}
            semelhantes={similarActivities}
            recentes={recentActivities}
          />
          </div>

          {/* ---------- Etapa: condicoes e requisitos ---------- */}
          <div className={cn('space-y-6', passoVisivel !== 2 && 'hidden')}>
          <PtSuggestedControls
            checklist={checklist}
            registros={registrosDeControle}
            quantidadeSugerida={sugestaoPorItem.size}
            motivoIa={motivoIa}
            erroIa={erroIa}
            carregandoIa={carregandoIa}
            podeSugerir={descricaoTarefa.trim().length >= 10}
            onPedirSugestoes={pedirSugestoes}
            onRemover={removerControle}
          />

          {ptChecklistItems.filter((section) => secaoVisivel(section.id, checklist)).map((section) => (
            <div key={section.id}>
                <SectionTitle>{ptBr.ptChecklist.titles[section.id as keyof typeof ptBr.ptChecklist.titles]}</SectionTitle>
                <div className={`grid grid-cols-1 ${section.columns === 2 ? 'md:grid-cols-2' : ''} ${section.columns === 3 ? 'md:grid-cols-3' : ''} gap-x-8 gap-y-3`}>
                    {section.items.map((item) => (
                       <CheckboxField
                         key={item.id}
                         form={form}
                         name={`pt.ptChecklist.${item.id}`}
                         label={ptBr.ptChecklist.items[item.id as keyof typeof ptBr.ptChecklist.items]}
                         sugestao={sugestaoPorItem.get(item.id)}
                         onAceitarSugestao={() => aplicarControle(item.id, sugestaoPorItem.get(item.id) || 'manual')}
                       />
                    ))}
                </div>
            </div>
          ))}

          
          </div>

          {/* ---------- Etapa: participantes ---------- */}
          {/*
            Atencao ao que `pessoasExternas` desliga aqui.

            A escolha de colaboradores vem da PersonPicker compartilhada, em
            safety-form, e por isso fica de fora quando a prop esta ligada. Mas
            a avaliacao de espaco confinado, o vigia e o resgatista NAO tem
            equivalente em nenhuma outra tela: se forem escondidos junto, uma PT
            de espaco confinado sai sem o vigia que a NR-33 exige.
          */}
          <div className={cn('space-y-6', passoVisivel !== 3 && 'hidden')}>
          {!pessoasExternas && (
            <DynamicTeamSection form={form} name="pt.ptColaboradores" title={ptBr.ptForm.collaborators} showEmpresa={true} />
          )}

          {/* Optional Sections Toggles */}
          <div className='space-y-4 rounded-lg border p-4'>
            <FormField
              control={form.control}
              name="pt.ptEnableEspacoConfinado"
              render={({ field }) => (
                <ExigenciaSwitch
                  rotulo={ptBr.ptForm.confinedSpace}
                  ligado={enableEspacoConfinado}
                  porRegra={espacoConfinadoPorRegra}
                  onChange={field.onChange}
                />
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
                <ExigenciaSwitch
                  rotulo={ptBr.ptForm.needsLookout}
                  ligado={enableVigia}
                  porRegra={vigiaPorRegra}
                  onChange={field.onChange}
                />
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
                <ExigenciaSwitch
                  rotulo={ptBr.ptForm.needsRescueTeam}
                  ligado={enableResgatistas}
                  porRegra={resgatistaPorRegra}
                  onChange={field.onChange}
                />
              )}
            />
            {enableResgatistas && (
                <div className="border-t pt-4 mt-4">
                    <DynamicTeamSection form={form} name="pt.ptResgatistas" title={ptBr.ptForm.rescueTeam} showEmpresa={true} />
                </div>
            )}
          </div>
          
           {/* Signatures */}
          </div>

          {/* ---------- Etapa: assinaturas ---------- */}
          <div className={cn('space-y-6', (pessoasExternas || passoVisivel !== 4) && 'hidden')}>
          <SectionTitle>{ptBr.ptForm.signatures}</SectionTitle>
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <SignerField form={form} fieldPrefix="pt.ptGestorArea" label={ptBr.ptForm.areaManager} />
                <SignerField form={form} fieldPrefix="pt.ptResponsavelAtividade" label={ptBr.ptForm.activityResponsible} />
                <SignerField form={form} fieldPrefix="pt.ptSesmt" label={ptBr.ptForm.sesmt} />
           </div>


          </div>
        </div>
      );
}
