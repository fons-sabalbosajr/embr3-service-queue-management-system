require('dotenv').config();

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const connectDB = require('./config/db');
const adminManagementRoutes = require('./routes/adminManagementRoutes');
const appLogRoutes = require('./routes/appLogRoutes');
const authRoutes = require('./routes/authRoutes');
const diagnosticsRoutes = require('./routes/diagnosticsRoutes');
const clientNotificationRoutes = require('./routes/clientNotificationRoutes');
const queueDisplayRoutes = require('./routes/queueDisplayRoutes');
const queueOfficerRoutes = require('./routes/queueOfficerRoutes');
const transactionMonitoringRoutes = require('./routes/transactionMonitoringRoutes');

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.get('/', (_req, res) => {
  res.json({
    message: 'SQMS server is running.',
  });
});

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    database:
      mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/admin-users', adminManagementRoutes);
app.use('/api/app-logs', appLogRoutes);
app.use('/api/diagnostics', diagnosticsRoutes);
app.use('/api/client-notifications', clientNotificationRoutes);
app.use('/api/queue-display', queueDisplayRoutes);
app.use('/api/queue-officers', queueOfficerRoutes);
app.use('/api/transaction-monitoring', transactionMonitoringRoutes);

async function startServer() {
  await connectDB();

  app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
  });
}

startServer().catch((error) => {
  console.error('Failed to start server', error);
  process.exit(1);
});