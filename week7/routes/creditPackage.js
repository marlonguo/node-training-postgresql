const express = require('express');

const router = express.Router();
const config = require('../config/index');
const { dataSource } = require('../db/data-source');
const logger = require('../utils/logger')('CreditPackage');
const creditPackage = require('../controllers/creditPackage');
const isAuth = require('../middlewares/isAuth');

const handleErrorAsync = require('../utils/handleErrorAsync');

router.get('/', handleErrorAsync(creditPackage.getAll));

router.post('/', handleErrorAsync(creditPackage.post));

router.post(
  '/:creditPackageId',
  isAuth,
  handleErrorAsync(creditPackage.postUserBuy)
);

router.delete(
  '/:creditPackageId',
  handleErrorAsync(creditPackage.deletePackage)
);

module.exports = router;
