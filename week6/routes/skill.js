const express = require('express');

const router = express.Router();
const { dataSource } = require('../db/data-source');
const logger = require('../utils/logger')('Skill');
const { successMessage } = require('../utils/messageUtils');
const appError = require('../utils/appError');
const {
  isUndefined,
  isNotValidSting,
  isNotValidUUID,
} = require('../utils/validater');

const skillRepo = dataSource.getRepository('Skill');

router.get('/', async (req, res, next) => {
  try {
    const skills = await skillRepo.find({
      select: ['id', 'name'],
    });
    successMessage(res, 200, 'success', skills);
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { name } = req.body;
    if (isUndefined(name) || isNotValidSting(name)) {
      next(appError(400, '欄位未填寫正確'));
      return;
    }
    const existSkills = await skillRepo.find({
      where: { name },
    });
    if (existSkills.length > 0) {
      next(appError(409, '資料重複'));
      return;
    }
    const newSkill = await skillRepo.create({
      name,
    });
    const result = await skillRepo.save(newSkill);
    successMessage(res, 200, 'success', result);
  } catch (error) {
    next(error);
  }
});

router.delete('/:skilled', async (req, res, next) => {
  try {
    const { skilled } = req.params;
    if (isNotValidSting(skilled) || isNotValidUUID(skilled)) {
      next(appError(400, 'ID 錯誤'));
      return;
    }
    const result = await skillRepo.delete(skilled);
    if (result.affected === 0) {
      next(appError(400, 'ID 錯誤'));
      return;
    }
    successMessage(res, 200, 'success');
  } catch (error) {
    next(error);
  }
});

module.exports = router;
