const { verifyJWT } = require('../utils/jwtUtils');
const appError = require('../utils/appError');
const logger = require('../utils/logger')('isAuth');
const { dataSource } = require('../db/data-source');

const userRepo = dataSource.getRepository('User');

async function isAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startWith('Bearer')) {
      next(appError(401, '你尚未登入'));
      return;
    }
    const token = authHeader.split('Bearer')[1];
    const decoded = await verifyJWT(token);
    const currentUser = await userRepo.findOne({
      where: { id: decoded.id },
    });
    if (!currentUser) {
      next(appError(401, '無效的 token'));
      return;
    }

    req.usser = currentUser;
    next();
  } catch (error) {
    next(error);
  }
}

module.exports = isAuth;
