const express = require('express');
const cors = require('cors');
const path = require('path');
const pinoHttp = require('pino-http');

const logger = require('./utils/logger')('App');
const creditPackageRouter = require('./routes/creditPackage');
const skillRouter = require('./routes/skill');
const usersRouter = require('./routes/users');
const adminRouter = require('./routes/admin');
const coachRouter = require('./routes/coaches');
const coursesRouter = require('./routes/courses');
// const uploadRouter = require('./routes/upload')

const { errorMessage } = require('./utils/messageUtils');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        req.body = req.raw.body;
        return req;
      },
    },
  })
);
app.use(express.static(path.join(__dirname, 'public')));

app.get('/healthcheck', (req, res) => {
  res.status(200);
  res.send('OK');
});
app.use('/api/credit-package', creditPackageRouter);
app.use('/api/coaches/skill', skillRouter);
app.use('/api/users', usersRouter);
app.use('/api/admin', adminRouter);
app.use('/api/coaches', coachRouter);
app.use('/api/courses', coursesRouter);
// app.use('/api/upload', uploadRouter);
app.use((req, res, next) => {
  errorMessage(res, 404, 'error', '無此路由');
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  req.log.error(err);

  const statusCode = err.statusCode || 500;
  const status = statusCode === 500 ? 'error' : 'failed';
  const message = err.message || '伺服器錯誤';

  errorMessage(res, statusCode, status, message);
});

module.exports = app;
