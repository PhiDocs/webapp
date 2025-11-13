'use client';

import type { TDocumentDefinitions, Content, TableCell, Style } from 'pdfmake/interfaces';
import type { SafetyFormValues, PtTeamMember, PtSigner } from '@/lib/types';
import type { SafetyAnalysisOutput } from '@/ai/flows/generate-safety-analysis';
import type { ProtectiveEquipmentOutput } from '@/ai/flows/recommend-protective-equipment';
import { ptChecklistItems } from '@/lib/pt-checklist-data';

// Import pdfmake and fonts
import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";

if (pdfMake.vfs) {
    pdfMake.vfs = pdfFonts.pdfMake.vfs;
}


function getShortDate(dateString: string | undefined) {
    if (!dateString) return '...';
    try {
        const date = new Date(dateString);
        const zonedDate = new Date(date.valueOf() + date.getTimezoneOffset() * 60 * 1000);
        return zonedDate.toLocaleDateString('pt-BR');
    } catch (e) {
        return 'Data inválida';
    }
}

const getSignatureContent = (signer: PtSigner | any): Content => {
    if (!signer || !signer.signatureData) {
        return { text: '', minHeight: 40, border: [false, true, false, false] };
    }
    if (signer.signatureType === 'typed') {
        return { text: signer.signatureData, alignment: 'center', margin: [0, 15, 0, 0], border: [false, true, false, false], italics: true, fontSize: 16 };
    }
    if (signer.signatureType === 'draw' || signer.signatureType === 'upload') {
        try {
            // Basic validation for base64
            atob(signer.signatureData.split(',')[1]);
            return { image: signer.signatureData, width: 120, alignment: 'center', margin: [0, 5, 0, 0], border: [false, true, false, false] };
        } catch(e) {
            console.error("Invalid base64 for signature", e);
            return { text: 'Assinatura inválida', color: 'red', alignment: 'center' };
        }
    }
    return { text: '', minHeight: 40 };
};


