// Middleware de vérification du rôle admin
function isAdmin(req, res, next) {
  if (req.session.user && req.session.user.role === 'admin') {
    return next();
  }

  req.session.error = 'Accès réservé aux administrateurs';
  res.redirect('/account/dashboard');
}

module.exports = isAdmin;
