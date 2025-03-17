const express = require("express");

const router = express.Router();
const { dataSource } = require("../db/data-source");
const logger = require("../utils/logger")("Admin");
const { successMessage, errorMessage } = require("../utils/messageUtils");
const { isNotValidInteger, isNotValidUUID } = require("../utils/validater");

const User = require("../entities/User");
const coachRepo = dataSource.getRepository("Coach");
const userRepo = dataSource.getRepository("User");
const courseRepo = dataSource.getRepository("Course");
const skillRepo = dataSource.getRepository("Skill");

router.get("/", async (req, res, next) => {
  const { per, page } = req.query;
  if (isNotValidInteger(Number(per) || isNotValidInteger(Number(page)))) {
    errorMessage(res, 400, "failed", "查詢參數錯誤");
    return;
  }

  try {
    const result = await coachRepo.find({
      select: { id: true, User: { name: true } },
      take: per,
      skip: per * (page - 1),
      relations: ["User"],
    });
    const coaches = result.map((item) => {
      const { name } = { ...item.User };
      return { ...item, name, User: undefined };
    });

    successMessage(res, 200, "success", coaches);
  } catch (error) {
    next(error);
  }
});

router.get("/:coachId", async (req, res, next) => {
  const { coachId } = req.params;
  if (isNotValidUUID(coachId)) {
    errorMessage(res, 400, "failed", "欄位未填寫正確");
    return;
  }

  try {
    const foundCoach = await coachRepo.findOne({
      where: { id: coachId },
      select: {
        User: {
          name: true,
          role: true,
        },
      },
      relations: ["User"],
    });

    if (!foundCoach) {
      errorMessage(res, 400, "failed", "找不到該教練");
      return;
    }

    const user = { ...foundCoach.User };
    const coach = { ...foundCoach, User: undefined };

    successMessage(res, 200, "success", { user, coach });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
