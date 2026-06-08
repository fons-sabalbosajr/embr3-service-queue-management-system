const Counter = require('../models/Counter');
const QueueOfficer = require('../models/QueueOfficer');
const logEvent = require('../utils/logEvent');

async function nextEmployeeId() {
  const counter = await Counter.findOneAndUpdate(
    { key: 'queueOfficerEmployeeId' },
    { $inc: { value: 1 } },
    { new: true, upsert: true }
  );

  return `EMB-QMS2026-${String(counter.value).padStart(3, '0')}`;
}

async function listQueueOfficers(_req, res) {
  const officers = await QueueOfficer.find().sort({ createdAt: -1 });
  return res.json({ officers });
}

async function createQueueOfficer(req, res) {
  try {
    const {
      name,
      position,
      designation,
      assignedTransaction,
      status = 'Available',
    } = req.body;

    if (!name || !position || !designation || !assignedTransaction) {
      return res.status(400).json({
        message:
          'Name, position, designation, and assigned transaction are required.',
      });
    }

    const officer = await QueueOfficer.create({
      employeeId: await nextEmployeeId(),
      name,
      position,
      designation,
      assignedTransaction,
      status,
    });

    await logEvent({
      actor: req.admin?.name || 'Administrator',
      action: `Created queue officer ${officer.employeeId}`,
      scope: 'Queue Assigned Officers',
      severity: 'Notice',
      source: 'Settings',
      details: `${officer.name} assigned to ${officer.assignedTransaction}.`,
    });

    return res.status(201).json({ officer });
  } catch (error) {
    console.error('Create queue officer error:', error);
    return res.status(500).json({ message: 'Failed to create queue officer.' });
  }
}

async function updateQueueOfficer(req, res) {
  try {
    const { id } = req.params;
    const { name, position, designation, assignedTransaction, status } = req.body;

    const officer = await QueueOfficer.findById(id);
    if (!officer) {
      return res.status(404).json({ message: 'Queue officer not found.' });
    }

    officer.name = name ?? officer.name;
    officer.position = position ?? officer.position;
    officer.designation = designation ?? officer.designation;
    officer.assignedTransaction =
      assignedTransaction ?? officer.assignedTransaction;
    officer.status = status ?? officer.status;

    await officer.save();

    await logEvent({
      actor: req.admin?.name || 'Administrator',
      action: `Updated queue officer ${officer.employeeId}`,
      scope: 'Queue Assigned Officers',
      severity: 'Notice',
      source: 'Settings',
      details: `${officer.name} set to ${officer.status}.`,
    });

    return res.json({ officer });
  } catch (error) {
    console.error('Update queue officer error:', error);
    return res.status(500).json({ message: 'Failed to update queue officer.' });
  }
}

async function deleteQueueOfficer(req, res) {
  try {
    const { id } = req.params;
    const officer = await QueueOfficer.findById(id);

    if (!officer) {
      return res.status(404).json({ message: 'Queue officer not found.' });
    }

    await officer.deleteOne();

    await logEvent({
      actor: req.admin?.name || 'Administrator',
      action: `Deleted queue officer ${officer.employeeId}`,
      scope: 'Queue Assigned Officers',
      severity: 'Warning',
      source: 'Settings',
      details: `${officer.name} removed from assignments.`,
    });

    return res.json({ message: 'Queue officer deleted successfully.' });
  } catch (error) {
    console.error('Delete queue officer error:', error);
    return res.status(500).json({ message: 'Failed to delete queue officer.' });
  }
}

module.exports = {
  listQueueOfficers,
  createQueueOfficer,
  updateQueueOfficer,
  deleteQueueOfficer,
};