const { dataSource } = require('../db/data-source');
const logger = require('../utils/logger')('CoachesController');

const { successMessage } = require('../utils/messageUtils');
const appError = require('../utils/appError');
const {
  isNotValidInteger,
  isNotValidUUID,
  isNotValidSting,
} = require('../utils/validater');

const User = require('../entities/User');
const coachRepo = dataSource.getRepository('Coach');
const userRepo = dataSource.getRepository('User');
const courseRepo = dataSource.getRepository('Course');
const skillRepo = dataSource.getRepository('Skill');

async function getCoaches(req, res, next) {
  const { per, page } = req.query;
  if (isNotValidInteger(Number(per) || isNotValidInteger(Number(page)))) {
    next(appError(400, '查詢參數錯誤'));
    return;
  }

  const result = await coachRepo.find({
    select: { id: true, User: { name: true } },
    take: per,
    skip: per * (page - 1),
    relations: ['User'],
  });
  const coaches = result.map((item) => {
    const { name } = { ...item.User };
    return { ...item, name, User: undefined };
  });

  successMessage(res, 200, 'success', coaches);
}

async function getCoachDetail(req, res, next) {
  const { coachId } = req.params;
  if (isNotValidUUID(coachId)) {
    next(appError(400, '欄位未填寫正確'));
    return;
  }

  const foundCoach = await coachRepo.findOne({
    where: { id: coachId },
    select: {
      User: {
        name: true,
        role: true,
      },
    },
    relations: ['User'],
  });

  if (!foundCoach) {
    next(appError(400, '找不到該教練'));
    return;
  }

  const user = { ...foundCoach.User };
  const coach = { ...foundCoach, User: undefined };

  successMessage(res, 200, 'success', { user, coach });
}

async function getCoachCourses(req, res, next) {
  const { coachId } = req.params;
  if (isNotValidUUID(coachId)) {
    next(appError(400, '欄位未填寫正確'));
    return;
  }
  const coach = await coachRepo.findOne({
    select: {
      id: true,
      user_id: true,
      User: {
        name: true,
      },
    },
    where: {
      id: coachId,
    },
    relations: {
      User: true,
    },
  });
  if (!coach) {
    logger.warn('找不到該教練');
    next(appError(400, '找不到該教練'));
    return;
  }
  logger.info(`coach: ${JSON.stringify(coach)}`);
  const courses = await courseRepo.find({
    select: {
      id: true,
      name: true,
      description: true,
      start_at: true,
      end_at: true,
      max_participants: true,
      Skill: {
        name: true,
      },
    },
    where: {
      user_id: coach.user_id,
    },
    relations: {
      Skill: true,
    },
  });
  logger.info(`courses: ${JSON.stringify(courses)}`);
  const data = courses.map((course) => ({
    id: course.id,
    name: course.name,
    description: course.description,
    start_at: course.start_at,
    end_at: course.end_at,
    max_participants: course.max_participants,
    coach_name: coach.User.name,
    skill_name: course.Skill.name,
  }));
  successMessage(res, 200, 'success', data);
}

module.exports = {
  getCoaches,
  getCoachDetail,
  getCoachCourses,
};
