const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const saltRounds = 10;
const { dataSource } = require('../db/data-source');
const logger = require('../utils/logger')('user');
const config = require('../config/index');
const { successMessage, errorMessage } = require('../utils/messageUtils');
const appError = require('../utils/appError');
const {
  isNotValidPassword,
  isUndefined,
  isNotValidSting,
  isNotValidUserName,
  isNotValidEmail,
} = require('../utils/validater');

const User = require('../entities/User');
const { generateJWT } = require('../utils/jwtUtils');
const isAuth = require('../middleware/isAuth');
const userRepo = dataSource.getRepository(User);

router.post('/signup', async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    if (
      isNotValidUserName(name) ||
      isNotValidEmail(email) ||
      isNotValidSting(password)
    ) {
      errorMessage(res, 400, 'failed', '欄位未填寫正確');
      return;
    }

    if (isNotValidPassword(password)) {
      errorMessage(
        res,
        400,
        'failed',
        '密碼不符合規則，需要包含英文數字大小寫，最短8個字，最長16個字'
      );
      return;
    }

    const existEmail = await userRepo.findOne({
      where: {
        email,
      },
    });

    if (existEmail) {
      errorMessage(res, 409, 'failed', 'Email 已被使用');
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
  } catch (error) {
    next(error);
  }
});

router.post('/login', async (req, res, next) => {
  try {
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
  } catch (error) {
    next(error);
  }
});

router.get('/profile', isAuth, async (req, res, next) => {
  try {
    const { id } = req.user;
    const currentUser = await userRepo.findOne({
      select: ['email', 'name'],
      where: { id },
    });

    successMessage(res, 200, 'success', currentUser);
  } catch (error) {
    logger.error(error);
    next(error);
  }
});

router.put('/profile', isAuth, async (req, res, next) => {
  try {
    const { id } = req.user;
    const { name } = req.body;
    if (isNotValidUserName(name)) {
      next(appError(400, '欄位未填寫正確'));
      return;
    }
    const updatedUser = await userRepo.update({ id }, { name });
    if (updatedUser.affected === 0) {
      errorMessage(res, 400, 'failed', '更新使用者失敗');
      return;
    }

    successMessage(res, 200, 'success');
  } catch (error) {
    logger.error(error);
    next(error);
  }
});

module.exports = router;
