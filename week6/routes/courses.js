const express = require('express');
const { IsNull } = require('typeorm');
const router = express.Router();
const { dataSource } = require('../db/data-source');
const logger = require('../utils/logger')('Course');
const { successMessage } = require('../utils/messageUtils');
const {
  isNotValidSting,
  isNotValidInteger,
  isNotValidUUID,
} = require('../utils/validater');
const isAuth = require('../middleware/isAuth');

const User = require('../entities/User');
const Skill = require('../entities/Skill');
const appError = require('../utils/appError');
const courseRepo = dataSource.getRepository('Course');
const creditPurchaseRepo = dataSource.getRepository('CreditPurchase');
const courseBookingRepo = dataSource.getRepository('CourseBooking');

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
    const { id } = req.user;
    if (isNotValidUUID(courseId)) {
      next(appError(400, '欄位未填寫正確'));
    }

    const course = await courseRepo.findOne({
      where: {
        id: courseId,
      },
    });
    if (!course) {
      next(appError(400, 'ID錯誤'));
      return;
    }

    const userCourseBooking = await courseBookingRepo.findOne({
      where: {
        user_id: id,
        course_id: courseId,
      },
    });
    if (userCourseBooking) {
      next(appError(400, '已經報名過此課程'));
      return;
    }

    const userCredit = await creditPurchaseRepo.sum('purchased_credits', {
      user_id: id,
    });
    const userUsedCredit = await courseBookingRepo.count({
      where: {
        user_id: id,
        cancelledAt: IsNull(),
      },
    });
    const courseBookingCount = await courseBookingRepo.count({
      where: {
        course_id: courseId,
        cancelledAt: IsNull(),
      },
    });

    if (userUsedCredit >= userCredit) {
      next(appError(400, '已無可使用堂數'));
      return;
    } else if (courseBookingCount >= course.max_participants) {
      next(appError(400, '已達最大參加人數，無法參加'));
      return;
    }

    const newCourseBooking = courseBookingRepo.create({
      user_id: id,
      course_id: courseId,
    });
    await courseBookingRepo.save(newCourseBooking);
    successMessage(res, 201, 'success', null);
  } catch (error) {
    logger.error(error);
    next(error);
  }
});

router.delete('/:courseId', isAuth, async (req, res, next) => {
  try {
    const { id } = req.user;
    const { courseId } = req.params;
    const userCourseBooking = await courseBookingRepo.findOne({
      where: {
        user_id: id,
        course_id: courseId,
        cancelledAt: IsNull(),
      },
    });
    if (!userCourseBooking) {
      next(appError(400, 'ID 錯誤'));
      return;
    }
    const updateResult = await courseBookingRepo.update(
      {
        user_id: id,
        course_id: courseId,
        cancelledAt: IsNull(),
      },
      {
        cancelledAt: new Date().toISOString(),
      }
    );
    if (updateResult.affected === 0) {
      next(appError(400, '取消失敗'));
      return;
    }
    successMessage(res, 200, 'success', null);
  } catch (error) {
    logger.error(error);
    next(error);
  }
});

module.exports = router;
