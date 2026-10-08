migrate(
  (app) => {
    try {
      const user = app.findAuthRecordByEmail('_pb_users_auth_', 'luiz@globexmultimodal.com.br')
      user.set('name', 'Luiz Lopes')
      app.save(user)
    } catch (e) {
      console.log('Erro ao atualizar usuário luiz@globexmultimodal.com.br:', e)
    }
  },
  (app) => {
    try {
      const user = app.findAuthRecordByEmail('_pb_users_auth_', 'luiz@globexmultimodal.com.br')
      user.set('name', 'Luiz Silva')
      app.save(user)
    } catch (_) {}
  },
)
