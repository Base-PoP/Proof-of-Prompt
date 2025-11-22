import { createApp } from "./app";
import { env } from "./config/env";
import dotenv from "dotenv";

dotenv.config();
const app = createApp();

app.listen(env.port, () => {
  console.log(`Server running on http://localhost:${env.port}`);
});
