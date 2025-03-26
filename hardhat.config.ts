import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import dotenv from "dotenv";
import "hardhat-deploy";

dotenv.config();

const SEPOLIA_RPC_URL: string = process.env.SEPOLIA_RPC_URL!;
const PRIVATE_KEY: string = process.env.PRIVATE_KEY!;
const ETHERSCAN_API_KEY: string = process.env.ETHERSCAN_API_KEY!;

const config: HardhatUserConfig = {
  // default, you can change network on the go, by passing
  // `--network hardhat` or `--network localhost` to hardhat run
  defaultNetwork: "hardhat",
  networks: {
    sepolia: {
      url: SEPOLIA_RPC_URL, // Get from Alchemy or Infura
      accounts: [PRIVATE_KEY], // Get from MetaMask
      chainId: 11155111, // Sepolia testnet chain ID: https://chainlist.org/
    },
    localhost: {
      // start by `hardhat node`
      url: "http://127.0.0.1:8545/",
      // acoounts: [] //auto-filled by hardhat. Thanks hardhat :)
      chainId: 31337, // uses the same chainId as `hardhat` network
    },
  },
  solidity: "0.8.28",
};

export default config;
