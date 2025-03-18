const express = require('express');
const router = express.Router();
const config = require('../config/index');
const { dataSource } = require('../db/data-source');
const logger = require('../utils/logger')('Users');
const users = require('../controllers/users');
const isAuth = require('../middlewares/isAuth');
const handleErrorAsync = require('../utils/handleErrorAsync');

router.post('/signup', handleErrorAsync(users.postSignup));
router.post('/login', handleErrorAsync(users.postLogin));
router.get('/profile', isAuth, handleErrorAsync(users.getProfile));
router.get('/credit-package', isAuth, handleErrorAsync(users.getCreditPackage));
router.put('/profile', isAuth, handleErrorAsync(users.putProfile));
router.put('/password', isAuth, handleErrorAsync(users.putPassword));
router.get('/courses', isAuth, handleErrorAsync(users.getCourseBooking));

module.exports = router;
