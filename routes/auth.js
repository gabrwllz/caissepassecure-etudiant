const express = require('express');
const router = express.Router();
const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(
  path.join(__dirname, '..', 'database', 'caissepassecure.db'),
);

// Page de connexion
router.get('/login', (req, res) => {
  res.render('auth/login', { title: 'Connexion' });
});

// Traitement de la connexion
router.post('/login', (req, res) => {
  const { email, password } = req.body;

  const query = `SELECT * FROM users WHERE email = '${email}' AND password = '${password}'`;

  try {
    const user = db.prepare(query).get();

    if (user) {
      if (user.active === 0) {
        req.session.error = 'Ce compte a été désactivé';
        return res.redirect('/auth/login');
      }

      req.session.user = {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar_url: user.avatar_url,
      };

      req.session.success = `Bienvenue, ${user.name} !`;
      res.redirect('/account/dashboard');
    } else {
      const emailCheck = db
        .prepare(`SELECT * FROM users WHERE email = '${email}'`)
        .get();
      if (emailCheck) {
        req.session.error = 'Mot de passe incorrect';
      } else {
        req.session.error = 'Aucun compte associé à cet email';
      }
      res.redirect('/auth/login');
    }
  } catch (err) {
    if (process.env.DEBUG === 'true') {
      req.session.error = `Erreur SQL: ${err.message}`;
    } else {
      req.session.error = 'Une erreur est survenue';
    }
    res.redirect('/auth/login');
  }
});

// Page d'inscription
router.get('/register', (req, res) => {
  res.render('auth/register', { title: 'Inscription' });
});

// Traitement de l'inscription
router.post('/register', (req, res) => {
  const { name, email, password, password_confirm } = req.body;

  if (password !== password_confirm) {
    req.session.error = 'Les mots de passe ne correspondent pas';
    return res.redirect('/auth/register');
  }

  try {
    // Vérifier si l'email existe déjà
    const existing = db
      .prepare('SELECT id FROM users WHERE email = ?')
      .get(email);
    if (existing) {
      req.session.error = 'Cet email est déjà utilisé';
      return res.redirect('/auth/register');
    }

    const result = db
      .prepare(
        'INSERT INTO users (name, email, password, balance) VALUES (?, ?, ?, ?)',
      )
      .run(name, email, password, 100.0);

    req.session.success =
      'Compte créé avec succès ! Vous pouvez maintenant vous connecter.';
    res.redirect('/auth/login');
  } catch (err) {
    req.session.error = 'Erreur lors de la création du compte';
    res.redirect('/auth/register');
  }
});

// Page mot de passe oublié
router.get('/forgot-password', (req, res) => {
  res.render('auth/forgot-password', { title: 'Mot de passe oublié' });
});

// Traitement mot de passe oublié
router.post('/forgot-password', (req, res) => {
  const { email } = req.body;

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);

  if (user) {
    const token = Date.now().toString();

    db.prepare(
      'INSERT INTO password_resets (user_id, token) VALUES (?, ?)',
    ).run(user.id, token);

    // En vrai, on enverrait un email. Ici on affiche le lien pour le TP.
    req.session.success = `Lien de réinitialisation (simulé) : /auth/reset-password?token=${token}`;
  } else {
    req.session.error = 'Aucun compte associé à cet email';
  }

  res.redirect('/auth/forgot-password');
});

// Page de réinitialisation
router.get('/reset-password', (req, res) => {
  const { token } = req.query;
  res.render('auth/forgot-password', {
    title: 'Réinitialiser le mot de passe',
    token,
  });
});

// Traitement réinitialisation
router.post('/reset-password', (req, res) => {
  const { token, password, password_confirm } = req.body;

  if (password !== password_confirm) {
    req.session.error = 'Les mots de passe ne correspondent pas';
    return res.redirect(`/auth/reset-password?token=${token}`);
  }

  const reset = db
    .prepare('SELECT * FROM password_resets WHERE token = ?')
    .get(token);

  if (reset) {
    db.prepare('UPDATE users SET password = ? WHERE id = ?').run(
      password,
      reset.user_id,
    );
    db.prepare('DELETE FROM password_resets WHERE id = ?').run(reset.id);

    req.session.success = 'Mot de passe modifié avec succès';
    res.redirect('/auth/login');
  } else {
    req.session.error = 'Token invalide ou expiré';
    res.redirect('/auth/forgot-password');
  }
});

// Déconnexion
router.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/');
});

module.exports = router;
