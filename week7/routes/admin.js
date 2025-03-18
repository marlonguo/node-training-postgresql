const express = require('express');

const router = express.Router();
const admin = require('../controllers/admin');
const isAuth = require('../middlewares/isAuth');
const isCoach = require('../middlewares/isCoach');
const handleErrorAsync = require('../utils/handleErrorAsync');

router.post(
  '/coaches/courses',
  isAuth,
  isCoach,
  handleErrorAsync(admin.postCourse)
);

router.get(
  '/coaches/revenue',
  isAuth,
  isCoach,
  handleErrorAsync(admin.getCoachRevenue)
);

router.get(
  '/coaches/courses',
  isAuth,
  isCoach,
  handleErrorAsync(admin.getCoachCourses)
);

router.get(
  '/coaches/courses/:courseId',
  isAuth,
  handleErrorAsync(admin.getCoachCourseDetail)
);

router.put(
  '/coaches/courses/:courseId',
  isAuth,
  handleErrorAsync(admin.putCoachCourseDetail)
);

router.post('/coaches/:userId', handleErrorAsync(admin.postCoach));

router.put(
  '/coaches',
  isAuth,
  isCoach,
  handleErrorAsync(admin.putCoachProfile)
);

router.get(
  '/coaches',
  isAuth,
  isCoach,
  handleErrorAsync(admin.getCoachProfile)
);

module.exports = router;
