'use client';

import type { TDocumentDefinitions, Content } from 'pdfmake/interfaces';
import type { SafetyFormValues } from '@/lib/types';
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
    content.push({ text: 'DADOS DA OBRA', style: 'sectionTitle' });
    content.push({
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
        layout: 'boxLayout',
        marginBottom: 10,
    });

    // --- Responsibles Section ---
    content.push({ text: 'RESPONSÁVEL PELO ACOMPANHAMENTO DOS SERVIÇOS', style: 'sectionTitle' });
    const responsibleBody = [
        [{ text: 'NOME', style: 'th' }, { text: 'FUNÇÃO', style: 'th' }, { text: 'ASSINATURA', style: 'th' }]
    ];
    formData.responsiblePersons.forEach(p => {
        responsibleBody.push([
            { text: p.name || '...', style: 'td' },
            { text: p.role || '...', style: 'td' },
            { text: p.signature || '...', style: 'td', italics: true },
        ]);
    });
    content.push({
        table: {
            widths: ['*', '*', '*'],
            body: responsibleBody,
            dontBreakRows: true,
        },
        layout: 'boxLayout',
        marginBottom: 10,
    });

    // --- Analysis Section ---
    content.push({ text: 'PROCEDIMENTO OPERACIONAL', style: 'sectionTitle' });
    const analysisBody = [
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
            widths: [35, '*', '*', '*'],
            body: analysisBody,
            dontBreakRows: true,
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
                    [{ text: 'EPI NECESSÁRIO A EXECUÇÃO DA ATIVIDADE', style: 'sectionTitle' }, { text: 'EPC NECESSÁRIO A EXECUÇÃO DA ATIVIDADE', style: 'sectionTitle' }],
                    [
                        { ul: epiItems, style: 'td' },
                        { ul: epcItems, style: 'td' },
                    ],
                    [
                        { text: `OBS.: ${equipmentData.epiNote}`, style: 'td', italics: true, fontSize: 8 },
                        { text: `OBS.: ${equipmentData.epcNote}`, style: 'td', italics: true, fontSize: 8 },
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
        content.push({ text: 'EQUIPE DE TRABALHO', style: 'sectionTitle' });
        const teamBody = [
            [{ text: 'DATA', style: 'th' }, { text: 'NOME', style: 'th' }, { text: 'FUNÇÃO / EMPRESA', style: 'th' }, { text: 'ASSINATURA', style: 'th' }]
        ];
        formData.teamMembers.forEach(m => {
            teamBody.push([
                { text: getShortDate(m.date), style: 'td' },
                { text: m.name, style: 'td' },
                { text: m.role, style: 'td' },
                { text: '', style: 'td', minHeight: 15 }, // Empty for signature
            ]);
        });
        content.push({
            table: {
                widths: ['auto', '*', '*', '*'],
                body: teamBody,
                dontBreakRows: true,
            },
            layout: 'boxLayout',
        });
    }

    return content;
}

