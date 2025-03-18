const jwt = require('jsonwebtoken');
const config = require('../config/index');
const appError = require('./appError');
const secret = require('../config/secret');

const JWT_SECRET = config.get('secret.jwtSecret');
const JWT_EXPIRES_DAY = config.get('secret.jwtExpiresDay');

function generateJWT(plyload) {
  return jwt.sign(plyload, JWT_SECRET, { expiresIn: JWT_EXPIRES_DAY });
}

function verifyJWT(token) {
  return new Promise((resolve, reject) => {
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
      if (err) {
        switch (err.name) {
          case 'TokenExpiredError':
            reject(appError(401, 'Token 已過期'));
            break;
          default:
            reject(appError(401, '無效的 token'));
            break;
        }
      } else {
        resolve(decoded);
      }
    });
  });
}

module.exports = { generateJWT, verifyJWT };
