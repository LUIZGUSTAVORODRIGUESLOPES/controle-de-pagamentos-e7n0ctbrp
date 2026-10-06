migrate(
  (app) => {
    // 1. Atualizar schema da coleção 'reimbursements':
    const reimbursementsCol = app.findCollectionByNameOrId('reimbursements')

    // 1a. Adicionar campo numérico amount_paid se não existir
    if (!reimbursementsCol.fields.getByName('amount_paid')) {
      reimbursementsCol.fields.add(
        new NumberField({
          name: 'amount_paid',
          required: false,
        }),
      )
    }

    // 1b. Atualizar campo status para aceitar ['pending', 'partial', 'paid']
    const statusField = reimbursementsCol.fields.getByName('status')
    if (statusField) {
      statusField.values = ['pending', 'partial', 'paid']
      statusField.maxSelect = 1
    }

    // Salvar alterações de schema
    app.save(reimbursementsCol)

    // 2. Limpeza: Deletar TODOS os registros existentes da coleção reimbursements (idempotente)
    app.truncateCollection(reimbursementsCol)

    // 3. Localizar o usuário administrador padrão (luiz@globexmultimodal.com.br)
    let adminUser
    try {
      adminUser = app.findAuthRecordByEmail('_pb_users_auth_', 'luiz@globexmultimodal.com.br')
    } catch (e) {
      console.log(
        'Usuário admin luiz@globexmultimodal.com.br não encontrado para vincular reembolsos: ' + e,
      )
      return
    }

    const adminUserId = adminUser.id

    // Função auxiliar para inserir registro
    const insertReimbursement = (data) => {
      const record = new Record(reimbursementsCol)
      record.set('user', adminUserId)
      record.set('type', data.type)
      record.set('reference_period', data.reference_period)
      if (data.reference_year) {
        record.set('reference_year', data.reference_year)
      } else {
        const parts = data.reference_period.split('-')
        record.set('reference_year', parseInt(parts[0], 10))
      }
      if (data.base_salary !== undefined) {
        record.set('base_salary', data.base_salary)
      }
      if (data.dissidio_amount !== undefined) {
        record.set('dissidio_amount', data.dissidio_amount)
      }
      record.set('includes_abono', Boolean(data.includes_abono))
      record.set('total_amount', data.total_amount)
      record.set('amount_paid', data.amount_paid)
      record.set('status', data.status)
      app.save(record)
    }

    // 4. Inserir registros reais de 2026:

    // 4a. Jan a Jul/2026 (7 meses):
    // type: 'mensal', reference_period: '2026-01' até '2026-07'
    // base_salary: 1754.73, total_amount: 1754.73, amount_paid: 1754.73, status: 'paid'
    const mesesJanJul = [
      '2026-01',
      '2026-02',
      '2026-03',
      '2026-04',
      '2026-05',
      '2026-06',
      '2026-07',
    ]
    for (const periodo of mesesJanJul) {
      insertReimbursement({
        type: 'mensal',
        reference_period: periodo,
        base_salary: 1754.73,
        total_amount: 1754.73,
        amount_paid: 1754.73,
        status: 'paid',
      })
    }

    // 4b. Ago a Out/2026 (3 meses — onde ocorre o déficit):
    // type: 'mensal', reference_period: '2026-08' até '2026-10'
    // base_salary: 1871.24, total_amount: 1871.24, amount_paid: 1754.73, status: 'partial'
    const mesesAgoOut = ['2026-08', '2026-09', '2026-10']
    for (const periodo of mesesAgoOut) {
      insertReimbursement({
        type: 'mensal',
        reference_period: periodo,
        base_salary: 1871.24,
        total_amount: 1871.24,
        amount_paid: 1754.73,
        status: 'partial',
      })
    }

    // 4c. 05/08/2026 — Pagamento do Dissídio Retroativo (Fev a Jun):
    // type: 'anual', reference_period: '2026-08', reference_year: 2026,
    // dissidio_amount: 582.55, total_amount: 582.55, amount_paid: 582.55, status: 'paid'
    insertReimbursement({
      type: 'anual',
      reference_period: '2026-08',
      reference_year: 2026,
      dissidio_amount: 582.55,
      total_amount: 582.55,
      amount_paid: 582.55,
      status: 'paid',
    })
  },
  (app) => {
    try {
      const reimbursementsCol = app.findCollectionByNameOrId('reimbursements')
      app.truncateCollection(reimbursementsCol)
      if (reimbursementsCol.fields.getByName('amount_paid')) {
        reimbursementsCol.fields.removeByName('amount_paid')
      }
      const statusField = reimbursementsCol.fields.getByName('status')
      if (statusField) {
        statusField.values = ['pending', 'paid']
      }
      app.save(reimbursementsCol)
    } catch (_) {}
  },
)