// --- PT Document Generation ---
function generatePTPages(formData: SafetyFormValues): Content[] {
    const { pt: ptData } = formData;
    const content: Content[] = [];

    // --- Header ---
    content.push({
        table: {
            widths: ['*', '*', 'auto'],
            body: [
                [
                    { text: 'PERMISSÃO DE TRABALHO', style: 'h1', colSpan: 3, alignment: 'center', margin: [0, 5, 0, 5] }, {}, {}
                ],
                [
                    { text: `Local da Atividade: ${ptData.ptLocalAtividade || '...'}`, style: 'td', border: [true, true, true, false] },
                    { text: `Equipamento/Linha: ${ptData.ptEquipamentoLinha || '...'}`, style: 'td', border: [true, true, true, false] },
                    {
                        stack: [
                            {
                                columns: [
                                    { text: 'Empresa e/ou Setor:', width: 'auto', bold: true },
                                    { text: 'Plaskaper', width: 'auto', margin: [5, 0, 5, 0] },
                                    { text: 'KAF', margin: [5, 0, 0, 0] }
                                ]
                            },
                        ],
                        style: 'td',
                        border: [true, true, true, true]
                    }
                ],
                [
                    { text: `Data: ${getShortDate(ptData.ptData)}`, style: 'td', border: [true, false, true, true] },
                    { text: `Início: ${ptData.ptHoraInicio || '...'} Fim: ${ptData.ptHoraFim || '...'}`, style: 'td', border: [true, false, true, true] },
                     { text: `Nº da PT: `, style: 'td', border: [true, false, true, true] },
                ],
                 [
                    { text: `Descrição da Tarefa: ${ptData.ptDescricaoTarefa || '...'}`, style: 'td', colSpan: 3 }, {}, {}
                 ]
            ]
        },
        layout: 'boxLayout',
        marginBottom: 10,
    });

    // --- Checklist ---
    ptChecklistItems.forEach(section => {
        const items = section.items.map(item => ({
            columns: [
                {
                    canvas: [{ type: 'rect', x: 0, y: 0, w: 8, h: 8, r: 1, lineColor: '#000', lineWidth: 0.5, ...(ptData.ptChecklist[item.id] ? { color: '#000' } : {}) }],
                    width: 10
                },
                { text: item.label, width: '*' }
            ],
            margin: [0, 2, 0, 2]
        }));
        
        content.push({ text: section.title, style: 'sectionTitle' });
        content.push({
            columns: section.columns === 2 ?
                [
                    { stack: items.slice(0, Math.ceil(items.length / 2)) },
                    { stack: items.slice(Math.ceil(items.length / 2)) }
                ] :
                 section.columns === 3 ?
                [
                    { stack: items.slice(0, Math.ceil(items.length / 3)) },
                    { stack: items.slice(Math.ceil(items.length / 3), 2 * Math.ceil(items.length / 3)) },
                    { stack: items.slice(2 * Math.ceil(items.length / 3)) }
                ] :
                [{ stack: items }],
            marginBottom: 5,
             style: 'td',
        });
    });

    // --- Signatures ---
    content.push({ text: 'ASSINATURAS', style: 'sectionTitle' });
    content.push({
        table: {
            widths: ['*', '*', '*'],
            body: [
                [
                    { text: ptData.ptGestorArea || 'Gestor da Área', style: 'td', alignment: 'center', margin: [0, 20, 0, 0], border: [false, true, false, false] },
                    { text: ptData.ptResponsavelAtividade || 'Responsável Atividade', style: 'td', alignment: 'center', margin: [0, 20, 0, 0], border: [false, true, false, false] },
                    { text: ptData.ptSesmt || 'SESMT', style: 'td', alignment: 'center', margin: [0, 20, 0, 0], border: [false, true, false, false] },
                ]
            ]
        },
        layout: 'noBorders',
        marginBottom: 10,
    });


    return content;
}


// --- Main PDF Generation Function ---
export async function generatePdf(formData: SafetyFormValues, analysisData: SafetyAnalysisOutput | null, equipmentData: ProtectiveEquipmentOutput | null) {

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
            td: { fontSize: 9, alignment: 'center' },
            listItem: { fontSize: 9, margin: [0, 0, 0, 2] },
            cellPadding: { margin: [0, 2, 0, 2] },
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
                paddingLeft: (i) => i === 0 ? 0 : 8,
                paddingRight: (i, node) => (i === (node.table.widths?.length || 0) - 1) ? 0 : 8,
                paddingTop: () => 4,
                paddingBottom: () => 4,
            }
        }
    };

    const docName = formData.documentType === 'APR' ? 'APR' : 'PT';
    const fileName = `${docName}-${formData.companyName.replace(/ /g, "_")}-${new Date().toLocaleDateString('pt-br').replace(/\//g, '-')}.pdf`;

    pdfMake.createPdf(docDefinition).download(fileName);
}

    