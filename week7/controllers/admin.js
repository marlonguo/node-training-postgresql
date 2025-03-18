const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');

const { dataSource } = require('../db/data-source');
const logger = require('../utils/logger')('AdminController');

dayjs.extend(utc);
const monthMap = {
  january: 1,
  february: 2,
  march: 3,
  april: 4,
  may: 5,
  june: 6,
  july: 7,
  august: 8,
  september: 9,
  october: 10,
  november: 11,
  december: 12,
};

const { successMessage, errorMessage } = require('../utils/messageUtils');
const {
  isUndefined,
  isNotValidSting,
  isNotValidInteger,
  isNotValidUUID,
  isNotValidImageURL,
} = require('../utils/validater');
const isAuth = require('../middlewares/isAuth');
const isCoach = require('../middlewares/isCoach');

const coachRepo = dataSource.getRepository('Coach');
const userRepo = dataSource.getRepository('User');
const courseRepo = dataSource.getRepository('Course');
const skillRepo = dataSource.getRepository('Skill');

async function postCourse(req, res, next) {
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
}

async function getCoachRevenue(req, res, next) {
  try {
    const { id } = req.user;
    const { month } = req.query;
    if (
      isUndefined(month) ||
      !Object.prototype.hasOwnProperty.call(monthMap, month)
    ) {
      logger.warn('欄位未填寫正確');
      res.status(400).json({
        status: 'failed',
        message: '欄位未填寫正確',
      });
      return;
    }
    const courseRepo = dataSource.getRepository('Course');
    const courses = await courseRepo.find({
      select: ['id'],
      where: { user_id: id },
    });
    const courseIds = courses.map((course) => course.id);
    if (courseIds.length === 0) {
      res.status(200).json({
        status: 'success',
        data: {
          total: {
            revenue: 0,
            participants: 0,
            course_count: 0,
          },
        },
      });
      return;
    }
    const courseBookingRepo = dataSource.getRepository('CourseBooking');
    const year = new Date().getFullYear();
    const calculateStartAt = dayjs(`${year}-${month}-01`)
      .startOf('month')
      .toISOString();
    const calculateEndAt = dayjs(`${year}-${month}-01`)
      .endOf('month')
      .toISOString();
    const courseCount = await courseBookingRepo
      .createQueryBuilder('course_booking')
      .select('COUNT(*)', 'count')
      .where('course_id IN (:...ids)', { ids: courseIds })
      .andWhere('cancelled_at IS NULL')
      .andWhere('created_at >= :startDate', { startDate: calculateStartAt })
      .andWhere('created_at <= :endDate', { endDate: calculateEndAt })
      .getRawOne();
    const participants = await courseBookingRepo
      .createQueryBuilder('course_booking')
      .select('COUNT(DISTINCT(user_id))', 'count')
      .where('course_id IN (:...ids)', { ids: courseIds })
      .andWhere('cancelled_at IS NULL')
      .andWhere('created_at >= :startDate', { startDate: calculateStartAt })
      .andWhere('created_at <= :endDate', { endDate: calculateEndAt })
      .getRawOne();
    const totalCreditPackage = await dataSource
      .getRepository('CreditPackage')
      .createQueryBuilder('credit_package')
      .select('SUM(credit_amount)', 'total_credit_amount')
      .addSelect('SUM(price)', 'total_price')
      .getRawOne();
    const perCreditPrice =
      totalCreditPackage.total_price / totalCreditPackage.total_credit_amount;
    const totalRevenue = courseCount.count * perCreditPrice;
    res.status(200).json({
      status: 'success',
      data: {
        total: {
          revenue: Math.floor(totalRevenue),
          participants: parseInt(participants.count, 10),
          course_count: parseInt(courseCount.count, 10),
        },
      },
    });
  } catch (error) {
    logger.error(error);
    next(error);
  }
}

async function getCoachCourses(req, res, next) {
  try {
    const { id } = req.user;
    const courses = await dataSource.getRepository('Course').find({
      select: {
        id: true,
        name: true,
        start_at: true,
        end_at: true,
        max_participants: true,
      },
      where: {
        user_id: id,
      },
    });
    const courseIds = courses.map((course) => course.id);
    const coursesParticipant = await dataSource
      .getRepository('CourseBooking')
      .createQueryBuilder('course_booking')
      .select('course_id')
      .addSelect('COUNT(course_id)', 'count')
      .where('course_id IN (:...courseIds)', { courseIds })
      .andWhere('cancelled_at is null')
      .groupBy('course_id')
      .getRawMany();
    logger.info(
      `coursesParticipant: ${JSON.stringify(coursesParticipant, null, 1)}`
    );
    const now = new Date();
    res.status(200).json({
      status: 'success',
      data: courses.map((course) => {
        const startAt = new Date(course.start_at);
        const endAt = new Date(course.end_at);
        let status = '尚未開始';
        if (startAt < now) {
          status = '進行中';
          if (endAt < now) {
            status = '已結束';
          }
        }
        const courseParticipant = coursesParticipant.find(
          (courseParticipant) => courseParticipant.course_id === course.id
        );
        return {
          id: course.id,
          name: course.name,
          status,
          start_at: course.start_at,
          end_at: course.end_at,
          max_participants: course.max_participants,
          participants: courseParticipant ? courseParticipant.count : 0,
        };
      }),
    });
  } catch (error) {
    logger.error(error);
    next(error);
  }
}

