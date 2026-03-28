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
    console.warn(
      `[TRANSFER FAILED] user=${senderId} reason=invalid_amount amount=${amount}`,
    );
    req.session.error = 'Montant invalide';
    return res.redirect('/transfer/new');
  }

  const sender = db.prepare('SELECT * FROM users WHERE id = ?').get(senderId);
  const recipient = db
    .prepare('SELECT * FROM users WHERE email = ?')
    .get(recipient_email);

  if (!recipient) {
    console.warn(
      `[TRANSFER FAILED] user=${senderId} reason=recipient_not_found email=${recipient_email}`,
    );
    req.session.error = 'Destinataire non trouvé';
    return res.redirect('/transfer/new');
  }

  if (recipient.id === senderId) {
    console.warn(`[TRANSFER FAILED] user=${senderId} reason=self_transfer`);
    req.session.error = "Vous ne pouvez pas vous transférer de l'argent";
    return res.redirect('/transfer/new');
  }

  if (sender.balance < transferAmount) {
    console.warn(
      `[TRANSFER FAILED] user=${senderId} reason=insufficient_balance amount=${transferAmount}`,
    );
    req.session.error = 'Solde insuffisant';
    return res.redirect('/transfer/new');
  }

  req.session.transfer = {
    recipient_id: recipient.id,
    amount: transferAmount,
    description,
  };

  res.redirect('/transfer/confirm');
});

// Page de confirmation
router.get('/confirm', isAuthenticated, (req, res) => {
  const transfer = req.session.transfer;
  const userId = req.session.user.id;

  if (!transfer) {
    console.warn(
      `[TRANSFER FAILED] user=${userId} reason=missing_session_transfer`,
    );
    req.session.error = 'Session de transfert invalide';
    return res.redirect('/transfer/new');
  }

  const recipient = db
    .prepare('SELECT id, name, email FROM users WHERE id = ?')
    .get(transfer.recipient_id);

  if (!recipient) {
    console.warn(`[TRANSFER FAILED] user=${userId} reason=recipient_not_found`);
    req.session.error = 'Destinataire non trouvé';
    return res.redirect('/transfer/new');
  }

  res.render('transfer/new', {
    title: 'Confirmer le transfert',
    confirmation: true,
    recipient,
    amount: transfer.amount,
    description: transfer.description,
    balance: db
      .prepare('SELECT balance FROM users WHERE id = ?')
      .get(req.session.user.id).balance,
  });
});

// Exécution du transfert
router.post('/confirm', isAuthenticated, (req, res) => {
  const transfer = req.session.transfer;
  const senderId = req.session.user.id;

  if (!transfer) {
    console.warn(
      `[TRANSFER FAILED] user=${senderId} reason=missing_session_transfer`,
    );
    req.session.error = 'Session de transfert invalide';
    return res.redirect('/transfer/new');
  }

  const { recipient_id, amount, description } = transfer;
  const transferAmount = parseFloat(amount);

  const sender = db.prepare('SELECT * FROM users WHERE id = ?').get(senderId);
  const recipient = db
    .prepare('SELECT * FROM users WHERE id = ?')
    .get(recipient_id);

  if (!recipient) {
    console.warn(
      `[TRANSFER FAILED] user=${senderId} reason=recipient_not_found`,
    );
    req.session.error = 'Destinataire non trouvé';
    return res.redirect('/transfer/new');
  }

  if (sender.balance < transferAmount) {
    console.warn(
      `[TRANSFER FAILED] user=${senderId} reason=insufficient_balance amount=${transferAmount}`,
    );
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

    console.log(
      `[TRANSFER SUCCESS] from=${senderId} to=${recipient.id} amount=${transferAmount}`,
    );

    delete req.session.transfer;

    req.session.success = `Transfert de ${transferAmount.toFixed(2)} $ à ${recipient.name} effectué avec succès`;
    res.redirect('/account/dashboard');
  } catch (err) {
    console.error(`[TRANSFER ERROR] user=${senderId} error=${err.message}`);

    req.session.error = 'Erreur lors du transfert';
    res.redirect('/transfer/new');
  }
});

module.exports = router;
