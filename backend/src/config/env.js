import dotenv from "dotenv";

dotenv.config();

export const env = {
  port: Number(process.env.PORT || 5000),
  mongodbUri: process.env.MONGODB_URI || "mongodb://localhost:27017",
  mongodbDatabase: process.env.MONGODB_DATABASE || "newspulse",
  jwtSecret: process.env.JWT_SECRET || "development-access-secret",
  refreshSecret: process.env.JWT_REFRESH_SECRET || "development-refresh-secret",
  scraperPath: process.env.SCRAPER_PATH || "../scraper/main.py",
  pythonBin: process.env.PYTHON_BIN || "python",
  frontendOrigin: process.env.FRONTEND_ORIGIN || "http://localhost:3000",
};
