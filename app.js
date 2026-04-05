require('dotenv').config();
const csrf = require('csurf');
const express = require('express');
const session = require('express-session');
const path = require('path');
const ejsLayouts = require('express-ejs-layouts');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/auth');
const accountRoutes = require('./routes/account');
const transferRoutes = require('./routes/transfer');
const transactionsRoutes = require('./routes/transactions');
const adminRoutes = require('./routes/admin');

const isAuthenticated = require('./middleware/auth');
const isAdmin = require('./middleware/admin');


const app = express();

// Configuration EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(ejsLayouts);
app.set('layout', 'layouts/main');

// Helpers disponibles dans toutes les vues
app.locals.formatDate = (date) => {
  return new Date(date).toLocaleDateString('fr-CA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

app.locals.formatMoney = (amount) => {
  return new Intl.NumberFormat('fr-CA', {
    style: 'currency',
    currency: 'CAD',
  }).format(amount);
};

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false, sameSite: 'strict' },
  }),
);

app.use(csrf());

app.use((req, res, next) => {
  res.locals.csrfToken = req.csrfToken();
  next();
});

// Variables globales pour les vues
app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  res.locals.success = req.session.success;
  res.locals.error = req.session.error;
  delete req.session.success;
  delete req.session.error;
  next();
});

// Rate limiting sur le login
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message:
    'Trop de tentatives de connexion. Veuillez réessayer ultérieurement.',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/auth/login', loginLimiter);

// Routes
app.get('/', (req, res) => {
  res.render('home', { title: 'Accueil' });
});

app.use('/auth', authRoutes);
app.use('/account', accountRoutes);
app.use('/transfer', transferRoutes);
app.use('/transactions', transactionsRoutes);
app.use('/admin', isAuthenticated, isAdmin, adminRoutes);

app.use((err, req, res, next) => {
  if (err.code === 'EBADCSRFTOKEN') {
    return res.status(403).send('Requête invalide (CSRF)');
  }
  if (process.env.DEBUG === 'true') {
    return res.status(500).send(`
    <h1>Erreur Serveur</h1>
    <p>${err.message}</p>
  `);
  } else {
    res.status(500).render('error', { message: 'Une erreur est survenue' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`CaissePasSecure démarré sur http://localhost:${PORT}`);
});
