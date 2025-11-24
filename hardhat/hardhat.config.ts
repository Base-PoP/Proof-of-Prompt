import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import dotenv from "dotenv";

dotenv.config({ path: "../.env" });

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    baseSepolia: {
      url: process.env.HARDHAT_RPC_URL || "https://sepolia.base.org",
      accounts: process.env.HARDHAT_PRIVATE_KEY ? [process.env.HARDHAT_PRIVATE_KEY] : [],
      chainId: 84532,
    },
    base: {
      url: process.env.HARDHAT_RPC_URL_MAINNET || "https://mainnet.base.org",
      accounts: process.env.HARDHAT_PRIVATE_KEY_MAINNET ? [process.env.HARDHAT_PRIVATE_KEY_MAINNET] : [],
      chainId: 8453,
    },
  },
  etherscan: {
    apiKey: {
      baseSepolia: process.env.BASESCAN_API_KEY || "",
      base: process.env.BASESCAN_API_KEY || "",
    },
  },
  sourcify: {
    enabled: true,
  },
};

export default config;
