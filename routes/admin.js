const express = require('express');
const router = express.Router();
const Database = require('better-sqlite3');
const path = require('path');
const isAuthenticated = require('../middleware/auth');
const isAdmin = require('../middleware/admin');

const db = new Database(
  path.join(__dirname, '..', 'database', 'caissepassecure.db'),
);

// Dashboard admin
router.get('/dashboard', isAuthenticated, (req, res) => {
  const stats = {
    totalUsers: db.prepare('SELECT COUNT(*) as count FROM users').get().count,
    totalTransactions: db
      .prepare('SELECT COUNT(*) as count FROM transactions')
      .get().count,
    totalVolume:
      db.prepare('SELECT SUM(amount) as total FROM transactions').get().total ||
      0,
    recentLogs: db
      .prepare(
        "SELECT COUNT(*) as count FROM logs WHERE created_at > datetime('now', '-24 hours')",
      )
      .get().count,
  };

  res.render('admin/dashboard', {
    title: 'Administration',
    stats,
  });
});

// Liste des utilisateurs
router.get('/users', isAuthenticated, isAdmin, (req, res) => {
  const { search } = req.query;

  let users;
  if (search) {
    const sql = `SELECT * FROM users WHERE name LIKE '%${search}%' OR email LIKE '%${search}%' ORDER BY created_at DESC`;
    try {
      users = db.prepare(sql).all();
    } catch (err) {
      users = [];
      req.session.error = `Erreur: ${err.message}`;
    }
  } else {
    users = db.prepare('SELECT * FROM users ORDER BY created_at DESC').all();
  }

  res.render('admin/users', {
    title: 'Gestion des utilisateurs',
    users,
    searchQuery: search || '',
  });
});

// Modification d'un utilisateur (admin)
router.post('/users/:id', isAuthenticated, isAdmin, (req, res) => {
  const { id } = req.params;
  const { name, email, balance, role, active } = req.body;

  try {
    db.prepare(
      'UPDATE users SET name = ?, email = ?, balance = ?, role = ?, active = ? WHERE id = ?',
    ).run(name, email, parseFloat(balance), role, active ? 1 : 0, id);

    // Log de l'action
    db.prepare(
      'INSERT INTO logs (user_id, action, details, ip_address) VALUES (?, ?, ?, ?)',
    ).run(
      req.session.user.id,
      'user_update',
      `Modification de l'utilisateur #${id}`,
      req.ip,
    );

    req.session.success = 'Utilisateur mis à jour';
  } catch (err) {
    req.session.error = 'Erreur lors de la mise à jour';
  }

  res.redirect('/admin/users');
});

// Suppression d'un utilisateur
router.post('/users/:id/delete', isAuthenticated, isAdmin, (req, res) => {
  const { id } = req.params;

  try {
    db.prepare('DELETE FROM users WHERE id = ?').run(id);

    db.prepare(
      'INSERT INTO logs (user_id, action, details, ip_address) VALUES (?, ?, ?, ?)',
    ).run(
      req.session.user.id,
      'user_delete',
      `Suppression de l'utilisateur #${id}`,
      req.ip,
    );

    req.session.success = 'Utilisateur supprimé';
  } catch (err) {
    req.session.error = 'Erreur lors de la suppression';
  }

  res.redirect('/admin/users');
});

// Logs d'activité
router.get('/logs', isAuthenticated, (req, res) => {
  const logs = db
    .prepare(
      `
    SELECT l.*, u.name as user_name, u.email as user_email
    FROM logs l
    LEFT JOIN users u ON l.user_id = u.id
    ORDER BY l.created_at DESC
    LIMIT 100
  `,
    )
    .all();

  res.render('admin/logs', {
    title: "Logs d'activité",
    logs,
  });
});

// Simuler un outil de debug laissé en production
router.get('/debug/query', isAuthenticated, isAdmin, (req, res) => {
  const sql = req.query.sql;

  if (!sql) {
    return res.json({
      message: 'Outil de debug SQL. Utilisation: ?sql=SELECT...',
      warning: 'Cet outil ne devrait pas être en production!',
    });
  }

  try {
    let result;
    if (sql.trim().toUpperCase().startsWith('SELECT')) {
      result = db.prepare(sql).all();
    } else {
      result = db.prepare(sql).run();
    }
    res.json({ success: true, result });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// Export des données (fonctionnalité admin)
router.get('/export/:table', isAuthenticated, isAdmin, (req, res) => {
  const allowedTables = ['users', 'transactions', 'logs'];

  const table = req.params.table;

  if (!allowedTables.includes(table)) {
    return res.status(400).json({ error: 'Requête indisponible' });
  }

  try {
    const data = db.prepare(`SELECT * FROM ${table}`).all();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
