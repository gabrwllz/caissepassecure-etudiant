// Middleware de vérification d'authentification
function isAuthenticated(req, res, next) {
  if (req.session.user) {
    return next();
  }

  console.warn(
    `[ACCESS DENIED] ip=${req.ip} path=${req.originalUrl} method=${req.method}`,
  );

  req.session.error = 'Vous devez être connecté pour accéder à cette page';
  res.redirect('/auth/login');
}

module.exports = isAuthenticated;
