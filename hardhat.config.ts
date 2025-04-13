import "./config";
import { vars, type HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox-viem";
import "./hardhat/remappings";
import "./tasks/erc7702";
import "./tasks/erc4337";

const config: HardhatUserConfig = {
  solidity: "0.8.28",
  networks: {
    sepolia: {
      url: "https://sepolia.drpc.org",
      accounts: [process.env.EOA_PRIVATE_KEY as string],
    },
  },
  etherscan: {
    apiKey: {
      sepolia: vars.get("ETHERSCAN_API_KEY"),
    },
  },
};

export default config;
