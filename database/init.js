const bcrypt = require('bcrypt');
const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'caissepassecure.db'));

// Suppression des tables existantes
db.exec(`
  DROP TABLE IF EXISTS logs;
  DROP TABLE IF EXISTS transactions;
  DROP TABLE IF EXISTS password_resets;
  DROP TABLE IF EXISTS users;
`);

// Création des tables
db.exec(`
  CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    bio TEXT DEFAULT '',
    avatar_url TEXT DEFAULT '',
    balance REAL DEFAULT 0,
    role TEXT DEFAULT 'user',
    active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    from_user_id INTEGER,
    to_user_id INTEGER NOT NULL,
    amount REAL NOT NULL,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (from_user_id) REFERENCES users(id),
    FOREIGN KEY (to_user_id) REFERENCES users(id)
  );

  CREATE TABLE password_resets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    token TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    action TEXT NOT NULL,
    details TEXT,
    ip_address TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
`);

const users = [
  {
    name: 'Alice Dupont',
    email: 'alice@test.com',
    password: bcrypt.hashSync('A1!ceD#2025$Secure', 10),
    bio: `Cliente fidèle depuis ${new Date().getFullYear()}`,
    balance: 2500.0,
    role: 'user',
  },
  {
    name: 'Bob Martin',
    email: 'bob@test.com',
    password: bcrypt.hashSync('B0b@M4rtin!2025', 10),
    bio: 'Entrepreneur passionné',
    balance: 850.0,
    role: 'user',
  },
  {
    name: 'Diana Ross',
    email: 'diana@test.com',
    password: bcrypt.hashSync('D!an4R0ss#2025', 10),
    bio: 'Étudiante en finance',
    balance: 150.0,
    role: 'user',
  },
  {
    name: 'Charlie Admin',
    email: 'admin@caissepassecure.com',
    password: bcrypt.hashSync('Adm!n@C4isse#2025', 10),
    bio: 'Administrateur système',
    balance: 10000.0,
    role: 'admin',
  },
];

const insertUser = db.prepare(`
  INSERT INTO users (name, email, password, bio, balance, role)
  VALUES (@name, @email, @password, @bio, @balance, @role)
`);

for (const user of users) {
  insertUser.run(user);
}

// Transactions initiales
const transactions = [
  {
    from_user_id: 1,
    to_user_id: 2,
    amount: 150.0,
    description: 'Remboursement restaurant',
  },
  {
    from_user_id: 2,
    to_user_id: 1,
    amount: 75.0,
    description: 'Part du cadeau',
  },
  {
    from_user_id: 4,
    to_user_id: 1,
    amount: 1000.0,
    description: 'Bonus fidélité',
  },
  {
    from_user_id: 1,
    to_user_id: 3,
    amount: 50.0,
    description: 'Aide pour les livres',
  },
  {
    from_user_id: 3,
    to_user_id: 2,
    amount: 25.0,
    description: 'Café et croissants',
  },
];

const insertTransaction = db.prepare(`
  INSERT INTO transactions (from_user_id, to_user_id, amount, description)
  VALUES (@from_user_id, @to_user_id, @amount, @description)
`);

for (const transaction of transactions) {
  insertTransaction.run(transaction);
}

// Logs initiaux
const logs = [
  {
    user_id: 1,
    action: 'login',
    details: 'Connexion réussie',
    ip_address: '192.168.1.100',
  },
  {
    user_id: 4,
    action: 'login',
    details: 'Connexion réussie',
    ip_address: '192.168.1.1',
  },
  {
    user_id: 4,
    action: 'user_update',
    details: 'Modification du solde de Alice Dupont',
    ip_address: '192.168.1.1',
  },
];

const insertLog = db.prepare(`
  INSERT INTO logs (user_id, action, details, ip_address)
  VALUES (@user_id, @action, @details, @ip_address)
`);

for (const log of logs) {
  insertLog.run(log);
}

console.log('Base de données initialisée avec succès !');
console.log('Utilisateurs créés :');
users.forEach((u) => {
  console.log(`  - ${u.email} (${u.role}) - Solde: ${u.balance} $`);
});

db.close();
