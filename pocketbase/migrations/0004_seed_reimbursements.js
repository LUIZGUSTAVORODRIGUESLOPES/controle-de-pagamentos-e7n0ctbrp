migrate(
  (app) => {
    try {
      const user = app.findAuthRecordByEmail('_pb_users_auth_', 'luiz@globexmultimodal.com.br')
      const reimbursementsCol = app.findCollectionByNameOrId('reimbursements')

      const existing = app.findRecordsByFilter(
        'reimbursements',
        `user = '${user.id}' && reference_year = 2024`,
        '',
        1,
        0,
      )

      if (existing.length === 0) {
        // Base salary: 15.000,00
        // 13º = 15.000,00
        // 1/3 férias = 5.000,00
        // Fixo Anual = 20.000,00
        // Abono = 5.000,00 (includes_abono = true)
        // Dissídio = 1.200,00
        // Total = 20.000 + 5.000 + 1.200 = 26.200,00
        const record = new Record(reimbursementsCol)
        record.set('user', user.id)
        record.set('reference_year', 2024)
        record.set('base_salary', 15000)
        record.set('includes_abono', true)
        record.set('dissidio_amount', 1200)
        record.set('total_amount', 26200)
        record.set('status', 'paid')
        app.save(record)
      }
    } catch (e) {
      console.log('Seed reimbursement warning: ' + e)
    }
  },
  (app) => {
    try {
      const user = app.findAuthRecordByEmail('_pb_users_auth_', 'luiz@globexmultimodal.com.br')
      const records = app.findRecordsByFilter('reimbursements', `user = '${user.id}'`, '', 10, 0)
      for (const rec of records) {
        app.delete(rec)
      }
    } catch (_) {}
  },
)
