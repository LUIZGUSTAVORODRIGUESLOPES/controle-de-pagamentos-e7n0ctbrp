migrate(
  (app) => {
    const reimbursements = app.findCollectionByNameOrId('reimbursements')
    if (!reimbursements.fields.getByName('payment_date')) {
      reimbursements.fields.add(
        new DateField({
          name: 'payment_date',
          required: false,
        }),
      )
      app.save(reimbursements)
    }
  },
  (app) => {
    try {
      const reimbursements = app.findCollectionByNameOrId('reimbursements')
      const field = reimbursements.fields.getByName('payment_date')
      if (field) {
        reimbursements.fields.removeByName('payment_date')
        app.save(reimbursements)
      }
    } catch (_) {}
  },
)
