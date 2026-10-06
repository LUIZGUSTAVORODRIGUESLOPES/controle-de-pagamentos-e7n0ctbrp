migrate(
  (app) => {
    const collection = new Collection({
      name: 'pagamentos',
      type: 'base',
      listRule: "@request.auth.id != '' && user = @request.auth.id",
      viewRule: "@request.auth.id != '' && user = @request.auth.id",
      createRule: "@request.auth.id != '' && user = @request.auth.id",
      updateRule: "@request.auth.id != '' && user = @request.auth.id",
      deleteRule: "@request.auth.id != '' && user = @request.auth.id",
      fields: [
        {
          name: 'user',
          type: 'relation',
          required: true,
          collectionId: '_pb_users_auth_',
          cascadeDelete: true,
          maxSelect: 1,
        },
        {
          name: 'Mes_Ano',
          type: 'text',
          required: true,
        },
        {
          name: 'Data_Pagamento',
          type: 'date',
          required: true,
        },
        {
          name: 'Tipo_Pagamento',
          type: 'select',
          required: true,
          maxSelect: 1,
          values: [
            'Mensalidade Padrão',
            'Férias',
            'Saldo de Salário (pós-férias)',
            '13º Salário - 1ª Parcela',
            '13º Salário - 2ª Parcela',
            '13º Salário - Integral',
          ],
        },
        {
          name: 'Valor_Base',
          type: 'number',
          required: true,
        },
        {
          name: 'Dias_Ferias_Gozadas',
          type: 'number',
          min: 0,
          onlyInt: true,
        },
        {
          name: 'Dias_Ferias_Vendidas',
          type: 'number',
          min: 0,
          onlyInt: true,
        },
        {
          name: 'Valor_Liquido',
          type: 'number',
          required: true,
        },
        {
          name: 'Status',
          type: 'select',
          required: true,
          maxSelect: 1,
          values: ['Pendente', 'Pago'],
        },
        {
          name: 'created',
          type: 'autodate',
          onCreate: true,
          onUpdate: false,
        },
        {
          name: 'updated',
          type: 'autodate',
          onCreate: true,
          onUpdate: true,
        },
      ],
      indexes: [
        'CREATE INDEX idx_pagamentos_status ON pagamentos (Status)',
        'CREATE INDEX idx_pagamentos_data ON pagamentos (Data_Pagamento DESC)',
        'CREATE INDEX idx_pagamentos_user ON pagamentos (user)',
        'CREATE INDEX idx_pagamentos_user_data ON pagamentos (user, Data_Pagamento DESC)',
      ],
    })

    app.save(collection)
  },
  (app) => {
    try {
      const collection = app.findCollectionByNameOrId('pagamentos')
      app.delete(collection)
    } catch (_) {}
  },
)
