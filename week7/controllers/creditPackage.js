const { dataSource } = require('../db/data-source');
const logger = require('../utils/logger')('CreditPackageController');

const { successMessage } = require('../utils/messageUtils');
const appError = require('../utils/appError');
const {
  isUndefined,
  isNotValidSting,
  isNotValidInteger,
  isNotValidUUID,
} = require('../utils/validater');

const creditPackagesRepo = dataSource.getRepository('CreditPackage');
const creditPurchaseRepo = dataSource.getRepository('CreditPurchase');

async function getAll(req, res, next) {
  const packages = await creditPackagesRepo.find({
    select: ['id', 'name', 'credit_amount', 'price'],
  });
  successMessage(res, 200, 'success', packages);
}

async function post(req, res, next) {
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
}

async function postUserBuy(req, res, next) {
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
    next(appError(400, '已買此課程'));
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
}

async function deletePackage(req, res, next) {
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
}

module.exports = {
  getAll,
  post,
  postUserBuy,
  deletePackage,
};
