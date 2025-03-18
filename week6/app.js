const express = require("express");
const cors = require("cors");
const path = require("path");
const pinoHttp = require("pino-http");

const logger = require("./utils/logger")("App");

const creditPackageRouter = require("./routes/creditPackage");
const skillRouter = require("./routes/skill");
const userRouter = require("./routes/users");
const adminRouter = require("./routes/admin");
const coachesRouter = require("./routes/coaches");

const { errorMessage } = require("./utils/messageUtils");

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
app.use(express.static(path.join(__dirname, "public")));

app.get("/healthcheck", (req, res) => {
  res.status(200);
  res.send("OK");
});
app.use("/api/credit-package", creditPackageRouter);
app.use("/api/coaches/skill", skillRouter);
app.use("/api/coaches", coachesRouter);
app.use("/api/users", userRouter);
app.use("/api/admin", adminRouter);
app.use((req, res, next) => {
  errorMessage(res, 404, "error", "無此路由")
})

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  req.log.error(err);
  const statusCode = err.status || 500;

  // errorMessage(res, statusCode, "error", "伺服器錯誤");
  res.status(statusCode).json({
    status: statusCode === 500 ? "error" : "failed",
    message: err.message || "伺服器錯誤"
  })
});

module.exports = app;
