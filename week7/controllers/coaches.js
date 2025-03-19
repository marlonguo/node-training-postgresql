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

  const coach = await coachRepo
    .createQueryBuilder('coach')
    .leftJoinAndSelect('coach.User', 'user')
    .select(['coach.user_id', 'user.name'])
    .getRawOne();

  if (!coach) {
    logger.warn('找不到該教練');
    next(appError(400, '找不到該教練'));
    return;
  }
  logger.info(`coach: ${JSON.stringify(coach)}`);

  const courses = await courseRepo
    .createQueryBuilder('course')
    .leftJoinAndSelect('course.Skill', 'skill')
    .select([
      'course.id AS id',
      'skill.name AS skill_name',
      'course.name as name',
      'course.description AS description',
      'course.start_at AS start_at',
      'course.end_at AS end_at',
      'course.max_participants AS max_participants',
    ])
    .getRawMany();

  const data = courses.map((ele) => {
    ele['coach_name'] = coach.user_name;
    return ele;
  });

  successMessage(res, 200, 'success', data);
}

module.exports = {
  getCoaches,
  getCoachDetail,
  getCoachCourses,
};
