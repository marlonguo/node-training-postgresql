const express = require("express");

const router = express.Router();
const { dataSource } = require("../db/data-source");
const logger = require("../utils/logger")("CreditPackage");
const { successMessage, errorMessage } = require("../utils/messageUtils");
const {
  isUndefined,
  isNotValidSting,
  isNotValidInteger,
  isNotValidUUID,
} = require("../utils/validater");

const creditPackagesRepo = dataSource.getRepository("CreditPackage");

router.get("/", async (req, res, next) => {
  try {
    const packages = await creditPackagesRepo.find({
      select: ["id", "name", "credit_amount", "price"],
    });
    successMessage(res, 200, "success", packages);
  } catch (error) {
    next(error);
  }
});

router.post("/", async (req, res, next) => {
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
      errorMessage(res, 400, "failed", "欄位未填寫正確");
      return;
    }
    const existPackages = await creditPackagesRepo.find({
      where: { name },
    });
    if (existPackages.length > 0) {
      errorMessage(res, 409, "failed", "資料重複");
      return;
    }
    const newPackage = creditPackagesRepo.create({
      name,
      credit_amount,
      price,
    });
    const result = await creditPackagesRepo.save(newPackage);
    successMessage(res, 200, "success", result);
  } catch (error) {
    next(error);
  }
});

router.delete("/:creditPackageId", async (req, res, next) => {
  try {
    const { creditPackageId } = req.params;
    if (isNotValidSting(creditPackageId) || isNotValidUUID(creditPackageId)) {
      errorMessage(res, 400, "failed", "ID 錯誤");
      return;
    }
    const result = await creditPackagesRepo.delete(creditPackageId);
    if (result.affected === 0) {
      errorMessage(res, 400, "failed", "ID 錯誤");
      return;
    }
    successMessage(res, 200, "success");
  } catch (error) {
    next(error);
  }
});

module.exports = router;
