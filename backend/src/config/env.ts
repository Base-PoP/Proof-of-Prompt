import dotenv from "dotenv";
dotenv.config();

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}

export const env = {
  port: process.env.PORT ?? "4000",
  databaseUrl: process.env.DATABASE_URL
};
