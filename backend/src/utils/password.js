const { httpError } = require('./http');

exports.validatePassword = pw => {
  const p = String(pw || '');
  if (p.length < 8 || !/[A-Za-z]/.test(p) || !/\d/.test(p)) {
    throw httpError(400, 'Password must be at least 8 characters and include both letters and numbers.');
  }
  if (p.length > 72) throw httpError(400, 'Password is too long (max 72 characters).');
  return p;
};