const express = require('express');
const router = express.Router();
const Database = require('better-sqlite3');
const path = require('path');
const isAuthenticated = require('../middleware/auth');

const db = new Database(
  path.join(__dirname, '..', 'database', 'caissepassecure.db'),
);

// Historique des transactions
router.get('/history', isAuthenticated, (req, res) => {
  const userId = req.session.user.id;

  const transactions = db
    .prepare(
      `
    SELECT t.*, 
           sender.name as sender_name, 
           sender.email as sender_email,
           receiver.name as receiver_name,
           receiver.email as receiver_email
    FROM transactions t
           LEFT JOIN users sender ON t.from_user_id = sender.id
           JOIN users receiver ON t.to_user_id = receiver.id
    WHERE t.from_user_id = ? OR t.to_user_id = ?
    ORDER BY t.created_at DESC
  `,
    )
    .all(userId, userId);

  res.render('transactions/history', {
    title: 'Historique des transactions',
    transactions,
    currentUserId: userId,
  });
});


// Recherche de transactions
router.get('/search', isAuthenticated, (req, res) => {
  res.render('transactions/search', {
    title: 'Rechercher des transactions',
    transactions: null,
    searchQuery: '',
  });
});

// Traitement de la recherche
router.post('/search', isAuthenticated, (req, res) => {
  const { query, date_from, date_to } = req.body;
  const userId = req.session.user.id;

  let sql = `
    SELECT t.*, 
           sender.name as sender_name, 
           sender.email as sender_email,
           receiver.name as receiver_name,
           receiver.email as receiver_email
    FROM transactions t
    LEFT JOIN users sender ON t.from_user_id = sender.id
    JOIN users receiver ON t.to_user_id = receiver.id
    WHERE (t.from_user_id = ${userId} OR t.to_user_id = ${userId})
  `;

  if (query) {
    sql += ` AND (t.description LIKE '%${query}%' OR sender.name LIKE '%${query}%' OR receiver.name LIKE '%${query}%')`;
  }

  if (date_from) {
    sql += ` AND t.created_at >= '${date_from}'`;
  }

  if (date_to) {
    sql += ` AND t.created_at <= '${date_to}'`;
  }

  sql += ' ORDER BY t.created_at DESC';

  try {
    const transactions = db.prepare(sql).all();

    res.render('transactions/search', {
      title: 'Rechercher des transactions',
      transactions,
      searchQuery: query || '',
      dateFrom: date_from,
      dateTo: date_to,
    });
  } catch (err) {
    if (process.env.DEBUG === 'true') {
      req.session.error = `Erreur SQL: ${err.message} | Requête: ${sql}`;
    } else {
      req.session.error = 'Erreur lors de la recherche';
    }
    res.redirect('/transactions/search');
  }
});

module.exports = router;
