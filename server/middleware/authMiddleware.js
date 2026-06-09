const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const QueueOfficer = require('../models/QueueOfficer');

async function protect(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;

    if (!token) {
      return res.status(401).json({ message: 'Not authorized.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    let user = null;
    let userType = decoded.type || 'admin';

    if (userType === 'queue-officer') {
      user = await QueueOfficer.findById(decoded.id);
    } else {
      user = await Admin.findById(decoded.id);
      userType = 'admin';
    }

    if (!user) {
      return res.status(401).json({ message: 'Account no longer exists.' });
    }

    req.user = user;
    req.userType = userType;
    req.admin = userType === 'admin' ? user : null;
    req.officer = userType === 'queue-officer' ? user : null;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Not authorized.' });
  }
}

function requireAdmin(req, res, next) {
  if (req.userType !== 'admin') {
    return res.status(403).json({ message: 'Administrator access required.' });
  }

  next();
}

function requireQueueOfficer(req, res, next) {
  if (req.userType !== 'queue-officer') {
    return res.status(403).json({ message: 'Queue officer access required.' });
  }

  next();
}

module.exports = { protect, requireAdmin, requireQueueOfficer };
