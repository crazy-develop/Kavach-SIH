const path = require('path');
const express = require('express');
const cors = require('cors');
const http = require('http');

const { initSocket } = require('./utils/socket');
const adminRoutes = require('./routes/adminRoutes');
const authRoutes = require('./routes/authRoutes');
const shareRoutes = require('./routes/shareRoutes');

function createServer() {
  const app = express();
  const server = http.createServer(app);

  app.use(cors());
  app.use(express.json({ limit: '15mb' }));

  app.use('/api/admin', adminRoutes);
  app.use('/api/auth', authRoutes);
  app.use('/api/share', shareRoutes);

  const frontendDist = path.join(__dirname, '..', 'frontend', 'dist');
  app.use(express.static(frontendDist));
  app.use((req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(frontendDist, 'index.html'), (err) => {
      if (err) next();
    });
  });

  initSocket(server);

  return { app, server };
}

module.exports = { createServer };
