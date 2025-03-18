const express = require('express');

const router = express.Router();
const { dataSource } = require('../db/data-source');
const logger = require('../utils/logger')('Admin');
const { successMessage, errorMessage } = require('../utils/messageUtils');
const {
  isUndefined,
  isNotValidSting,
  isNotValidInteger,
  isNotValidUUID,
  isNotValidImageURL,
} = require('../utils/validater');
const isAuth = require('../middleware/isAuth');
const isCoach = require('../middleware/isCoach');

const coachRepo = dataSource.getRepository('Coach');
const userRepo = dataSource.getRepository('User');
const courseRepo = dataSource.getRepository('Course');
const skillRepo = dataSource.getRepository('Skill');

router.get('/coaches/course', async (req, res, next) => {
  const { userId } = req.params;
  errorMessage(res, 409, 'failed', userId);
});

router.post('/coaches/courses', isAuth, isCoach, async (req, res, next) => {
  try {
    const {
      user_id,
      skill_id,
      name,
      description,
      start_at,
      end_at,
      max_participants,
      meeting_url,
    } = req.body;

    if (
      isNotValidSting(user_id) ||
      isNotValidUUID(user_id) ||
      isNotValidSting(skill_id) ||
      isNotValidUUID(skill_id) ||
      isNotValidSting(name) ||
      isNotValidSting(description) ||
      isNotValidSting(start_at) ||
      isNotValidSting(end_at) ||
      isNotValidInteger(max_participants)
    ) {
      errorMessage(res, 400, 'failed', '欄位未填寫正確');
      return;
    }

    const existSkill = await skillRepo.findOne({
      where: { id: skill_id },
    });

    if (!existSkill) {
      errorMessage(res, 400, 'failed', '此技能不存在');
      return;
    }

    const existUser = await userRepo.findOne({
      where: { id: user_id },
    });

    if (!existUser) {
      errorMessage(res, 400, 'failed', '使用者不存在');
      return;
    } else if (existUser.role !== 'COACH') {
      errorMessage(res, 409, 'failed', '使用者尚未成為教練');
      return;
    }

    const newCourse = courseRepo.create({
      user_id,
      skill_id,
      name,
      description,
      start_at,
      end_at,
      max_participants,
      meeting_url,
    });

    const course = await courseRepo.save(newCourse);

    successMessage(res, 201, 'success', { course });
  } catch (error) {
    next(error);
  }
});

router.put(
  '/coaches/courses/:courseId',
  isAuth,
  isCoach,
  async (req, res, next) => {
    try {
      const { courseId } = req.params;
      const {
        skill_id,
        name,
        description,
        start_at,
        end_at,
        max_participants,
        meeting_url,
      } = req.body;

      if (
        isNotValidUUID(skill_id) ||
        isNotValidSting(name) ||
        isNotValidSting(description) ||
        isNotValidSting(start_at) ||
        isNotValidSting(end_at) ||
        isNotValidInteger(max_participants) ||
        !meeting_url.startsWith('https://')
      ) {
        errorMessage(res, 400, 'failed', '欄位未填寫正確');
      }

      const existCourse = await courseRepo.findOne({
        where: { id: courseId },
      });

      if (!existCourse) {
        errorMessage(res, 400, 'failed', '課程不存在');
        return;
      }

      const existSkill = await skillRepo.findOne({
        where: { id: skill_id },
      });

      if (!existSkill) {
        errorMessage(res, 400, 'failed', '技能不存在');
        return;
      }

      const updatedCourse = await courseRepo.update(
        { id: courseId },
        {
          skill_id,
          name,
          description,
          start_at,
          end_at,
          max_participants,
          meeting_url,
        }
      );
      if (updatedCourse.affected === 0) {
        errorMessage(res, 400, 'failed', '更新課程失敗');
        return;
      }

      const course = await courseRepo.findOne({ where: { id: courseId } });

      successMessage(res, 200, 'success', { course });
    } catch (error) {
      next(error);
    }
  }
);
router.post('/coaches/:userId', async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { experience_years, description, profile_image_url } = req.body;

    if (
      isNotValidSting(userId) ||
      isNotValidUUID(userId) ||
      isNotValidInteger(experience_years) ||
      isNotValidSting(description)
    ) {
      errorMessage(res, 400, 'failed', '欄位未填寫正確');
      return;
    }

    if (
      profile_image_url &&
      (isNotValidSting(profile_image_url) ||
        isNotValidImageURL(profile_image_url))
    ) {
      errorMessage(res, 400, 'failed', '欄位未填寫正確');
      return;
    }

    const existUser = await userRepo.findOne({
      where: { id: userId },
    });

    if (!existUser) {
      errorMessage(res, 400, 'failed', '使用者不存在');
      return;
    }

    if (existUser.role === 'COACH') {
      errorMessage(res, 409, 'failed', '使用者已經是教練');
      return;
    }

    const updatedUser = await userRepo.update(
      {
        id: userId,
      },
      {
        role: 'COACH',
      }
    );

    if (updatedUser.affected === 0) {
      errorMessage(res, 400, 'failed', '更新使用者失敗');
      return;
    }

    const newCoach = coachRepo.create({
      user_id: userId,
      description,
      experience_years,
      profile_image_url,
    });

    const coachResult = await coachRepo.save(newCoach);
    const userResult = await userRepo.findOne({
      where: { id: userId },
    });

    const user = { name: userResult.name, role: userResult.role };

    successMessage(res, 201, 'success', { user, coach: coachResult });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
