import dotenv from "dotenv";

dotenv.config();

const isProduction = process.env.NODE_ENV === "production";
if (isProduction && (!process.env.JWT_SECRET || !process.env.JWT_REFRESH_SECRET)) {
  throw new Error("JWT_SECRET and JWT_REFRESH_SECRET must be configured in production");
}

export const env = {
  port: Number(process.env.PORT || 5000),
  mongodbUri: process.env.MONGODB_URI || "mongodb://localhost:27017",
  mongodbDatabase: process.env.MONGODB_DATABASE || process.env.MONGO_DB_NAME || "newspulse",
  jwtSecret: process.env.JWT_SECRET || "development-access-secret",
  refreshSecret: process.env.JWT_REFRESH_SECRET || "development-refresh-secret",
  scraperPath: process.env.SCRAPER_PATH || "../scraper/main.py",
  pythonBin: process.env.PYTHON_BIN || "python",
  frontendOrigin: process.env.FRONTEND_ORIGIN || "http://localhost:3000",
  bootstrapEmail: process.env.BOOTSTRAP_EMAIL || "admin@newsflash.local",
  bootstrapPassword: process.env.BOOTSTRAP_PASSWORD || "NewsFlash123!",
  isProduction,
};
