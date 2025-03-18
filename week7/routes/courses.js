const express = require('express');
const router = express.Router();
const logger = require('../utils/logger')('Courses');
const courses = require('../controllers/courses');
const isAuth = require('../middlewares/isAuth');
const handleErrorAsync = require('../utils/handleErrorAsync');

router.get('/', handleErrorAsync(courses.getAllCourses));
router.post('/:courseId', isAuth, handleErrorAsync(courses.postCourseBooking));
router.delete(
  '/:courseId',
  isAuth,
  handleErrorAsync(courses.deleteCourseBooking)
);

module.exports = router;
