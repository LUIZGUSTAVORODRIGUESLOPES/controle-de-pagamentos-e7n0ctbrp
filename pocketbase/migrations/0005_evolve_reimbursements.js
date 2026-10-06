migrate(
  (app) => {
    // 1. Atualizar a coleção users: adicionar campo monthly_salary (number) para armazenar o salário fixo do usuário
    const usersCol = app.findCollectionByNameOrId('_pb_users_auth_')
    if (!usersCol.fields.getByName('monthly_salary')) {
      usersCol.fields.add(
        new NumberField({
          name: 'monthly_salary',
          required: false,
        }),
      )
      app.save(usersCol)
    }

    // Configurar salário fixo padrão de Luiz (15.000) se ainda não tiver
    try {
      const adminUser = app.findAuthRecordByEmail('_pb_users_auth_', 'luiz@globexmultimodal.com.br')
      if (!adminUser.get('monthly_salary')) {
        adminUser.set('monthly_salary', 15000)
        app.save(adminUser)
      }
    } catch (_) {}

    // 2. Atualizar a coleção reimbursements:
    // Campos a adicionar:
    // - reference_period (text, ex: "2026-10" para mensal ou "2026" para anual)
    // - type (select: 'mensal', 'anual')
    // Garantir regras de acesso admin-only
    const reimbursementsCol = app.findCollectionByNameOrId('reimbursements')

    if (!reimbursementsCol.fields.getByName('reference_period')) {
      reimbursementsCol.fields.add(
        new TextField({
          name: 'reference_period',
          required: false,
        }),
      )
    }

    if (!reimbursementsCol.fields.getByName('type')) {
      reimbursementsCol.fields.add(
        new SelectField({
          name: 'type',
          values: ['mensal', 'anual'],
          maxSelect: 1,
          required: false,
        }),
      )
    }

    // Relaxar obrigatoriedade de reference_year e base_salary para lançamentos mensais se necessário
    const refYearField = reimbursementsCol.fields.getByName('reference_year')
    if (refYearField) {
      refYearField.required = false
    }

    const baseSalaryField = reimbursementsCol.fields.getByName('base_salary')
    if (baseSalaryField) {
      baseSalaryField.required = false
    }

    // Garantir regras de acesso admin-only
    reimbursementsCol.listRule = "@request.auth.id != '' && @request.auth.role = 'admin'"
    reimbursementsCol.viewRule = "@request.auth.id != '' && @request.auth.role = 'admin'"
    reimbursementsCol.createRule = "@request.auth.id != '' && @request.auth.role = 'admin'"
    reimbursementsCol.updateRule = "@request.auth.id != '' && @request.auth.role = 'admin'"
    reimbursementsCol.deleteRule = "@request.auth.id != '' && @request.auth.role = 'admin'"

    // Salvar alterações de campos
    app.save(reimbursementsCol)

    // Adicionar índices úteis
    try {
      reimbursementsCol.addIndex('idx_reimbursements_period', false, 'reference_period', '')
      reimbursementsCol.addIndex('idx_reimbursements_type', false, 'type', '')
      app.save(reimbursementsCol)
    } catch (_) {}

    // 3. Migrar dados existentes para preencher type = 'anual' e reference_period = string(reference_year)
    try {
      app
        .db()
        .newQuery("UPDATE reimbursements SET type = 'anual' WHERE type IS NULL OR type = ''")
        .execute()

      app
        .db()
        .newQuery(
          "UPDATE reimbursements SET reference_period = CAST(reference_year AS TEXT) WHERE reference_period IS NULL OR reference_period = ''",
        )
        .execute()
    } catch (e) {
      console.log('Aviso ao migrar registros existentes de reimbursements: ' + e)
    }
  },
  (app) => {
    try {
      const reimbursementsCol = app.findCollectionByNameOrId('reimbursements')
      if (reimbursementsCol.fields.getByName('reference_period')) {
        reimbursementsCol.fields.removeByName('reference_period')
      }
      if (reimbursementsCol.fields.getByName('type')) {
        reimbursementsCol.fields.removeByName('type')
      }
      app.save(reimbursementsCol)
    } catch (_) {}

    try {
      const usersCol = app.findCollectionByNameOrId('_pb_users_auth_')
      if (usersCol.fields.getByName('monthly_salary')) {
        usersCol.fields.removeByName('monthly_salary')
        app.save(usersCol)
      }
    } catch (_) {}
  },
)
