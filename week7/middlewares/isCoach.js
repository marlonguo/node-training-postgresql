const appError = require('../utils/appError');
const logger = require('../utils/logger')('isCoach');

async function isCoach(req, res, next) {
  if (!req.user || req.user.role !== 'COACH') {
    logger.error(req.user);
    next(appError(401, '使用者尚未成為教練'));
    return;
  }
  next();
}

module.exports = isCoach;
