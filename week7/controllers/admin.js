const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');

const { dataSource } = require('../db/data-source');
const logger = require('../utils/logger')('AdminController');

dayjs.extend(utc);
const monthArr = [
  'january',
  'february',
  'march',
  'april',
  'may',
  'june',
  'july',
  'august',
  'september',
  'october',
  'november',
  'december',
];

const { successMessage } = require('../utils/messageUtils');
const appError = require('../utils/appError');
const {
  isUndefined,
  isNotValidSting,
  isNotValidInteger,
  isNotValidUUID,
  isNotValidImageURL,
} = require('../utils/validater');

const coachRepo = dataSource.getRepository('Coach');
const userRepo = dataSource.getRepository('User');
const courseRepo = dataSource.getRepository('Course');
const skillRepo = dataSource.getRepository('Skill');
const courseBookingRepo = dataSource.getRepository('CourseBooking');
const coachLinkSkillRepo = dataSource.getRepository('CoachLinkSkill');
const creditPackageRepo = dataSource.getRepository('CreditPackage');

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
    next(appError(400, '欄位未填寫正確'));
    return;
  }

  const existSkill = await skillRepo.findOne({
    where: { id: skill_id },
  });

  if (!existSkill) {
    next(appError(400, '此技能不存在'));
    return;
  }

  const existUser = await userRepo.findOne({
    where: { id: user_id },
  });

  if (!existUser) {
    next(appError(400, '使用者不存在'));
    return;
  } else if (existUser.role !== 'COACH') {
    next(appError(409, '使用者尚未成為教練'));
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
  const { id } = req.user;
  const { month } = req.query;
  if (isUndefined(month) || !monthArr.includes(month)) {
    logger.warn('欄位未填寫正確');
    next(appError(400, '欄位未填寫正確'));
    return;
  }
  const courses = await courseRepo.find({
    select: ['id'],
    where: { user_id: id },
  });
  const courseIds = courses.map((course) => course.id);
  if (courseIds.length === 0) {
    const data = {
      total: {
        participants: 0,
        revenue: 0,
        course_count: 0,
      },
    };
    successMessage(res, 200, 'success', data);
    return;
  }
  const year = new Date().getFullYear();
  const calculateStartAt = dayjs(`${year}-${month}-01`)
    .startOf('month')
    .toISOString();
  const calculateEndAt = dayjs(`${year}-${month}-01`)
    .endOf('month')
    .toISOString();

  // 該月報名人數, 該月學生報名總課堂數
  const {
    participants,
    course_count,
  } = await courseBookingRepo
    .createQueryBuilder('course_booking')
    .select('COUNT(DISTINCT(user_id))', 'participants')
    .addSelect('COUNT(*)', 'course_count')
    .where('course_id IN (:...ids)', { ids: courseIds })
    .andWhere('cancelled_at IS NULL')
    .andWhere('created_at >= :startDate', { startDate: calculateStartAt })
    .andWhere('created_at <= :endDate', { endDate: calculateEndAt })
    .getRawOne();

  // 計算購買方案總課堂數與總價格, 可得平均一堂價格, 以此來當作教練每個學生報名一堂課的收入
  const totalCreditPackage = await creditPackageRepo
    .createQueryBuilder('credit_package')
    .select('SUM(credit_amount)', 'total_credit_amount')
    .addSelect('SUM(price)', 'total_price')
    .getRawOne();
  const perCreditPrice =
    totalCreditPackage.total_price / totalCreditPackage.total_credit_amount;
  const totalRevenue = course_count * perCreditPrice;

  const data = {
    total: {
      revenue: Math.floor(totalRevenue),
      participants: parseInt(participants, 10),
      course_count: parseInt(course_count, 10),
    },
  };

  successMessage(res, 200, 'success', data);
}