async function getCoachCourseDetail(req, res, next) {
  try {
    const { id } = req.user;
    const course = await dataSource.getRepository('Course').findOne({
      select: {
        id: true,
        name: true,
        description: true,
        start_at: true,
        end_at: true,
        max_participants: true,
        meeting_url: true,
        Skill: {
          name: true,
        },
      },
      where: {
        user_id: id,
      },
      relations: {
        Skill: true,
      },
    });
    res.status(200).json({
      status: 'success',
      data: {
        id: course.id,
        name: course.name,
        description: course.description,
        start_at: course.start_at,
        end_at: course.end_at,
        max_participants: course.max_participants,
        skill_name: course.Skill.name,
        meeting_url: course.meeting_url,
      },
    });
  } catch (error) {
    logger.error(error);
    next(error);
  }
}

async function putCoachCourseDetail(req, res, next) {
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
}

async function postCoach(req, res, next) {
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
}

async function putCoachProfile(req, res, next) {
  try {
    const { id } = req.user;
    const {
      experience_years: experienceYears,
      description,
      profile_image_url: profileImageUrl = null,
      skill_ids: skillIds,
    } = req.body;
    if (
      isUndefined(experienceYears) ||
      isNotValidInteger(experienceYears) ||
      isUndefined(description) ||
      isNotValidSting(description) ||
      isUndefined(profileImageUrl) ||
      isNotValidSting(profileImageUrl) ||
      !profileImageUrl.startsWith('https') ||
      isUndefined(skillIds) ||
      !Array.isArray(skillIds)
    ) {
      logger.warn('欄位未填寫正確');
      res.status(400).json({
        status: 'failed',
        message: '欄位未填寫正確',
      });
      return;
    }
    if (
      skillIds.length === 0 ||
      skillIds.every((skill) => isUndefined(skill) || isNotValidSting(skill))
    ) {
      logger.warn('欄位未填寫正確');
      res.status(400).json({
        status: 'failed',
        message: '欄位未填寫正確',
      });
      return;
    }
    const coachRepo = dataSource.getRepository('Coach');
    const coach = await coachRepo.findOne({
      select: ['id'],
      where: { user_id: id },
    });
    await coachRepo.update(
      {
        id: coach.id,
      },
      {
        experience_years: experienceYears,
        description,
        profile_image_url: profileImageUrl,
      }
    );
    const coachLinkSkillRepo = dataSource.getRepository('CoachLinkSkill');
    const newCoachLinkSkill = skillIds.map((skill) => ({
      coach_id: coach.id,
      skill_id: skill,
    }));
    await coachLinkSkillRepo.delete({ coach_id: coach.id });
    const insert = await coachLinkSkillRepo.insert(newCoachLinkSkill);
    logger.info(
      `newCoachLinkSkill: ${JSON.stringify(newCoachLinkSkill, null, 1)}`
    );
    logger.info(`insert: ${JSON.stringify(insert, null, 1)}`);
    const result = await coachRepo.find({
      select: {
        id: true,
        experience_years: true,
        description: true,
        profile_image_url: true,
        CoachLinkSkill: {
          skill_id: true,
        },
      },
      where: { id: coach.id },
      relations: {
        CoachLinkSkill: true,
      },
    });
    logger.info(`result: ${JSON.stringify(result, null, 1)}`);
    res.status(200).json({
      status: 'success',
      data: {
        id: result[0].id,
        experience_years: result[0].experience_years,
        description: result[0].description,
        profile_image_url: result[0].profile_image_url,
        skill_ids: result[0].CoachLinkSkill.map((skill) => skill.skill_id),
      },
    });
  } catch (error) {
    logger.error(error);
    next(error);
  }
}

async function getCoachProfile(req, res, next) {
  try {
    const { id } = req.user;
    const coachRepo = dataSource.getRepository('Coach');
    const coach = await coachRepo.findOne({
      select: ['id'],
      where: { user_id: id },
    });
    const result = await dataSource.getRepository('Coach').findOne({
      select: {
        id: true,
        experience_years: true,
        description: true,
        profile_image_url: true,
        CoachLinkSkill: {
          skill_id: true,
        },
      },
      where: { id: coach.id },
      relations: {
        CoachLinkSkill: true,
      },
    });
    logger.info(`result: ${JSON.stringify(result, null, 1)}`);
    res.status(200).json({
      status: 'success',
      data: {
        id: result.id,
        experience_years: result.experience_years,
        description: result.description,
        profile_image_url: result.profile_image_url,
        skill_ids:
          result.CoachLinkSkill.length > 0
            ? result.CoachLinkSkill.map((skill) => skill.skill_id)
            : result.CoachLinkSkill,
      },
    });
  } catch (error) {
    logger.error(error);
    next(error);
  }
}

module.exports = {
  postCourse,
  getCoachRevenue,
  getCoachCourses,
  getCoachCourseDetail,
  putCoachCourseDetail,
  postCoach,
  putCoachProfile,
  getCoachProfile,
};
