const crypto = require('crypto');
const bcrypt = require('bcrypt');
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
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  const getUserByEmail = db.prepare('SELECT * FROM users WHERE email = ?');

  try {
    const user = getUserByEmail.get(email);

    if (user) {
      const passwordMatch = await bcrypt.compare(password, user.password);

      if (!passwordMatch) {
        console.warn(`[LOGIN FAILED] email=${email} reason=wrong_password`);
        req.session.error = 'Identifiants invalides';
        return res.redirect('/auth/login');
      }

      if (user.active === 0) {
        console.warn(`[LOGIN FAILED] email=${email} reason=account_disabled`);
        req.session.error = 'Ce compte a été désactivé';
        return res.redirect('/auth/login');
      }

      console.log(`[LOGIN SUCCESS] user=${user.email} id=${user.id}`);

      req.session.user = {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar_url: user.avatar_url,
      };

      req.session.success = `Bienvenue, ${user.name} !`;
      return res.redirect('/account/dashboard');
    } else {
      console.warn(`[LOGIN FAILED] email=${email} reason=user_not_found`);
      req.session.error = 'Identifiants invalides';
      return res.redirect('/auth/login');
    }
  } catch (err) {
    console.error(`[LOGIN ERROR] email=${email} error=${err.message}`);

    if (process.env.DEBUG === 'true') {
      req.session.error = `Erreur SQL: ${err.message}`;
    } else {
      req.session.error = 'Une erreur est survenue';
    }
    return res.redirect('/auth/login');
  }
});

// Page d'inscription
router.get('/register', (req, res) => {
  res.render('auth/register', { title: 'Inscription' });
});

// Traitement de l'inscription
router.post('/register', async (req, res) => {
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
      req.session.error = "Erreur lors de l'inscription";
      return res.redirect('/auth/register');
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
    if (!passwordRegex.test(password)) {
      req.session.error =
        'Le mot de passe doit contenir au moins 8 caractères, une majuscule, une minuscule, un chiffre et un caractère spécial.';
      return res.redirect('/auth/register');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = db
      .prepare(
        'INSERT INTO users (name, email, password, balance) VALUES (?, ?, ?, ?)',
      )
      .run(name, email, hashedPassword, 100.0);

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
    const token = crypto.randomBytes(32).toString('hex');

    db.prepare(
      'INSERT INTO password_resets (user_id, token) VALUES (?, ?)',
    ).run(user.id, token);

    // En vrai, on enverrait un email. Ici on affiche le lien pour le TP.
    req.session.success = `Si un compte existe, un lien de réinitialisation (simulé) a été généré : /auth/reset-password?token=${token}`;
  } else {
    req.session.success =
      'Si un compte existe, un lien de réinitialisation a été envoyé.';
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
router.post('/reset-password', async (req, res) => {
  const { token, password, password_confirm } = req.body;

  if (password !== password_confirm) {
    req.session.error = 'Les mots de passe ne correspondent pas';
    return res.redirect(`/auth/reset-password?token=${token}`);
  }

  const reset = db
    .prepare(
      `SELECT * FROM password_resets WHERE token = ? AND created_at >= datetime('now', '-1 hour')`,
    )
    .get(token);

  if (reset) {
    const hashedPassword = await bcrypt.hash(password, 10);

    db.prepare('UPDATE users SET password = ? WHERE id = ?').run(
      hashedPassword,
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
