migrate(
  (app) => {
    // 1. Add 'role' select field to users collection if it doesn't already exist
    const usersCol = app.findCollectionByNameOrId('_pb_users_auth_')
    if (!usersCol.fields.getByName('role')) {
      usersCol.fields.add(
        new SelectField({
          name: 'role',
          values: ['admin', 'user'],
          maxSelect: 1,
        }),
      )
      // Allow users to view/list user records if admin, or self view/list
      // This allows admin to list all users in the executive reimbursement dropdown
      usersCol.listRule =
        "@request.auth.id != '' && (@request.auth.role = 'admin' || id = @request.auth.id)"
      usersCol.viewRule =
        "@request.auth.id != '' && (@request.auth.role = 'admin' || id = @request.auth.id)"
      app.save(usersCol)
    }

    // 2. Ensure luiz@globexmultimodal.com.br is set to role = 'admin'
    try {
      const adminUser = app.findAuthRecordByEmail('_pb_users_auth_', 'luiz@globexmultimodal.com.br')
      adminUser.set('role', 'admin')
      app.save(adminUser)
    } catch (_) {}

    // 3. Create the 'reimbursements' collection
    // Required fields:
    // - user (relation to users)
    // - reference_year (number)
    // - base_salary (number)
    // - includes_abono (bool, not required so false is accepted)
    // - dissidio_amount (number)
    // - total_amount (number)
    // - status (select: 'pending', 'paid')
    // - created, updated (autodate)
    // Permissions (RLS):
    // "apenas administradores (role = 'admin') criam, editem ou visualizam. Delete também só para admin."
    const reimbursementsCollection = new Collection({
      name: 'reimbursements',
      type: 'base',
      listRule: "@request.auth.id != '' && @request.auth.role = 'admin'",
      viewRule: "@request.auth.id != '' && @request.auth.role = 'admin'",
      createRule: "@request.auth.id != '' && @request.auth.role = 'admin'",
      updateRule: "@request.auth.id != '' && @request.auth.role = 'admin'",
      deleteRule: "@request.auth.id != '' && @request.auth.role = 'admin'",
      fields: [
        {
          name: 'user',
          type: 'relation',
          required: true,
          collectionId: '_pb_users_auth_',
          cascadeDelete: false,
          maxSelect: 1,
        },
        {
          name: 'reference_year',
          type: 'number',
          required: true,
          onlyInt: true,
        },
        {
          name: 'base_salary',
          type: 'number',
          required: true,
        },
        {
          name: 'includes_abono',
          type: 'bool',
          required: false,
        },
        {
          name: 'dissidio_amount',
          type: 'number',
          required: false,
        },
        {
          name: 'total_amount',
          type: 'number',
          required: true,
        },
        {
          name: 'status',
          type: 'select',
          required: true,
          maxSelect: 1,
          values: ['pending', 'paid'],
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
        'CREATE INDEX idx_reimbursements_user ON reimbursements (user)',
        'CREATE INDEX idx_reimbursements_year ON reimbursements (reference_year DESC)',
        'CREATE INDEX idx_reimbursements_status ON reimbursements (status)',
      ],
    })

    app.save(reimbursementsCollection)
  },
  (app) => {
    try {
      const reimbursements = app.findCollectionByNameOrId('reimbursements')
      app.delete(reimbursements)
    } catch (_) {}

    try {
      const usersCol = app.findCollectionByNameOrId('_pb_users_auth_')
      const roleField = usersCol.fields.getByName('role')
      if (roleField) {
        usersCol.fields.removeByName('role')
        usersCol.listRule = 'id = @request.auth.id'
        usersCol.viewRule = 'id = @request.auth.id'
        app.save(usersCol)
      }
    } catch (_) {}
  },
)
