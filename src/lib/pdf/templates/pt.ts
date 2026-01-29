import type { SafetyFormValues, PtTeamMember } from '@/lib/types';
import { ptChecklistItems } from '@/lib/data/pt-checklist';
import { ptBr } from '@/lib/data/strings';
import { PT_FIT_STATUS } from '@/lib/constants';

// Type definitions for pdfmake (inline to avoid dependency issues)
type Content = any;
type TableCell = any;

// Helper functions
function getShortDate(dateString: string): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function isValidBase64(str: string | undefined): boolean {
  if (!str) return false;
  try {
    return str.startsWith('data:image');
  } catch {
    return false;
  }
}

function getSignatureContent(signatureData: string | undefined, name: string): Content {
  if (isValidBase64(signatureData)) {
    return { image: signatureData, width: 100, height: 40, alignment: 'center' };
  }
  return { text: name, style: 'signature', alignment: 'center' };
}

function Checkbox(checked: boolean): Content {
  return { text: checked ? '☑' : '☐', fontSize: 12 };
}


// --- PT Document Generation ---
export function generatePTPages(formData: SafetyFormValues): Content[] {
    const { pt: ptData, companyLogo, companyName } = formData;
    const content: Content[] = [];

    const headerContent: TableCell[][] = [
        [
            {
                ...(companyLogo && isValidBase64(companyLogo) ? { image: companyLogo, width: 70, alignment: 'center', rowSpan: 2 } : {text: '', rowSpan: 2}),
                style: 'cellPadding',
                border: [true, true, true, true],
            },
            {
                text: 'PERMISSÃO DE TRABALHO',
                style: 'h1',
                alignment: 'center',
                rowSpan: 2,
            },
            {
                text: companyName || "Nome da Empresa",
                bold: true,
                alignment: 'center',
                style: 'cellPadding'
            }
        ],
        [
            {},
            {},
            {
                table: {
                    widths: ['*', '*'],
                    body: [
                        [
                            {text: `DATA: ${getShortDate(ptData.ptData)}`, style: 'tdSmall'},
                            {text: 'HORA:', style: 'tdSmall'}
                        ]
                    ]
                },
                layout: 'noBorders'
            }
        ],
        [
            {
                stack: [{text: 'LOCAL DA ATIVIDADE:', style: 'label'}, {text: ptData.ptLocalAtividade, style: 'value'}],
                style: 'cellPadding',
                colSpan: 2
            },
            {},
            {
                 table: {
                    widths: ['*', '*'],
                    body: [
                        [
                            {text: `INÍCIO: ${ptData.ptHoraInicio}`, style: 'tdSmall'},
                            {text: `FIM: ${ptData.ptHoraFim}`, style: 'tdSmall'}
                        ]
                    ]
                },
                layout: 'noBorders'
            }
        ],
        [
            {
                stack: [{text: 'EQUIPAMENTO/ LINHA:', style: 'label'}, {text: ptData.ptEquipamentoLinha, style: 'value'}],
                style: 'cellPadding',
                colSpan: 3
            },
            {},
            {}
        ],
        [
            {
                stack: [{text: 'DESCRIÇÃO DA TAREFA:', style: 'label'}, {text: ptData.ptDescricaoTarefa, style: 'value'}],
                style: 'cellPadding',
                colSpan: 3
            },
            {},
            {}
        ]
    ];
    
    content.push({
        table: {
            widths: ['auto', '*', 'auto'],
            body: headerContent,
        },
        layout: 'boxLayout',
        marginBottom: 10,
    });


    // --- Checklist ---
    const checklistData = ptData.ptChecklist || {};
    ptChecklistItems.forEach(section => {
        const checkedItems = section.items.filter(item => checklistData[item.id]);
        if (checkedItems.length === 0) return;
        
        const allItems: Content[] = section.items.map(item => {
            return {
                columns: [
                    { ...Checkbox(!!checklistData[item.id]), width: 10 },
                    { text: ptBr.ptChecklist.items[item.id as keyof typeof ptBr.ptChecklist.items], width: '*', style: 'tdSmall' }
                ],
                columnGap: 5,
                margin: [0, 2, 0, 2]
            };
        });
        
        const sectionBody: Content[][] = [];
         for (let i = 0; i < allItems.length; i += section.columns) {
            const row: Content[] = allItems.slice(i, i + section.columns);
            while (row.length < section.columns) {
                row.push({ text: '' }); // Ensure row is full
            }
            sectionBody.push(row);
        }

        if (sectionBody.length > 0) {
            content.push({
                table: {
                    widths: ['*'],
                    body: [
                        [{ text: ptBr.ptChecklist.titles[section.id as keyof typeof ptBr.ptChecklist.titles], style: 'sectionTitle' }],
                        [{
                            table: {
                                widths: Array(section.columns).fill('*'),
                                body: sectionBody,
                            },
                            layout: 'boxLayout'
                        }]
                    ]
                },
                layout: 'sectionLayout',
                marginBottom: 5,
            });
        }
    });

    // --- Dynamic Team Tables ---
    const renderTeamTable = (title: string, members: PtTeamMember[], showEmpresa: boolean): Content[] => {
        if (!members || members.length === 0) return [];
        const widths = showEmpresa ? ['*', 'auto', 'auto', 'auto', 'auto'] : ['*', 'auto', 'auto', 'auto'];
        const headers: TableCell[] = showEmpresa ? 
            [{ text: 'NOME', style: 'th' }, { text: 'RG/CPF', style: 'th' }, { text: 'FUNÇÃO', style: 'th' }, { text: 'EMPRESA', style: 'th' }, { text: 'APTO', style: 'th' }] :
            [{ text: 'NOME', style: 'th' }, { text: 'RG/CPF', style: 'th' }, { text: 'FUNÇÃO', style: 'th' }, { text: 'APTO', style: 'th' }];

        const body: TableCell[][] = [ headers ];
        
        members.forEach(m => {
            const row: Content[] = [
                { text: m.name, style: 'tdSmall' },
                { text: m.rgCpf, style: 'tdSmall' },
                { text: m.func, style: 'tdSmall' },
            ];
             if (showEmpresa) {
                row.push({ text: m.empresa || '', style: 'tdSmall' });
             }
            row.push({
                columns: [
                    {...Checkbox(m.apto === PT_FIT_STATUS.YES), width: 10}, {text: 'Sim', width: 'auto', style: 'tdSmall'},
                    {...Checkbox(m.apto === PT_FIT_STATUS.NO), width: 10, margin: [5,0,0,0]}, {text: 'Não', width: 'auto', style: 'tdSmall'}
                ],
                columnGap: 2,
                alignment: 'center'
            });
            body.push(row as TableCell[]);
        });
        return [
            {
                table: {
                    widths: ['*'],
                    body: [
                        [{ text: title, style: 'sectionTitle' }],
                        [{
                            table: {
                                widths: widths,
                                body: body,
                                dontBreakRows: true,
                            },
                            layout: 'boxLayout'
                        }]
                    ]
                },
                layout: 'sectionLayout',
                marginBottom: 5,
            }
        ];
    };
    
    content.push(...renderTeamTable('Colaboradores:', ptData.ptColaboradores, true));
    if (ptData.ptEnableVigia) {
        content.push(...renderTeamTable('Vigia(s):', ptData.ptVigias, false));
    }
    if (ptData.ptEnableResgatistas) {
        content.push(...renderTeamTable('Resgatistas:', ptData.ptResgatistas, true));
    }


    // --- Signatures ---
    content.push({
        table: {
            widths: ['*'],
            body: [
                [{text: 'ASSINATURAS', style: 'sectionTitle'}],
                [{
                    table: {
                        widths: ['*', '*', '*'],
                        body: [
                            [
                                {stack: [getSignatureContent(ptData.ptGestorArea), {text: ptData.ptGestorArea?.name || 'Gestor da Área', style: 'td', alignment: 'center', margin:[0,2,0,0] }], border: [false, false, false, false], margin: [5, 5]},
                                {stack: [getSignatureContent(ptData.ptResponsavelAtividade), {text: ptData.ptResponsavelAtividade?.name || 'Responsável Atividade', style: 'td', alignment: 'center', margin:[0,2,0,0] }], border: [false, false, false, false], margin: [5, 5]},
                                {stack: [getSignatureContent(ptData.ptSesmt), {text: ptData.ptSesmt?.name || 'SESMT', style: 'td', alignment: 'center', margin:[0,2,0,0] }], border: [false, false, false, false], margin: [5, 5]},
                            ]
                        ]
                    },
                    layout: 'boxLayout'
                }]
            ]
        },
        layout: 'sectionLayout',
        marginBottom: 10,
    });


    return content;
}
