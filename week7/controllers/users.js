const { IsNull, In } = require('typeorm');

const bcrypt = require('bcrypt');
const saltRounds = 10;
const { dataSource } = require('../db/data-source');
const { successMessage } = require('../utils/messageUtils');
const appError = require('../utils/appError');
const {
  isNotValidPassword,
  isNotValidSting,
  isNotValidUserName,
  isNotValidEmail,
} = require('../utils/validater');

const { generateJWT } = require('../utils/jwtUtils');
const userRepo = dataSource.getRepository('User');

const logger = require('../utils/logger')('UsersController');

async function postSignup(req, res, next) {
  const { name, email, password } = req.body;
  if (
    isNotValidUserName(name) ||
    isNotValidEmail(email) ||
    isNotValidSting(password)
  ) {
    next(appError(400, '欄位未填寫正確'));
    return;
  }

  if (isNotValidPassword(password)) {
    next(
      appError(
        400,
        '密碼不符合規則，需要包含英文數字大小寫，最短8個字，最長16個字'
      )
    );
    return;
  }

  const existEmail = await userRepo.findOne({
    where: {
      email,
    },
  });

  if (existEmail) {
    next(appError(400, 'Email 已被使用'));
    return;
  }

  const hashPassword = await bcrypt.hash(password, saltRounds);

  const newUser = userRepo.create({
    name,
    password: hashPassword,
    email,
    role: 'USER',
  });
  const result = await userRepo.save(newUser);

  successMessage(res, 201, 'success', {
    user: { id: result.id, name: result.name },
  });
}

async function postLogin(req, res, next) {
  const { email, password } = req.body;
  if (isNotValidEmail(email)) {
    next(appError(400, '欄位未填寫正確'));
    return;
  }
  if (isNotValidPassword(password)) {
    next(
      appError(
        400,
        '密碼不符合規則，需要包含英文數字大小寫，最短8個字，最長16個字'
      )
    );
    return;
  }

  const existUser = await userRepo.findOne({
    select: ['id', 'name', 'password', 'role'],
    where: { email },
  });
  if (!existUser) {
    next(appError(400, '使用者不存在或密碼輸入錯誤'));
    return;
  }

  const isMatch = await bcrypt.compare(password, existUser.password);
  if (!isMatch) {
    next(appError(401, '使用者不存在或密碼輸入錯誤'));
    return;
  }

  const { id, role, name } = existUser;
  const token = generateJWT({ id, role });

  successMessage(res, 201, 'status', { token, user: { name } });
}

async function getProfile(req, res, next) {
  const { id } = req.user;
  const currentUser = await userRepo.findOne({
    select: ['email', 'name'],
    where: { id },
  });

  successMessage(res, 200, 'success', currentUser);
}

async function getCreditPackage(req, res, next) {
  try {
    const { id } = req.user;
    const creditPurchaseRepo = dataSource.getRepository('CreditPurchase');
    const creditPurchase = await creditPurchaseRepo.find({
      select: {
        purchased_credits: true,
        price_paid: true,
        purchase_at: true,
        CreditPackage: {
          name: true,
        },
      },
      where: {
        user_id: id,
      },
      relations: {
        CreditPackage: true,
      },
    });
    res.status(200).json({
      status: 'success',
      data: creditPurchase.map((item) => {
        return {
          name: item.CreditPackage.name,
          purchased_credits: item.purchased_credits,
          price_paid: parseInt(item.price_paid, 10),
          purchase_at: item.purchase_at,
        };
      }),
    });
  } catch (error) {
    logger.error('取得使用者資料錯誤:', error);
    next(error);
  }
}

async function putProfile(req, res, next) {
  const { id } = req.user;
  const { name } = req.body;
  if (isNotValidUserName(name)) {
    next(appError(400, '欄位未填寫正確'));
    return;
  }
  if (req.user.name === name) {
    next(appError(400, '使用者名稱未變更'));
    return;
  }
  const updatedUser = await userRepo.update({ id }, { name });
  if (updatedUser.affected === 0) {
    next(appError(400, '更新使用者失敗'));
    return;
  }

  successMessage(res, 200, 'success');
}

