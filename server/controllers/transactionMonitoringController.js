const TransactionMonitoring = require('../models/TransactionMonitoring');
const logEvent = require('../utils/logEvent');

async function getPublicQueueSummary(_req, res) {
  try {
    const queueItems = await TransactionMonitoring.find(
      { clientCallStatus: { $in: ['Queued', 'Waiting to Call', 'CALL', 'CLIENT MISSING'] } },
      {
        clientName: 1,
        clientCardNo: 1,
        clientStatus: 1,
        screeningOfficer: 1,
        transactionStatus: 1,
        specificInquiry: 1,
        eccCnc: 1,
        clientCallStatus: 1,
        createdAt: 1,
      }
    )
      .sort({ createdAt: 1 })
      .lean();

    return res.json({ queueItems });
  } catch (error) {
    console.error('Get public queue summary error:', error);
    return res.status(500).json({ message: 'Failed to load public queue summary.' });
  }
}

async function listTransactions(_req, res) {
  const transactions = await TransactionMonitoring.find().sort({ createdAt: -1 });
  return res.json({ transactions });
}

async function createTransaction(req, res) {
  try {
    const transaction = await TransactionMonitoring.create(req.body);

    await logEvent({
      actor: req.admin?.name || 'Administrator',
      action: `Created transaction ${transaction.clientCardNo}`,
      scope: 'Transaction Monitoring Config',
      severity: 'Notice',
      source: 'Settings',
      details: `${transaction.clientCardNo} registered for ${transaction.transactionStatus}.`,
    });

    return res.status(201).json({ transaction });
  } catch (error) {
    console.error('Create transaction error:', error);
    return res.status(500).json({ message: 'Failed to create transaction.' });
  }
}

async function updateTransaction(req, res) {
  try {
    const { id } = req.params;
    const transaction = await TransactionMonitoring.findById(id);

    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found.' });
    }

    Object.assign(transaction, req.body);
    await transaction.save();

    await logEvent({
      actor: req.admin?.name || 'Administrator',
      action: `Updated transaction ${transaction.clientCardNo}`,
      scope: 'Transaction Monitoring Config',
      severity: 'Notice',
      source: 'Settings',
      details: `${transaction.clientCardNo} updated to ${transaction.clientCallStatus}.`,
    });

    return res.json({ transaction });
  } catch (error) {
    console.error('Update transaction error:', error);
    return res.status(500).json({ message: 'Failed to update transaction.' });
  }
}

async function deleteTransaction(req, res) {
  try {
    const { id } = req.params;
    const transaction = await TransactionMonitoring.findById(id);

    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found.' });
    }

    await transaction.deleteOne();

    await logEvent({
      actor: req.admin?.name || 'Administrator',
      action: `Deleted transaction ${transaction.clientCardNo}`,
      scope: 'Transaction Monitoring Config',
      severity: 'Warning',
      source: 'Settings',
    });

    return res.json({ message: 'Transaction deleted successfully.' });
  } catch (error) {
    console.error('Delete transaction error:', error);
    return res.status(500).json({ message: 'Failed to delete transaction.' });
  }
}

module.exports = {
  getPublicQueueSummary,
  listTransactions,
  createTransaction,
  updateTransaction,
  deleteTransaction,
};