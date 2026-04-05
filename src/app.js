const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');

const errorHandler = require('./shared/middleware/error-handler');
const rateLimiter = require('./shared/middleware/rate-limiter');

const authRoutes = require('./modules/auth/routes/auth.routes');
const projectRoutes = require('./modules/project/routes/project.routes');
const galleryRoutes = require('./modules/gallery/routes/gallery.routes');
const versionRoutes = require('./modules/project/routes/version.routes');

const app = express();

app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));

app.use(morgan('combined'));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api', rateLimiter);

app.use('/uploads',
  (req, res, next) => { res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin'); next(); },
  cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173', credentials: false }),
  express.static(path.join(__dirname, '../uploads'))
);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/versions', versionRoutes);
app.use('/api/gallery', galleryRoutes);

app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.use(errorHandler);

module.exports = app;
