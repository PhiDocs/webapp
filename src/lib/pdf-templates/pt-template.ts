
import type { Content, TableCell } from 'pdfmake/interfaces';
import type { SafetyFormValues, PtTeamMember, PtSigner } from '@/lib/types';
import { ptChecklistItems } from '@/lib/pt-checklist-data';

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

const Checkbox = (checked: boolean): Content => ({
    canvas: [
      { type: 'rect', x: 0, y: 0, w: 8, h: 8, r: 1, lineColor: '#000', lineWidth: 0.5 },
      ...(checked ? [{ type: 'rect', x: 1.5, y: 1.5, w: 5, h: 5, color: '#000' }] : [])
    ]
  });

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
            content.push({
                table: {
                    widths: ['*'],
                    body: [
                        [{ text: section.title, style: 'sectionTitle' }],
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
                    {...Checkbox(m.apto === 'sim'), width: 10}, {text: 'Sim', width: 'auto', style: 'tdSmall'},
                    {...Checkbox(m.apto === 'nao'), width: 10, margin: [5,0,0,0]}, {text: 'Não', width: 'auto', style: 'tdSmall'}
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

    