async function getCoachCourses(req, res, next) {
  const { id } = req.user;
  // 獲取該教練開的全部課程
  const courses = await courseRepo.find({
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
  const courseIds = courses.map((course) => course.id); // 收集課程 id
  // 取得該教練每個課程的參加人數
  const coursesParticipant = await courseBookingRepo
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
  const data = courses.map((course) => {
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
  });

  successMessage(res, 200, 'success', data);
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
    next(appError(400, '欄位未填寫正確'));
  }

  const existCourse = await courseRepo.findOne({
    where: { id: courseId },
  });

  if (!existCourse) {
    next(appError(400, '課程不存在'));
    return;
  }

  const existSkill = await skillRepo.findOne({
    where: { id: skill_id },
  });

  if (!existSkill) {
    next(appError(400, '技能不存在'));
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
    next(appError(400, '更新課程失敗'));
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
    next(appError(400, '欄位未填寫正確'));
    return;
  }

  if (
    profile_image_url &&
    (isNotValidSting(profile_image_url) ||
      isNotValidImageURL(profile_image_url))
  ) {
    next(appError(400, '欄位未填寫正確'));
    return;
  }

  const existUser = await userRepo.findOne({
    where: { id: userId },
  });

  if (!existUser) {
    next(appError(400, '使用者不存在'));
    return;
  }

  if (existUser.role === 'COACH') {
    next(appError(409, '使用者已經是教練'));
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
    next(appError(400, '更新使用者失敗'));
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
  const { id } = req.user;
  const {
    experience_years: experienceYears,
    description,
    profile_image_url: profileImageUrl,
    skill_ids: skillIds,
  } = req.body;
  if (
    isNotValidInteger(experienceYears) ||
    isNotValidSting(description) ||
    isNotValidSting(profileImageUrl) ||
    !profileImageUrl.startsWith('https') ||
    !Array.isArray(skillIds) ||
    skillIds.length === 0 ||
    skillIds.every((skillId) => isNotValidUUID(skillId))
  ) {
    logger.warn('欄位未填寫正確');
    next(appError(400, '欄位未填寫正確'));
    return;
  }

  const coach = await coachRepo.findOne({
    select: ['id'],
    where: { user_id: id },
  });

  if (!coach) {
    next(appError(400, '找不到教練'));
    return;
  }

  // 更新 COACH 表
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

  // skillIds 為更新後的技能陣列轉成 {coach_id: skill_id} 陣列
  const newCoachLinkSkill = skillIds.map((skill) => ({
    coach_id: coach.id,
    skill_id: skill,
  }));
  // 先將 COACK_LINK_SKILL 表中, 將該教練的資料清空
  await coachLinkSkillRepo.delete({ coach_id: coach.id });
  // 將新技能增加到 COACK_LINK_SKILL
  const insert = await coachLinkSkillRepo.insert(newCoachLinkSkill);
  logger.info(
    `newCoachLinkSkill: ${JSON.stringify(newCoachLinkSkill, null, 1)}`
  );
  logger.info(`insert: ${JSON.stringify(insert, null, 1)}`);

  const result = await coachRepo
    .createQueryBuilder('coach')
    .select([
      'coach.id AS id',
      'coach.experience_years AS experience_years',
      'coach.description AS description',
      'coach.profile_image_url AS profile_image_url',
      'coachLinkSkill.skill_id AS skill_id',
    ])
    .leftJoin('coach.CoachLinkSkill', 'coachLinkSkill')
    .where(`coach.id = :coach_id`)
    .setParameter('coach_id', coach.id)
    .getRawMany();
  logger.info(`result: ${JSON.stringify(result, null, 1)}`);
  const { skill_id, ...data } = result[0];
  data.skill_ids = result.map((item) => item.skill_id);

  successMessage(res, 200, 'success', data);
}

async function getCoachProfile(req, res, next) {
  const { id } = req.user;

  const result = await coachRepo
    .createQueryBuilder('coach')
    .select([
      'coach.id AS id',
      'coach.experience_years AS experience_years',
      'coach.description AS description',
      'coach.profile_image_url AS profile_image_url',
      'coachLinkSkill.skill_id AS skill_id',
    ])
    .leftJoin('coach.CoachLinkSkill', 'coachLinkSkill')
    .where(`coach.user_id = :user_id`)
    .setParameter('user_id', id)
    .getRawMany();
  logger.info(`result: ${JSON.stringify(result, null, 1)}`);

  const { skill_id, ...data } = result[0];
  data.skill_ids = result.map((item) => item.skill_id);

  successMessage(res, 200, 'success', data);
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
