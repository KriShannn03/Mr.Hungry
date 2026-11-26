exports.httpError = (status, message, extra) => Object.assign(new Error(message), { status, extra });
exports.round2 = n => Math.round((n + Number.EPSILON) * 100) / 100;