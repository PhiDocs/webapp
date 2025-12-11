
import type { Content, TableCell } from 'pdfmake/interfaces';
import type { SafetyFormValues, PtSigner } from '@/lib/types';
import type { SafetyAnalysisOutput } from '@/ai/flows/generate-safety-analysis';
import type { ProtectiveEquipmentOutput } from '@/ai/flows/recommend-protective-equipment';


const isValidBase64 = (str: string | undefined): boolean => {
    if (!str || !str.includes(',')) return false;
    try {
        atob(str.split(',')[1]);
        return true;
    } catch (e) {
        console.error("Invalid Base64 string detected:", str.substring(0, 50) + "...");
        return false;
    }
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
        return { text: '', minHeight: 40, border: [false, false, false, true], borderColor: ['#000', '#000', '#000', '#000'] };
    }
    if (signer.signatureType === 'typed') {
        return { text: signer.signatureData, alignment: 'center', margin: [0, 15, 0, 0], border: [false, false, false, true], borderColor: ['#000', '#000', '#000', '#000'], italics: true, fontSize: 16 };
    }
    if ((signer.signatureType === 'draw' || signer.signatureType === 'upload') && isValidBase64(signer.signatureData)) {
        return { image: signer.signatureData, width: 120, alignment: 'center', margin: [0, 5, 0, 0] };
    }
    return { text: '', minHeight: 40, border: [false, false, false, true], borderColor: ['#000', '#000', '#000', '#000'] };
};

// --- APR Document Generation ---
export function generateAPRPages(formData: SafetyFormValues, analysisData: SafetyAnalysisOutput | null, equipmentData: ProtectiveEquipmentOutput | null): Content[] {
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
                                    (formData.companyLogo && isValidBase64(formData.companyLogo) ? { image: formData.companyLogo, width: 70, alignment: 'left' } : {
                                        // Placeholder SVG for logo - a simple shield
                                        canvas: [
                                            {
                                                type: 'path',
                                                d: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
                                                lineWidth: 1,
                                                lineColor: '#555',
                                            },
                                            {
                                                type: 'path',
                                                d: 'm9 12 2 2 4-4',
                                                lineWidth: 1,
                                                lineColor: '#555',
                                            }
                                        ],
                                        width: 40,
                                        height: 40,
                                        margin: [15,0,15,0]
                                    }),
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
                        margin: [0, 0, 0, 10],
                         border: [false, false, false, true],
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
                [{text: 'DADOS DA OBRA', style: 'sectionTitle'}],
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
                    layout: 'boxLayout'
                }]
            ]
        },
        layout: 'sectionLayout',
        marginBottom: 10,
    });

    // --- Responsibles Section ---
    const responsibleBody: TableCell[][] = [
        [{ text: 'NOME', style: 'th' }, { text: 'FUNÇÃO', style: 'th' }, { text: 'ASSINATURA', style: 'th' }]
    ];
    formData.responsiblePersons.forEach(p => {
        responsibleBody.push([
            { text: p.name || '...', style: 'td', alignment: 'left', margin: [5, 15] },
            { text: p.role || '...', style: 'td', alignment: 'left', margin: [5, 15] },
             {stack: [getSignatureContent(p)], border: [true, false, false, false], borderColor: ['#ccc', '#ccc', '#ccc', '#ccc'], margin: [5, 5]},
        ]);
    });

    content.push({
        table: {
            widths: ['*'],
            body: [
                [{text: 'RESPONSÁVEL PELO ACOMPANHAMENTO DOS SERVIÇOS', style: 'sectionTitle'}],
                [{
                    table: {
                        widths: ['*', '*', '*'],
                        body: responsibleBody,
                        dontBreakRows: true,
                    },
                    layout: 'boxLayout'
                }]
            ]
        },
        layout: 'sectionLayout',
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
    if (analysisData && analysisData.proceduralSteps && analysisData.proceduralSteps.length > 0) {
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
            body: [
                [{text: 'PROCEDIMENTO OPERACIONAL', style: 'sectionTitle'}],
                [{
                    table: {
                        widths: [35, '*', '*', '*'],
                        body: analysisBody,
                        headerRows: 1,
                        dontBreakRows: true,
                    },
                    layout: 'boxLayout'
                }]
            ]
        },
        layout: 'sectionLayout',
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
                   [{
                        table: {
                           widths: ['*'],
                           body: [
                               [{text: 'EPI NECESSÁRIO', style: 'sectionTitle'}],
                               [{
                                    stack: [
                                        { ul: epiItems, style: 'td' },
                                        { text: `OBS.: ${equipmentData.epiNote}`, style: 'td', italics: true, fontSize: 8, margin: [0, 10, 0, 0] },
                                    ],
                                    style: 'cellPadding'
                               }]
                           ]
                        },
                        layout: 'sectionLayout'
                   },
                   {
                        table: {
                           widths: ['*'],
                           body: [
                               [{text: 'EPC NECESSÁRIO', style: 'sectionTitle'}],
                               [{
                                    stack: [
                                        { ul: epcItems, style: 'td' },
                                        { text: `OBS.: ${equipmentData.epcNote}`, style: 'td', italics: true, fontSize: 8, margin: [0, 10, 0, 0] },
                                    ],
                                     style: 'cellPadding'
                               }]
                           ]
                        },
                        layout: 'sectionLayout'
                   }]
                ],
                dontBreakRows: true,
            },
            layout: {
                hLineWidth: () => 0,
                vLineWidth: () => 0,
                paddingLeft: (i) => (i === 0 ? 0 : 4),
                paddingRight: (i, node) => (i === (node.table.widths?.length || 0) - 1 ? 0 : 4),
            },
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
                    [{text: 'EQUIPE DE TRABALHO', style: 'sectionTitle'}],
                    [{
                        table: {
                            widths: ['auto', '*', '*'],
                            body: teamBody,
                            dontBreakRows: true,
                        },
                        layout: 'boxLayout'
                    }]
                ]
            },
            layout: 'sectionLayout',
            marginBottom: 10,
        });
    }

    return content;
}

    
    