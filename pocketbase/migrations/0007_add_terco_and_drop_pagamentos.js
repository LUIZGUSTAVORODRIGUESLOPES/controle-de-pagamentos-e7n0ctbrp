migrate(
  (app) => {
    // 1. Evolve collection 'reimbursements': add includes_terco bool field
    const reimbursements = app.findCollectionByNameOrId('reimbursements')
    if (!reimbursements.fields.getByName('includes_terco')) {
      reimbursements.fields.add(
        new BoolField({
          name: 'includes_terco',
          required: false,
        }),
      )
      app.save(reimbursements)
    }

    // 2. Drop legacy 'pagamentos' collection if it exists
    try {
      const pagamentos = app.findCollectionByNameOrId('pagamentos')
      if (pagamentos) {
        app.delete(pagamentos)
      }
    } catch (_) {
      // collection may already be removed or not found
    }
  },
  (app) => {
    // down migration
    try {
      const reimbursements = app.findCollectionByNameOrId('reimbursements')
      const field = reimbursements.fields.getByName('includes_terco')
      if (field) {
        reimbursements.fields.removeByName('includes_terco')
        app.save(reimbursements)
      }
    } catch (_) {}
  },
)
