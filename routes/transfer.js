const express = require('express');
const router = express.Router();
const Database = require('better-sqlite3');
const path = require('path');
const isAuthenticated = require('../middleware/auth');

const db = new Database(
  path.join(__dirname, '..', 'database', 'caissepassecure.db'),
);

// Page de nouveau transfert
router.get('/new', isAuthenticated, (req, res) => {
  const user = db
    .prepare('SELECT balance FROM users WHERE id = ?')
    .get(req.session.user.id);

  res.render('transfer/new', {
    title: 'Nouveau transfert',
    balance: user.balance,
  });
});

// Traitement du transfert
router.post('/new', isAuthenticated, (req, res) => {
  const { recipient_email, amount, description } = req.body;
  const senderId = req.session.user.id;

  const transferAmount = parseFloat(amount);

  if (isNaN(transferAmount) || transferAmount <= 0) {
    req.session.error = 'Montant invalide';
    return res.redirect('/transfer/new');
  }

  const sender = db.prepare('SELECT * FROM users WHERE id = ?').get(senderId);
  const recipient = db
    .prepare('SELECT * FROM users WHERE email = ?')
    .get(recipient_email);

  if (!recipient) {
    req.session.error = 'Destinataire non trouvé';
    return res.redirect('/transfer/new');
  }

  if (recipient.id === senderId) {
    req.session.error = "Vous ne pouvez pas vous transférer de l'argent";
    return res.redirect('/transfer/new');
  }

  if (sender.balance < transferAmount) {
    req.session.error = 'Solde insuffisant';
    return res.redirect('/transfer/new');
  }

  res.redirect(
    `/transfer/confirm?to=${recipient_email}&amount=${transferAmount}&description=${encodeURIComponent(description)}`,
  );
});

// Page de confirmation
router.get('/confirm', isAuthenticated, (req, res) => {
  const { to, amount, description } = req.query;

  const recipient = db
    .prepare('SELECT id, name, email FROM users WHERE email = ?')
    .get(to);

  if (!recipient) {
    req.session.error = 'Destinataire non trouvé';
    return res.redirect('/transfer/new');
  }

  res.render('transfer/new', {
    title: 'Confirmer le transfert',
    confirmation: true,
    recipient,
    amount: parseFloat(amount),
    description,
    balance: db
      .prepare('SELECT balance FROM users WHERE id = ?')
      .get(req.session.user.id).balance,
  });
});

// Exécution du transfert
router.post('/confirm', isAuthenticated, (req, res) => {
  const { recipient_id, amount, description } = req.body;
  const senderId = req.session.user.id;
  const transferAmount = parseFloat(amount);

  const sender = db.prepare('SELECT * FROM users WHERE id = ?').get(senderId);
  const recipient = db
    .prepare('SELECT * FROM users WHERE id = ?')
    .get(parseInt(recipient_id));

  if (!recipient) {
    req.session.error = 'Destinataire non trouvé';
    return res.redirect('/transfer/new');
  }

  if (sender.balance < transferAmount) {
    req.session.error = 'Solde insuffisant';
    return res.redirect('/transfer/new');
  }

  try {
    // Effectuer le transfert
    db.prepare('UPDATE users SET balance = balance - ? WHERE id = ?').run(
      transferAmount,
      senderId,
    );
    db.prepare('UPDATE users SET balance = balance + ? WHERE id = ?').run(
      transferAmount,
      recipient.id,
    );

    // Enregistrer la transaction
    db.prepare(
      'INSERT INTO transactions (from_user_id, to_user_id, amount, description) VALUES (?, ?, ?, ?)',
    ).run(senderId, recipient.id, transferAmount, description);

    req.session.success = `Transfert de ${transferAmount.toFixed(2)} $ à ${recipient.name} effectué avec succès`;
    res.redirect('/account/dashboard');
  } catch (err) {
    req.session.error = 'Erreur lors du transfert';
    res.redirect('/transfer/new');
  }
});

module.exports = router;
