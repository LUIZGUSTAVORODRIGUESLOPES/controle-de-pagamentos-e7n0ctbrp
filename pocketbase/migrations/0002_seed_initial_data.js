migrate(
  (app) => {
    const usersCol = app.findCollectionByNameOrId('_pb_users_auth_')
    let userRecord

    // 1. Check or create the seed user
    try {
      userRecord = app.findAuthRecordByEmail('_pb_users_auth_', 'luiz@globexmultimodal.com.br')
    } catch (_) {
      userRecord = new Record(usersCol)
      userRecord.setEmail('luiz@globexmultimodal.com.br')
      userRecord.setPassword('Skip@Pass')
      userRecord.setVerified(true)
      userRecord.set('name', 'Luiz Silva')
      app.save(userRecord)
    }

    const pagamentosCol = app.findCollectionByNameOrId('pagamentos')

    // 2. Define seed payments
    const seedPayments = [
      {
        Mes_Ano: '12/2024',
        Tipo_Pagamento: 'Mensalidade Padrão',
        Data_Pagamento: '2024-12-05 09:00:00.000Z',
        Valor_Base: 1871.25,
        Dias_Ferias_Gozadas: 0,
        Dias_Ferias_Vendidas: 0,
        Valor_Liquido: 1871.25,
        Status: 'Pago',
      },
      {
        Mes_Ano: '11/2024',
        Tipo_Pagamento: '13º Salário - 1ª Parcela',
        Data_Pagamento: '2024-11-29 09:00:00.000Z',
        Valor_Base: 1871.25,
        Dias_Ferias_Gozadas: 0,
        Dias_Ferias_Vendidas: 0,
        Valor_Liquido: 935.63, // 1871.25 / 2 = 935.625 ~ 935.63
        Status: 'Pago',
      },
      {
        Mes_Ano: '12/2024',
        Tipo_Pagamento: '13º Salário - Integral',
        Data_Pagamento: '2024-12-20 09:00:00.000Z',
        Valor_Base: 1871.25,
        Dias_Ferias_Gozadas: 0,
        Dias_Ferias_Vendidas: 0,
        Valor_Liquido: 1871.25,
        Status: 'Pendente',
      },
    ]

    // 3. Insert each seed record idempotently
    for (const item of seedPayments) {
      const existing = app.findRecordsByFilter(
        'pagamentos',
        `user = '${userRecord.id}' && Mes_Ano = '${item.Mes_Ano}' && Tipo_Pagamento = '${item.Tipo_Pagamento}'`,
        '',
        1,
        0,
      )

      if (existing.length === 0) {
        const record = new Record(pagamentosCol)
        record.set('user', userRecord.id)
        record.set('Mes_Ano', item.Mes_Ano)
        record.set('Data_Pagamento', item.Data_Pagamento)
        record.set('Tipo_Pagamento', item.Tipo_Pagamento)
        record.set('Valor_Base', item.Valor_Base)
        record.set('Dias_Ferias_Gozadas', item.Dias_Ferias_Gozadas)
        record.set('Dias_Ferias_Vendidas', item.Dias_Ferias_Vendidas)
        record.set('Valor_Liquido', item.Valor_Liquido)
        record.set('Status', item.Status)
        app.save(record)
      }
    }
  },
  (app) => {
    try {
      const user = app.findAuthRecordByEmail('_pb_users_auth_', 'luiz@globexmultimodal.com.br')
      const records = app.findRecordsByFilter('pagamentos', `user = '${user.id}'`, '', 100, 0)
      for (const rec of records) {
        app.delete(rec)
      }
    } catch (_) {}
  },
)
