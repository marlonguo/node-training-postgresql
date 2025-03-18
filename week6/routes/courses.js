const express = require('express');

const router = express.Router();
const { dataSource } = require('../db/data-source');
const logger = require('../utils/logger')('Course');
const { successMessage, errorMessage } = require('../utils/messageUtils');
const {
  isUndefined,
  isNotValidSting,
  isNotValidInteger,
  isNotValidUUID,
} = require('../utils/validater');
const isAuth = require('../middleware/isAuth');

const User = require('../entities/User');
const Skill = require('../entities/Skill');
const appError = require('../utils/appError');
const courseRepo = dataSource.getRepository('Course');

router.get('/', async (req, res, next) => {
  try {
    const courses = await courseRepo
      .createQueryBuilder('course')
      .leftJoinAndSelect('course.Skill', 'skill')
      .leftJoinAndSelect('course.User', 'user')
      .select([
        'course.id',
        'user.name AS coach_name',
        'skill.name AS skill_name',
        'course.name',
        'course.description',
        'course.start_at',
        'course.end_at',
        'course.max_participants',
      ])
      .getRawMany();
    successMessage(res, 200, 'success', courses);
  } catch (error) {
    logger.error(error);
    next(error);
  }
});

router.post('/:courseId', isAuth, async (req, res, next) => {
  try {
    const { courseId } = req.params;
    if (isNotValidUUID(courseId)) {
      next(appError(400, '欄位未填寫正確'));
    }
  } catch (error) {
    next(error);
  }
});

router.delete('/:creditPackageId', async (req, res, next) => {
  try {
  } catch (error) {
    next(error);
  }
});

module.exports = router;
