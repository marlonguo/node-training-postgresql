require("dotenv").config();
const http = require("http");
const AppDataSource = require("./db");
const {
  isUndefined,
  isNotValidSting,
  isNotValidInteger,
  isNotValidUUID,
  errorMessage,
  successMessage,
} = require("./utility");

const creditPackagesRepo = AppDataSource.getRepository("CreditPackage");
const skillsRepo = AppDataSource.getRepository("Skill");

const requestListener = async (req, res) => {
  const headers = {
    "Access-Control-Allow-Headers":
      "Content-Type, Authorization, Content-Length, X-Requested-With",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "PATCH, POST, GET,OPTIONS,DELETE",
    "Content-Type": "application/json",
  };
  let body = "";
  req.on("data", (chunk) => {
    body += chunk;
  });

  if (req.url === "/api/credit-package" && req.method === "GET") {
    try {
      const packages = await creditPackagesRepo.find({
        select: ["id", "name", "credit_amount", "price"],
      });
      successMessage(res, packages);
    } catch (error) {
      errorMessage(res, 500, "error", "伺服器錯誤");
    }
  } else if (req.url === "/api/credit-package" && req.method === "POST") {
    req.on("end", async () => {
      try {
        const { name, credit_amount, price } = JSON.parse(body);
        if (
          isUndefined(name) ||
          isNotValidSting(name) ||
          isUndefined(credit_amount) ||
          isNotValidInteger(credit_amount) ||
          isUndefined(price) ||
          isNotValidInteger(price)
        ) {
          errorMessage(res, "failed", 400, "欄位未填寫正確");
          return;
        }
        const existPackages = await creditPackagesRepo.find({
          where: { name },
        });
        if (existPackages.length > 0) {
          errorMessage(res, "failed", 409, "資料重複");
          return;
        }
        const newPackage = creditPackagesRepo.create({
          name,
          credit_amount,
          price,
        });
        const result = await creditPackagesRepo.save(newPackage);
        successMessage(res, result);
      } catch (error) {
        errorMessage(res, "error", 500, "伺服器錯誤");
      }
    });
  } else if (
    req.url.startsWith("/api/credit-package/") &&
    req.method === "DELETE"
  ) {
    try {
      const creditPackageId = req.url.split("/").pop();
      if (isNotValidSting(creditPackageId) || isNotValidUUID(creditPackageId)) {
        errorMessage(res, "failed", 400, "ID 錯誤");
        return;
      }
      const result = await creditPackagesRepo.delete(creditPackageId);
      if (result.affected === 0) {
        errorMessage(res, "failed", 400, "ID 錯誤");
        return;
      }
      successMessage(res);
    } catch (error) {
      errorMessage(res, "error", 500, "伺服器錯誤");
    }
  } else if (req.url === "/api/coaches/skill" && req.method === "GET") {
    try {
      const skills = await skillsRepo.find({
        select: ["id", "name"],
      });
      successMessage(res, skills);
    } catch (error) {
      console.log(error);

      errorMessage(res, "error", 500, "伺服器錯誤");
    }
  } else if (req.url === "/api/coaches/skill" && req.method === "POST") {
    req.on("end", async () => {
      try {
        const { name } = JSON.parse(body);
        if (isUndefined(name) || isNotValidSting(name)) {
          errorMessage(res, "failed", 400, "欄位未填寫正確");
          return;
        }
        const existSkills = await skillsRepo.find({
          where: { name },
        });
        if (existSkills.length > 0) {
          errorMessage(res, "failed", 409, "資料重複");
          return;
        }
        const newSkill = await skillsRepo.create({
          name,
        });
        const result = await skillsRepo.save(newSkill);
        successMessage(res, result);
      } catch (error) {
        errorMessage(res, "error", 500, "伺服器錯誤");
      }
    });
  } else if (
    req.url.startsWith("/api/coaches/skill/") &&
    req.method === "DELETE"
  ) {
    try {
      const skillId = req.url.split("/").pop();
      if (isNotValidSting(skillId) || isNotValidUUID(skillId)) {
        errorMessage(res, "failed", 400, "ID 錯誤");
        return;
      }
      const result = await skillsRepo.delete(skillId);
      if (result.affected === 0) {
        errorMessage(res, "failed", 400, "ID 錯誤");
        return;
      }
      successMessage(res);
    } catch (error) {
      errorMessage(res, "error", 500, "伺服器錯誤");
    }
  } else if (req.method === "OPTIONS") {
    res.writeHead(200, headers);
    res.end();
  } else {
    errorMessage(res, "failed", 404, "無此網站路由");
  }
};

const server = http.createServer(requestListener);

async function startServer() {
  await AppDataSource.initialize();
  console.log("資料庫連接成功");
  server.listen(process.env.PORT);
  console.log(`伺服器啟動成功, port: ${process.env.PORT}`);
  return server;
}

module.exports = startServer();
