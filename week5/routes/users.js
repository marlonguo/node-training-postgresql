const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const saltRounds = 10;
const { dataSource } = require("../db/data-source");
const logger = require("../utils/logger")("CreditPackage");
const { successMessage, errorMessage } = require("../utils/messageUtils");
const {
  isNotValidPassword,
  isUndefined,
  isNotValidSting,
  isNotValidUserName,
  isNotValidEmail,
} = require("../utils/validater");
const User = require("../entities/User");

const userRepo = dataSource.getRepository(User);

router.post("/signup", async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    if (
      isNotValidUserName(name) ||
      isNotValidEmail(email) ||
      isNotValidSting(password)
    ) {
      errorMessage(res, 400, "failed", "欄位未填寫正確");
      return;
    }

    if (isNotValidPassword(password)) {
      errorMessage(
        res,
        400,
        "failed",
        "密碼不符合規則，需要包含英文數字大小寫，最短8個字，最長16個字"
      );
      return;
    }

    const existEmail = await userRepo.findOne({
      where: {
        email,
      },
    });

    if (existEmail) {
      errorMessage(res, 409, "failed", "Email 已被使用");
      return;
    }

    const hashPassword = await bcrypt.hash(password, saltRounds);

    const newUser = userRepo.create({
      name,
      password: hashPassword,
      email,
      role: "USER",
    });
    const result = await userRepo.save(newUser);

    successMessage(res, 201, "success", {
      user: { id: result.id, name: result.name },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