// --- APR Document Generation ---
function generateAPRPages(formData: SafetyFormValues, analysisData: SafetyAnalysisOutput | null, equipmentData: ProtectiveEquipmentOutput | null): Content[] {
    const content: Content[] = [];

    // --- Header ---
    const headerTable: Content = {
        table: {
            widths: ['*', 'auto'],
            body: [
                [
                    {
                        stack: [
                            {
                                // Company Name and Logo
                                columns: [
                                    ...(formData.companyLogo ? [{ image: formData.companyLogo, width: 70, alignment: 'left' }] : []),
                                    {
                                        stack: [
                                            { text: formData.companyName || 'Nome da Empresa', style: 'h1', alignment: 'left' },
                                            { text: 'APR - Análise Preliminar de Risco', bold: true, fontSize: 12, alignment: 'left', margin: [0, 4, 0, 0] }
                                        ],
                                        margin: formData.companyLogo ? [10, 0, 0, 0] : [0, 0, 0, 0]
                                    }
                                ],
                            },
                        ],
                        margin: [0, 0, 0, 10]
                    },
                    {
                        table: {
                             widths: ['*', '*'],
                             body: [
                                 [{ text: 'APR Nº', style: 'thHeader' }, { text: 'Revisão', style: 'thHeader' }],
                                 [{ text: '...', style: 'td', minHeight: 15 }, { text: '01', style: 'td', minHeight: 15 }],
                             ]
                         },
                         layout: 'boxLayout'
                    }
                ],
            ]
        },
        layout: 'noBorders',
        marginBottom: 10,
    };
    content.push(headerTable);


    // --- Work Data Section ---
    content.push({
        table: {
            widths: ['*'],
            body: [
                [{ text: 'DADOS DA OBRA', style: 'sectionTitle' }],
                [{
                    table: {
                        widths: ['*', '*'],
                        body: [
                            [
                                { stack: [{ text: 'NOME:', style: 'label' }, { text: formData.workName || '...', style: 'value' }], style: 'cellPadding' },
                                { stack: [{ text: 'ENDEREÇO:', style: 'label' }, { text: formData.workAddress || '...', style: 'value' }], style: 'cellPadding' },
                            ],
                            [
                                { stack: [{ text: 'PREVISÃO DATA INICIO:', style: 'label' }, { text: getShortDate(formData.startDate), style: 'value' }], style: 'cellPadding' },
                                { stack: [{ text: 'PREVISÃO DATA TÉRMINO:', style: 'label' }, { text: getShortDate(formData.endDate), style: 'value' }], style: 'cellPadding' },
                            ],
                            [
                                { stack: [{ text: 'LOCAL DA OBRA / PAVIMENTO:', style: 'label' }, { text: formData.workLocationDetails || '...', style: 'value' }], colSpan: 2, style: 'cellPadding' },
                                {}
                            ],
                            [
                                { stack: [{ text: 'DESCRIÇÃO DA ATIVIDADE:', style: 'label' }, { text: formData.activityDescription || '...', style: 'value' }], colSpan: 2, style: 'cellPadding' },
                                {}
                            ]
                        ]
                    },
                    layout: 'boxLayoutNoTop',
                }]
            ]
        },
        layout: 'boxLayout',
        marginBottom: 10,
    });

    // --- Responsibles Section ---
    const responsibleBody: TableCell[][] = [
        [{ text: 'NOME', style: 'th' }, { text: 'FUNÇÃO', style: 'th' }, { text: 'ASSINATURA', style: 'th' }]
    ];
    formData.responsiblePersons.forEach(p => {
        responsibleBody.push([
            { text: p.name || '...', style: 'td', alignment: 'left' },
            { text: p.role || '...', style: 'td', alignment: 'left' },
            getSignatureContent(p)
        ]);
    });

    content.push({
        table: {
            widths: ['*'],
            dontBreakRows: true,
            body: [
                [{ text: 'RESPONSÁVEL PELO ACOMPANHAMENTO DOS SERVIÇOS', style: 'sectionTitle' }],
                [{
                    table: {
                        widths: ['*', '*', '*'],
                        body: responsibleBody,
                        dontBreakRows: true,
                    },
                    layout: 'boxLayoutNoTop',
                }]
            ]
        },
        layout: 'boxLayout',
        marginBottom: 10,
    });


    // --- Analysis Section ---
    const analysisBody: TableCell[][] = [
        [
            { text: 'ITEM', style: 'th' },
            { text: 'ATIVIDADES', style: 'th' },
            { text: 'RISCOS POTENCIAIS', style: 'th' },
            { text: 'MEDIDAS PREVENTIVAS / RECOMENDAÇÕES DE SEGURANÇA', style: 'th' }
        ]
    ];
    if (analysisData?.proceduralSteps) {
        analysisData.proceduralSteps.forEach(s => {
            analysisBody.push([
                { text: s.item, style: 'td', alignment: 'center' },
                { text: s.activity, style: 'td' },
                { text: s.potentialRisks, style: 'td' },
                { text: s.preventiveMeasures, style: 'td' },
            ]);
        });
    } else {
        analysisBody.push([
            { text: 'A análise de procedimento operacional aparecerá aqui após ser gerada.', style: 'td', colSpan: 4, alignment: 'center', italics: true, margin: [0, 20, 0, 20] }, {}, {}, {}
        ]);
    }
    content.push({
        table: {
            widths: ['*'],
            dontBreakRows: true,
            body: [
                [{ text: 'PROCEDIMENTO OPERACIONAL', style: 'sectionTitle' }],
                [{
                    table: {
                        widths: [35, '*', '*', '*'],
                        body: analysisBody,
                        dontBreakRows: true,
                    },
                    layout: 'boxLayoutNoTop',
                }]
            ]
        },
        layout: 'boxLayout',
        marginBottom: 10,
    });

    // --- Equipment Section ---
    if (equipmentData) {
        const epiItems = equipmentData.epiItems.map(item => ({ text: item, style: 'listItem' }));
        const epcItems = equipmentData.epcItems.map(item => ({ text: item, style: 'listItem' }));

        content.push({
            table: {
                widths: ['*', '*'],
                body: [
                    [{ text: 'EPI NECESSÁRIO', style: 'sectionTitle' }, { text: 'EPC NECESSÁrio', style: 'sectionTitle' }],
                    [
                        { border: [true, false, true, true], padding: [5,5,5,5], stack: [
                            { ul: epiItems, style: 'td' },
                            { text: `OBS.: ${equipmentData.epiNote}`, style: 'td', italics: true, fontSize: 8, margin: [0, 10, 0, 0] },
                        ]},
                        { border: [true, false, true, true], padding: [5,5,5,5], stack: [
                            { ul: epcItems, style: 'td' },
                            { text: `OBS.: ${equipmentData.epcNote}`, style: 'td', italics: true, fontSize: 8, margin: [0, 10, 0, 0] },
                        ]},
                    ]
                ],
                dontBreakRows: true,
            },
            layout: 'boxLayout',
            marginBottom: 10,
        });
    }

    // --- Team Section ---
    if (formData.teamMembers && formData.teamMembers.length > 0) {
        const teamBody: TableCell[][] = [
            [{ text: 'DATA', style: 'th' }, { text: 'NOME', style: 'th' }, { text: 'FUNÇÃO / EMPRESA', style: 'th' }]
        ];
        formData.teamMembers.forEach(m => {
            teamBody.push([
                { text: getShortDate(m.date), style: 'td' },
                { text: m.name, style: 'td' },
                { text: m.role, style: 'td' },
            ]);
        });
         content.push({
            table: {
                widths: ['*'],
                body: [
                    [{ text: 'EQUIPE DE TRABALHO', style: 'sectionTitle' }],
                    [{
                        table: {
                            widths: ['auto', '*', '*'],
                            body: teamBody,
                            dontBreakRows: true,
                        },
                         layout: 'boxLayoutNoTop',
                    }]
                ]
            },
            layout: 'boxLayout',
        });
    }

    return content;
}


