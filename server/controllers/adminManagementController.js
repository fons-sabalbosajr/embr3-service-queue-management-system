const bcrypt = require('bcryptjs');

const Admin = require('../models/Admin');
const logEvent = require('../utils/logEvent');
const { accessModulesForRole, normalizeRole } = require('../utils/roles');

function serializeAdmin(admin) {
  return {
    id: admin._id,
    name: admin.name,
    email: admin.email,
    role: normalizeRole(admin.role),
    status: admin.status,
    accessModules: admin.accessModules || [],
    createdAt: admin.createdAt,
    updatedAt: admin.updatedAt,
  };
}

async function listAdmins(_req, res) {
  const admins = await Admin.find().sort({ createdAt: -1 });
  for (const admin of admins) {
    const normalizedRole = normalizeRole(admin.role);
    if (normalizedRole !== admin.role) {
      admin.role = normalizedRole;
      admin.accessModules = accessModulesForRole(normalizedRole);
      await admin.save();
    }
  }
  return res.json({ admins: admins.map(serializeAdmin) });
}

async function createAdmin(req, res) {
  try {
    const {
      name,
      email,
      password,
      role = 'Queue Officer',
      status = 'Active',
      accessModules = ['dashboard'],
    } = req.body;
    const normalizedRole = normalizeRole(role);

    if (!name || !email || !password) {
      return res
        .status(400)
        .json({ message: 'Name, email, and password are required.' });
    }

    const existing = await Admin.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ message: 'Email already exists.' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const admin = await Admin.create({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      role: normalizedRole,
      status,
      accessModules:
        accessModules?.length ? accessModules : accessModulesForRole(normalizedRole),
    });

    await logEvent({
      actor: req.admin?.name || 'Administrator',
      action: `Created user account for ${admin.email}`,
      scope: 'User Account Management',
      severity: 'Notice',
      source: 'Developer Menu',
    });

    return res.status(201).json({ admin: serializeAdmin(admin) });
  } catch (error) {
    console.error('Create admin error:', error);
    return res.status(500).json({ message: 'Failed to create admin user.' });
  }
}

async function updateAdmin(req, res) {
  try {
    const { id } = req.params;
    const { name, email, role, status, accessModules, password } = req.body;
    const normalizedRole = role ? normalizeRole(role) : undefined;

    const admin = await Admin.findById(id).select('+password');
    if (!admin) {
      return res.status(404).json({ message: 'Admin user not found.' });
    }

    if (email && email.toLowerCase() !== admin.email) {
      const existing = await Admin.findOne({ email: email.toLowerCase() });
      if (existing && String(existing._id) !== String(admin._id)) {
        return res.status(409).json({ message: 'Email already exists.' });
      }
      admin.email = email.toLowerCase();
    }

    admin.name = name ?? admin.name;
    admin.role = normalizeRole(normalizedRole ?? admin.role);
    admin.status = status ?? admin.status;
    admin.accessModules = accessModules ?? admin.accessModules;

    if (!accessModules && normalizedRole) {
      admin.accessModules = accessModulesForRole(admin.role);
    }

    if (password) {
      if (password.length < 8) {
        return res
          .status(400)
          .json({ message: 'Password must be at least 8 characters.' });
      }
      admin.password = await bcrypt.hash(password, 12);
    }

    await admin.save();

    await logEvent({
      actor: req.admin?.name || 'Administrator',
      action: `Updated user account for ${admin.email}`,
      scope: 'User Account Management',
      severity: 'Notice',
      source: 'Developer Menu',
    });

    return res.json({ admin: serializeAdmin(admin) });
  } catch (error) {
    console.error('Update admin error:', error);
    return res.status(500).json({ message: 'Failed to update admin user.' });
  }
}

async function updateAdminAccess(req, res) {
  try {
    const { id } = req.params;
    const { role, status, accessModules } = req.body;
    const normalizedRole = role ? normalizeRole(role) : undefined;

    const admin = await Admin.findById(id);
    if (!admin) {
      return res.status(404).json({ message: 'Admin user not found.' });
    }

    admin.role = normalizeRole(normalizedRole ?? admin.role);
    admin.status = status ?? admin.status;
    admin.accessModules = accessModules ?? admin.accessModules;

    if (!accessModules && normalizedRole) {
      admin.accessModules = accessModulesForRole(admin.role);
    }

    await admin.save();

    await logEvent({
      actor: req.admin?.name || 'Administrator',
      action: `Updated access for ${admin.email}`,
      scope: 'User Account Management',
      severity: 'Notice',
      source: 'Developer Menu',
    });

    return res.json({ admin: serializeAdmin(admin) });
  } catch (error) {
    console.error('Update admin access error:', error);
    return res.status(500).json({ message: 'Failed to update user access.' });
  }
}

async function deleteAdmin(req, res) {
  try {
    const { id } = req.params;

    const admin = await Admin.findById(id);
    if (!admin) {
      return res.status(404).json({ message: 'Admin user not found.' });
    }

    await admin.deleteOne();

    await logEvent({
      actor: req.admin?.name || 'Administrator',
      action: `Deleted user account for ${admin.email}`,
      scope: 'User Account Management',
      severity: 'Warning',
      source: 'Developer Menu',
    });

    return res.json({ message: 'Admin user deleted successfully.' });
  } catch (error) {
    console.error('Delete admin error:', error);
    return res.status(500).json({ message: 'Failed to delete admin user.' });
  }
}

module.exports = {
  listAdmins,
  createAdmin,
  updateAdmin,
  updateAdminAccess,
  deleteAdmin,
};