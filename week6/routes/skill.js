const express = require("express");

const router = express.Router();
const { dataSource } = require("../db/data-source");
const logger = require("../utils/logger")("Skill");
const { successMessage, errorMessage } = require("../utils/messageUtils");
const {
  isUndefined,
  isNotValidSting,
  isNotValidUUID,
} = require("../utils/validater");

const skillRepo = dataSource.getRepository("Skill");

router.get("/", async (req, res, next) => {
  try {
    const skills = await skillRepo.find({
      select: ["id", "name"],
    });
    successMessage(res, 200, "success", skills);
  } catch (error) {
    next(error);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const { name } = req.body;
    if (isUndefined(name) || isNotValidSting(name)) {
      errorMessage(res, 400, "failed", "欄位未填寫正確");
      return;
    }
    const existSkills = await skillRepo.find({
      where: { name },
    });
    if (existSkills.length > 0) {
      errorMessage(res, 409, "failed", "資料重複");
      return;
    }
    const newSkill = await skillRepo.create({
      name,
    });
    const result = await skillRepo.save(newSkill);
    successMessage(res, 200, "success", result);
  } catch (error) {
    next(error);
  }
});

router.delete("/:skilled", async (req, res, next) => {
  try {
    const { skilled } = req.params;
    if (isNotValidSting(skilled) || isNotValidUUID(skilled)) {
      errorMessage(res, 400, "failed", "ID 錯誤");
      return;
    }
    const result = await skillRepo.delete(skilled);
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
