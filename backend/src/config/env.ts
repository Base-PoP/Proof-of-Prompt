import dotenv from "dotenv";
dotenv.config();

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}

export const env = {
  port: process.env.PORT ?? "4000",
  databaseUrl: process.env.DATABASE_URL,
  chainId: process.env.CHAIN_ID ?? "84532",
  rpcUrl: process.env.RPC_URL ?? "",
  usdcAddress: process.env.USDC_ADDRESS ?? "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
  payToAddress: process.env.PAY_TO_ADDRESS ?? "0x5e4D581D318ef0ff9e525529b40c3400457Fdbf6",
  facilitatorKey: process.env.FACILITATOR_PRIVATE_KEY ?? ""
};