const Checkbox = (checked: boolean): Content => ({
    canvas: [
      { type: 'rect', x: 0, y: 0, w: 8, h: 8, r: 1, lineColor: '#000', lineWidth: 0.5 },
      ...(checked ? [{ type: 'rect', x: 1.5, y: 1.5, w: 5, h: 5, color: '#000' }] : [])
    ]
  });

// --- PT Document Generation ---
function generatePTPages(formData: SafetyFormValues): Content[] {
    const { pt: ptData, companyLogo, companyName } = formData;
    const content: Content[] = [];

    const headerContent: TableCell[][] = [
        [
            {
                ...(companyLogo ? { image: companyLogo, width: 70, alignment: 'center', rowSpan: 2 } : {text: '', rowSpan: 2}),
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
        if (!section.items) return;
        
        const allItems: Content[] = section.items.map(item => {
            return {
                columns: [
                    { ...Checkbox(!!checklistData[item.id]), width: 10 },
                    { text: item.label, width: '*', style: 'tdSmall' }
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
            content.push(
                { text: section.title, style: 'sectionTitle' },
                {
                    table: {
                        widths: Array(section.columns).fill('*'),
                        body: sectionBody,
                    },
                    layout: 'boxLayoutNoTop',
                    marginBottom: 5,
                }
            );
        }
    });

    // --- Dynamic Team Tables ---
    const renderTeamTable = (title: string, members: PtTeamMember[], showEmpresa: boolean) => {
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
                    {...Checkbox(m.apto === 'sim'), width: 10}, {text: 'Sim', width: 'auto', style: 'tdSmall'},
                    {...Checkbox(m.apto === 'nao'), width: 10, margin: [5,0,0,0]}, {text: 'Não', width: 'auto', style: 'tdSmall'}
                ],
                columnGap: 2,
                alignment: 'center'
            });
            body.push(row as TableCell[]);
        });
        return [
            { text: title, style: 'sectionTitle' },
            {
                table: {
                    widths: widths,
                    body: body,
                    dontBreakRows: true,
                },
                layout: 'boxLayoutNoTop',
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
    content.push({ text: 'ASSINATURAS', style: 'sectionTitle' });
    content.push({
        table: {
            widths: ['*', '*', '*'],
            body: [
                [
                    getSignatureContent(ptData.ptGestorArea),
                    getSignatureContent(ptData.ptResponsavelAtividade),
                    getSignatureContent(ptData.ptSesmt),
                ],
                [
                    {text: ptData.ptGestorArea?.name || 'Gestor da Área', style: 'td', alignment: 'center', border: [false, false, false, false]},
                    {text: ptData.ptResponsavelAtividade?.name || 'Responsável Atividade', style: 'td', alignment: 'center', border: [false, false, false, false]},
                    {text: ptData.ptSesmt?.name || 'SESMT', style: 'td', alignment: 'center', border: [false, false, false, false]},
                ]
            ]
        },
        layout: 'noBorders',
        marginBottom: 10,
    });


    return content;
}


// --- Main PDF Generation Function ---
export function generatePdf(
  formData: SafetyFormValues,
  analysisData: SafetyAnalysisOutput | null,
  equipmentData: ProtectiveEquipmentOutput | null
): Promise<{ fileName: string; dataUrl: string }> {
  return new Promise((resolve, reject) => {
    try {
      const docDefinition: TDocumentDefinitions = {
        pageSize: 'A4',
        pageMargins: [25, 25, 25, 40], // [left, top, right, bottom]
        
        content: formData.documentType === 'APR'
            ? generateAPRPages(formData, analysisData, equipmentData)
            : generatePTPages(formData),

        footer: function (currentPage, pageCount) {
            return {
                columns: [
                    { text: formData.companyName || 'Safety Docs AI', alignment: 'left', margin: [25, 0, 0, 0] },
                    { text: `${currentPage} / ${pageCount}`, alignment: 'right', margin: [0, 0, 25, 0] }
                ],
                fontSize: 8,
                color: '#555',
                margin: [0, 20, 0, 0],
            };
        },
        styles: {
            h1: { fontSize: 16, bold: true },
            sectionTitle: { fontSize: 10, bold: true, background: '#E0E0E0', color: '#000', alignment: 'center', margin: [0, 0, 0, 0] },
            th: { bold: true, fontSize: 9, alignment: 'center', fillColor: '#E0E0E0' },
            thHeader: { bold: true, fontSize: 7, alignment: 'center' },
            label: { bold: true, fontSize: 7, textTransform: 'uppercase', color: '#555' },
            value: { fontSize: 9 },
            td: { fontSize: 9, alignment: 'left' },
            tdSmall: { fontSize: 8, alignment: 'left' },
            listItem: { fontSize: 9, margin: [0, 0, 0, 2] },
            cellPadding: { margin: [5, 2, 5, 2] },
        },
        defaultStyle: {
            fontSize: 10,
            lineHeight: 1.15,
            color: '#333',
            alignment: 'left'
        },
        layout: {
            boxLayout: {
                hLineWidth: () => 0.5,
                vLineWidth: () => 0.5,
                hLineColor: () => '#ccc',
                vLineColor: () => '#ccc',
                paddingLeft: (i) => i === 0 ? 5 : 5,
                paddingRight: (i, node) => (i === (node.table.widths?.length || 0) - 1) ? 5 : 5,
                paddingTop: () => 4,
                paddingBottom: () => 4,
            },
            boxLayoutNoTop: {
                 hLineWidth: (i, node) => (i === 0) ? 0 : 0.5,
                vLineWidth: () => 0.5,
                hLineColor: () => '#ccc',
                vLineColor: () => '#ccc',
                paddingLeft: (i) => i === 0 ? 5 : 5,
                paddingRight: (i, node) => (i === (node.table.widths?.length || 0) - 1) ? 5 : 5,
                paddingTop: () => 4,
                paddingBottom: () => 4,
            }
        }
      };

      const docName = formData.documentType === 'APR' ? 'APR' : 'PT';
      const fileName = `${docName}-${(formData.companyName || 'doc').replace(/ /g, "_")}-${new Date().toLocaleDateString('pt-br').replace(/\//g, '-')}.pdf`;

      const pdfDoc = pdfMake.createPdf(docDefinition);
      pdfDoc.getDataUrl((dataUrl) => {
        resolve({ fileName, dataUrl });
      });

    } catch (error) {
      reject(error);
    }
  });
}
