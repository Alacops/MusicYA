const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const routes = require('./routes');
const { notFound, errorHandler } = require('./middlewares/error.middleware');

const app = express();

app.use(cors({ origin: process.env.CLIENT_ORIGIN || '*' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Healthcheck
app.get('/', (req, res) => {
  res.json({ name: 'MusicYA API', status: 'ok', version: '1.0.0' });
});

// Rutas de la API
app.use('/api', routes);

// Manejo de errores
app.use(notFound);
app.use(errorHandler);

module.exports = app;
