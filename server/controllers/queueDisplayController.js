const QueueDisplayConfig = require('../models/QueueDisplayConfig');
const logEvent = require('../utils/logEvent');

async function ensureConfig() {
  let config = await QueueDisplayConfig.findOne({ configKey: 'default' });

  if (!config) {
    config = await QueueDisplayConfig.create({ configKey: 'default' });
  }

  return config;
}

async function getQueueDisplayConfig(_req, res) {
  const config = await ensureConfig();
  return res.json({ config });
}

async function updateQueueDisplaySettings(req, res) {
  try {
    const { refreshSeconds, density, soundAlerts } = req.body;
    const config = await ensureConfig();

    if (refreshSeconds !== undefined) {
      config.refreshSeconds = refreshSeconds;
    }
    if (density !== undefined) {
      config.density = density;
    }
    if (soundAlerts !== undefined) {
      config.soundAlerts = soundAlerts;
    }

    await config.save();

    await logEvent({
      actor: req.admin?.name || 'Administrator',
      action: 'Updated queue dashboard display settings',
      scope: 'Queue Dashboard Display Settings',
      severity: 'Notice',
      source: 'Settings',
    });

    return res.json({ config });
  } catch (error) {
    console.error('Update queue display settings error:', error);
    return res.status(500).json({ message: 'Failed to update display settings.' });
  }
}

async function createQueueDisplayCard(req, res) {
  try {
    const { transactionName } = req.body;

    if (!transactionName) {
      return res.status(400).json({ message: 'Transaction name is required.' });
    }

    const config = await ensureConfig();
    const card = {
      transactionName,
      order: config.counterCards.length,
      active: true,
    };

    config.counterCards.push(card);
    await config.save();

    const createdCard = config.counterCards[config.counterCards.length - 1];

    await logEvent({
      actor: req.admin?.name || 'Administrator',
      action: `Created queue display card for ${transactionName}`,
      scope: 'Queue Dashboard Display Settings',
      severity: 'Notice',
      source: 'Settings',
    });

    return res.status(201).json({ card: createdCard, config });
  } catch (error) {
    console.error('Create queue display card error:', error);
    return res.status(500).json({ message: 'Failed to create queue display card.' });
  }
}

async function updateQueueDisplayCard(req, res) {
  try {
    const { cardId } = req.params;
    const { transactionName, active, order } = req.body;
    const config = await ensureConfig();
    const card = config.counterCards.id(cardId);

    if (!card) {
      return res.status(404).json({ message: 'Queue display card not found.' });
    }

    if (transactionName !== undefined) {
      card.transactionName = transactionName;
    }
    if (active !== undefined) {
      card.active = active;
    }
    if (order !== undefined) {
      card.order = order;
    }

    config.counterCards.sort((a, b) => a.order - b.order);
    await config.save();

    await logEvent({
      actor: req.admin?.name || 'Administrator',
      action: `Updated queue display card for ${card.transactionName}`,
      scope: 'Queue Dashboard Display Settings',
      severity: 'Notice',
      source: 'Settings',
    });

    return res.json({ card, config });
  } catch (error) {
    console.error('Update queue display card error:', error);
    return res.status(500).json({ message: 'Failed to update queue display card.' });
  }
}

async function deleteQueueDisplayCard(req, res) {
  try {
    const { cardId } = req.params;
    const config = await ensureConfig();
    const card = config.counterCards.id(cardId);

    if (!card) {
      return res.status(404).json({ message: 'Queue display card not found.' });
    }

    const transactionName = card.transactionName;
    card.deleteOne();
    config.counterCards.forEach((item, index) => {
      item.order = index;
    });
    await config.save();

    await logEvent({
      actor: req.admin?.name || 'Administrator',
      action: `Deleted queue display card for ${transactionName}`,
      scope: 'Queue Dashboard Display Settings',
      severity: 'Warning',
      source: 'Settings',
    });

    return res.json({ message: 'Queue display card deleted successfully.', config });
  } catch (error) {
    console.error('Delete queue display card error:', error);
    return res.status(500).json({ message: 'Failed to delete queue display card.' });
  }
}

module.exports = {
  getQueueDisplayConfig,
  updateQueueDisplaySettings,
  createQueueDisplayCard,
  updateQueueDisplayCard,
  deleteQueueDisplayCard,
};