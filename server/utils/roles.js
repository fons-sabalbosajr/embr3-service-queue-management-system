const ROLE_ALIASES = {
  'Super Admin': 'Super Admin/Developer',
  'Super Admin/Developer': 'Super Admin/Developer',
  Admin: 'Admin',
  'Queue Officer': 'Queue Officer',
  Secretariat: 'Secretariat',
};

function normalizeRole(role) {
  return ROLE_ALIASES[role] || role;
}

function accessModulesForRole(role) {
  const normalizedRole = normalizeRole(role);

  switch (normalizedRole) {
    case 'Super Admin/Developer':
      return [
        'dashboard',
        'developer',
        'settings',
        'queue-officer',
        'queue-officer-serving-desk',
        'queue-officer-portal',
        'secretariat',
        'queue-dashboard',
      ];
    case 'Admin':
      return ['dashboard', 'settings', 'queue-dashboard'];
    case 'Queue Officer':
      return [
        'dashboard',
        'queue-officer',
        'queue-officer-serving-desk',
        'queue-officer-portal',
        'queue-dashboard',
      ];
    case 'Secretariat':
      return ['dashboard', 'secretariat', 'queue-dashboard'];
    default:
      return ['dashboard'];
  }
}

module.exports = {
  normalizeRole,
  accessModulesForRole,
};