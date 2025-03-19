const express = require('express');

const router = express.Router();
const { dataSource } = require('../db/data-source');
const logger = require('../utils/logger')('CreditPackage');
const { successMessage } = require('../utils/messageUtils');
const appError = require('../utils/appError');
const {
  isUndefined,
  isNotValidSting,
  isNotValidInteger,
  isNotValidUUID,
} = require('../utils/validater');
const isAuth = require('../middleware/isAuth');

const creditPackagesRepo = dataSource.getRepository('CreditPackage');
const creditPurchaseRepo = dataSource.getRepository('CreditPurchase');

router.get('/', async (req, res, next) => {
  try {
    const packages = await creditPackagesRepo.find({
      select: ['id', 'name', 'credit_amount', 'price'],
    });
    successMessage(res, 200, 'success', packages);
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { name, credit_amount, price } = req.body;
    if (
      isUndefined(name) ||
      isNotValidSting(name) ||
      isUndefined(credit_amount) ||
      isNotValidInteger(credit_amount) ||
      isUndefined(price) ||
      isNotValidInteger(price)
    ) {
      next(appError(400, '欄位未填寫正確'));
      return;
    }
    const existPackages = await creditPackagesRepo.find({
      where: { name },
    });
    if (existPackages.length > 0) {
      next(appError(409, '資料重複'));
      return;
    }
    const newPackage = creditPackagesRepo.create({
      name,
      credit_amount,
      price,
    });
    const result = await creditPackagesRepo.save(newPackage);
    successMessage(res, 200, 'success', result);
  } catch (error) {
    next(error);
  }
});

router.delete('/:creditPackageId', async (req, res, next) => {
  try {
    const { creditPackageId } = req.params;
    if (isNotValidSting(creditPackageId) || isNotValidUUID(creditPackageId)) {
      next(appError(400, 'ID 錯誤'));
      return;
    }
    const result = await creditPackagesRepo.delete(creditPackageId);
    if (result.affected === 0) {
      next(appError(400, 'ID 錯誤'));
      return;
    }
    successMessage(res, 200, 'success');
  } catch (error) {
    next(error);
  }
});

router.post('/:creditPackageId', isAuth, async (req, res, next) => {
  try {
    const { id: user_id } = req.user;
    const { creditPackageId } = req.params;
    if (isNotValidUUID(creditPackageId)) {
      next(appError(400, 'ID 錯誤'));
      return;
    }
    const creditPackage = await creditPackagesRepo.findOne({
      where: { id: creditPackageId },
    });
    if (!creditPackage) {
      next(appError(400, 'ID 錯誤'));
      return;
    }

    const creaditPurchase = await creditPurchaseRepo.findOne({
      where: { user_id, credit_package_id: creditPackageId },
    });
    if (creaditPurchase) {
      next(appError(400, '已買此方案'));
      return;
    }

    const newCreditPurchase = creditPurchaseRepo.create({
      user_id: req.user.id,
      credit_package_id: creditPackageId,
      purchased_credits: creditPackage.credit_amount,
      price_paid: creditPackage.price,
      purchase_at: new Date().toISOString(),
    });
    const result = await creditPurchaseRepo.save(newCreditPurchase);
    successMessage(res, 200, 'success', null);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
