migrate(
  (app) => {
    const reimbursements = app.findCollectionByNameOrId('reimbursements')
    if (!reimbursements.fields.getByName('vacation_days')) {
      reimbursements.fields.add(
        new NumberField({
          name: 'vacation_days',
          required: false,
          min: 0,
          max: 60,
          onlyInt: true,
        }),
      )
      app.save(reimbursements)
    }
  },
  (app) => {
    try {
      const reimbursements = app.findCollectionByNameOrId('reimbursements')
      const field = reimbursements.fields.getByName('vacation_days')
      if (field) {
        reimbursements.fields.removeByName('vacation_days')
        app.save(reimbursements)
      }
    } catch (_) {}
  },
)