async function putPassword(req, res, next) {
  const { id } = req.user;
  const {
    password,
    new_password: newPassword,
    confirm_new_password: confirmNewPassword,
  } = req.body;
  if (
    isNotValidSting(password) ||
    isNotValidSting(newPassword) ||
    isNotValidSting(confirmNewPassword)
  ) {
    logger.warn('欄位未填寫正確');
    next(appError(400, '欄位未填寫正確'));
    return;
  }
  if (
    isNotValidPassword(password) ||
    isNotValidPassword(newPassword) ||
    isNotValidPassword(confirmNewPassword)
  ) {
    logger.warn(
      '密碼不符合規則，需要包含英文數字大小寫，最短8個字，最長16個字'
    );
    next(
      appError(
        400,
        '密碼不符合規則，需要包含英文數字大小寫，最短8個字，最長16個字'
      )
    );
    return;
  }
  if (newPassword === password) {
    logger.warn('新密碼不能與舊密碼相同');
    next(appError(400, '新密碼不能與舊密碼相同'));
    return;
  }
  if (newPassword !== confirmNewPassword) {
    logger.warn('新密碼與驗證新密碼不一致');
    next(appError(400, '新密碼與驗證新密碼不一致'));
    return;
  }
  const existingUser = await userRepo.findOne({
    select: ['password'],
    where: { id },
  });
  const isMatch = await bcrypt.compare(password, existingUser.password);
  if (!isMatch) {
    next(appError(400, '密碼輸入錯誤'));
    return;
  }
  const hashPassword = await bcrypt.hash(newPassword, saltRounds);
  const updatedResult = await userRepo.update(
    {
      id,
    },
    {
      password: hashPassword,
    }
  );
  if (updatedResult.affected === 0) {
    next(appError(400, '更新密碼失敗'));
    return;
  }
  successMessage(res, 200, 'success', null);
}

async function getCourseBooking(req, res, next) {
  try {
    const { id } = req.user;
    const creditPurchaseRepo = dataSource.getRepository('CreditPurchase');
    const courseBookingRepo = dataSource.getRepository('CourseBooking');
    const userCredit = await creditPurchaseRepo.sum('purchased_credits', {
      user_id: id,
    });
    const userUsedCredit = await courseBookingRepo.count({
      where: {
        user_id: id,
        cancelledAt: IsNull(),
      },
    });
    const courseBookingList = await courseBookingRepo.find({
      select: {
        course_id: true,
        Course: {
          name: true,
          start_at: true,
          end_at: true,
          meeting_url: true,
          user_id: true,
        },
      },
      where: {
        user_id: id,
      },
      order: {
        Course: {
          start_at: 'ASC',
        },
      },
      relations: {
        Course: true,
      },
    });
    const coachUserIdMap = {};
    if (courseBookingList.length > 0) {
      courseBookingList.forEach((courseBooking) => {
        coachUserIdMap[courseBooking.Course.user_id] =
          courseBooking.Course.user_id;
      });
      const coachUsers = await userRepo.find({
        select: ['id', 'name'],
        where: {
          id: In(Object.values(coachUserIdMap)),
        },
      });
      coachUsers.forEach((user) => {
        coachUserIdMap[user.id] = user.name;
      });
      logger.debug(`courseBookingList: ${JSON.stringify(courseBookingList)}`);
      logger.debug(`coachUsers: ${JSON.stringify(coachUsers)}`);
    }
    res.status(200).json({
      status: 'success',
      data: {
        credit_remain: userCredit - userUsedCredit,
        credit_usage: userUsedCredit,
        course_booking: courseBookingList.map((courseBooking) => {
          return {
            course_id: courseBooking.course_id,
            name: courseBooking.Course.name,
            start_at: courseBooking.Course.start_at,
            end_at: courseBooking.Course.end_at,
            meeting_url: courseBooking.Course.meeting_url,
            coach_name: coachUserIdMap[courseBooking.Course.user_id],
          };
        }),
      },
    });
  } catch (error) {
    logger.error('取得使用者課程錯誤:', error);
    next(error);
  }
}

module.exports = {
  postSignup,
  postLogin,
  getProfile,
  getCreditPackage,
  putProfile,
  putPassword,
  getCourseBooking,
};
