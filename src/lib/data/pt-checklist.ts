export const ptChecklistItems = [
    {
      id: 'tipo_atividade',
      title: 'TIPO DE ATIVIDADE',
      columns: 2,
      items: [
        { id: 'trabalho_frio', label: 'Trabalho a Frio' },
        { id: 'espaco_confinado', label: 'Espaço Confinado' },
        { id: 'escavacoes', label: 'Escavações' },
        { id: 'movimentacao_carga', label: 'Movimentação de Carga' },
        { id: 'trabalho_quente', label: 'Trabalho a Quente' },
        { id: 'trabalho_altura', label: 'Trabalho em Altura' },
        { id: 'eletricidade', label: 'Eletricidade' },
        { id: 'limpeza_maquinas', label: 'Limpeza de Máquinas' },
      ],
    },
    {
        id: 'equipamentos_utilizados',
        title: 'EQUIPAMENTOS UTILIZADOS',
        columns: 2,
        items: [
            { id: 'solda_macarico', label: 'Solda/Maçarico' },
            { id: 'lixadeira_furadeira', label: 'Lixadeira/Furadeira' },
            { id: 'ferramentas_pneumaticas', label: 'Ferramentas Pneumáticas' },
            { id: 'ferramentas_manuais', label: 'Ferramentas Manuais' },
            { id: 'guindaste_munck', label: 'Guindaste/Munck' },
            { id: 'pta', label: 'PTA' },
            { id: 'retroescavadeira', label: 'Retroescavadeira' },
            { id: 'equipamento_hidraulico', label: 'Equipamento Hidráulico' },
            { id: 'pa_carregadeira', label: 'Pá Carregadeira' },
            { id: 'empilhadeira', label: 'Empilhadeira' },
            { id: 'hidro_jato', label: 'Hidro Jato' },
            { id: 'ponte_rolante_portico', label: 'Ponte Rolante/Pórtico' },
        ]
    },
    {
        id: 'precaucoes_risco',
        title: 'PRECAUÇÕES OBRIGATÓRIAS PARA QUALQUER NATUREZA DE RISCO',
        columns: 2,
        items: [
            { id: 'parar_drenar', label: 'Parar, despressurizar e drenar equipamentos/linhas', column: 1 },
            { id: 'limpar_equipamentos', label: 'Limpar equipamentos/linhas', column: 1 },
            { id: 'chuveiro_emergencia', label: 'Chuveiro de Emergência disponível e, em funcionamento', column: 1 },
            { id: 'bloqueio_eqptos', label: 'Solicitar bloqueio dos Eqptos e verificar cartões dos executantes', column: 1 },
            { id: 'art_responsavel', label: 'Solicitar a ART do responsável pela execução', column: 1 },
            { id: 'verificar_acesso_saida', label: 'Verificar acesso e saída de pessoal da área', column: 1 },
            { id: 'bloqueio_energias_perigosas', label: 'Solicitar bloqueio de energias perigosas', column: 1 },
            { id: 'bloqueio_fonte_radioativa', label: 'Solicitar bloqueio de fonte radioativa', column: 1 },
            { id: 'verificar_pt_diaria', label: 'Verificar PT diária', column: 1 },
            
            { id: 'rasquetear_fluido', label: 'Rasquetear a entrada e saída de fluidos', column: 2 },
            { id: 'emitir_cartao_bloqueio', label: 'Emitir cartão de bloqueio de energias perigosas nº do cartão', column: 2 },
            { id: 'retirar_correntes', label: 'Retirar correntes, correias de transmissão etc.', column: 2 },
            { id: 'aterrar_eletricamente', label: 'Aterrar eletricamente eqptos, linhas e ferramentas', column: 2 },
            { id: 'verificar_acesso_pessoas', label: 'Verificar acesso e saída de pessoas/eqptos', column: 2 },
            { id: 'proteger_canaletas', label: 'Proteger canaletas, esgotos, bueiros e aberturas', column: 2 },
            { id: 'treinar_orientar_equipe', label: 'Treinar e orientar toda equipe, sobre os riscos da atividade e, uso dos EPIs', column: 2 },
            { id: 'manter_apr_pt_visivel', label: 'Manter a APR e PT em local visível', column: 2 },
            { id: 'acionar_sesmt_risco', label: 'Qualquer situação de risco eminente acionar o SESMT', column: 2 },
        ]
    },
    {
        id: 'precaucoes_quente',
        title: 'PRECAUÇÕES OBRIGATÓRIAS PARA TRABALHO A QUENTE',
        columns: 2,
        items: [
            { id: 'detectar_inflamaveis', label: 'Detectar a presença de inflamáveis/Produtos Químicos' },
            { id: 'prover_eqptos_incendio', label: 'Prover eqptos de combate a incêndios' },
            { id: 'solicitar_liberacao_operador', label: 'Solicitar presença/liberação do operador' },
            { id: 'isolar_sinalizar_agua', label: 'Isolar/sinalizar áreas de trabalho com água, chapas, mantas etc.' },
            { id: 'verificar_valvulas_corta_chama', label: 'Verificar válvulas corta chamas de oxiacetileno' },
            { id: 'quente_acionar_sesmt_risco', label: 'Qualquer situação de risco eminente acionar o SESMT' },
        ]
    },
    {
        id: 'precaucoes_altura',
        title: 'PRECAUÇÕES PARA TRABALHO EM ALTURA',
        columns: 2,
        items: [
            { id: 'isolar_fita_zebrada', label: 'Isolar c/ fita zebrada ou correntes a área' },
            { id: 'verificar_atracamento_escadas', label: 'Verificar atracamento de escadas ou andaimes' },
            { id: 'inspecionar_eqptos_altura', label: 'Inspecionar eqptos (cintos, cordas, talabartes, balancins etc.)' },
            { id: 'verificar_cabos_eletricos', label: 'Verificar a existência de cabos elétricos' },
            { id: 'pranchoes_madeira', label: 'Pranchões de madeira fixados/travados' },
            { id: 'isolar_guarda_corpo', label: 'Isolar guarda-corpo' },
            { id: 'instalar_cabos_guias', label: 'Instalar cabos guias, linhas de vida' },
            { id: 'amarrar_ferramentas', label: 'Amarrar as ferramentas' },
            { id: 'altura_acionar_sesmt_risco', label: 'Qualquer situação de risco eminente acionar o SESMT' },
        ]
    },
    {
        id: 'epis',
        title: "EQUIPAMENTOS DE PROTEÇÃO INDIVIDUAL - EPI's",
        columns: 3,
        items: [
            { id: 'epi_mascara', label: 'Máscara: autônoma/ar/solda' },
            { id: 'epi_luva', label: 'Luva: raspa/PVC/elétrica' },
            { id: 'epi_cordas', label: 'Cordas; nylon/cizal' },
            { id: 'epi_abafador', label: 'Abafador de ruído tipo concha' },

            { id: 'epi_avental', label: 'Avental: raspa/PVC/trevira' },
            { id: 'epi_cinto_paraquedista', label: 'Cinto: paraquedista 2 talabartes' },
            { id: 'epi_trava_quedas', label: 'Trava-quedas' },
            { id: 'epi_camisa_longa', label: 'Camisa manga longa' },

            { id: 'epi_bota', label: 'Bota: PVC/couro/borracha' },
            { id: 'epi_macacao', label: 'Macacão: Tyvek/antiácido' },
            { id: 'epi_protetor_auricular', label: 'Protetor auricular' },
            { id: 'epi_lanternas', label: 'Lanternas' },

            { id: 'epi_capacete', label: 'Capacete c/ jugular' },
            { id: 'epi_prot_facial', label: 'Prot. Facial acoplado ao capacete' },
            { id: 'epi_oculos', label: 'Óculos de Segurança' },
            { id: 'epi_uniforme', label: 'Uniforme' },
        ]
    }
  ];

    