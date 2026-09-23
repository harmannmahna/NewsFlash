import app from "./app.js";
import { env } from "./config/env.js";
import { connectDatabase } from "./db/mongo.js";

connectDatabase()
  .then(() => app.listen(env.port, () => console.log(`News Pulse API listening on ${env.port}`)))
  .catch((error) => {
    console.error("Unable to initialize database", error);
    process.exit(1);
  });
