import { ethers } from "ethers";

export interface networkConfigItem {
  name?: string;
  vrfCoordinatorV2Address?: string;
  gasLane?: string;
  subscriptionId?: string;
  callbackGasLimit?: number;
  blockConfirmations?: number;
}

export interface networkConfigInfo {
  [key: number]: networkConfigItem;
}

export const networkConfig: networkConfigInfo = {
  31337: {
    name: "localhost",
    // we are using a mock, so it doesn't matter which gas lane we use
    gasLane:
      "0x474e34a077df58807dbe9c96d3c009b23b3c6d0cce433e59bbf5b34f823bc56c",
    callbackGasLimit: 500000,
    blockConfirmations: 1,
  },
  // https://docs.chain.link/vrf/v2/subscription/supported-networks#sepolia-testnet
  11155111: {
    name: "sepolia",
    vrfCoordinatorV2Address: "0x8103B0A8A00be2DDC778e6e7eaa21791Cd364625",
    // 750 gwei key hash
    gasLane:
      "0x474e34a077df58807dbe9c96d3c009b23b3c6d0cce433e59bbf5b34f823bc56c",
    // https://vrf.chain.link/ create a subscription there and add our contract's
    // address as the consumer
    subscriptionId:
      "92258930333064062300767612623392355552465533766246726876728170367089958726019",
    callbackGasLimit: 500000,
    blockConfirmations: 6,
  },
};

// entrance fee to enter the lottery for each player, chosen by us
// could vary by network, but lets charge the same fee for all networks
export const RAFFLE_ENTRANCE_FEE = ethers.parseEther("0.1");
// the time to wait before picking a winner
export const RAFFLE_INTERVAL = 30;

export const developmentChains: string[] = ["hardhat", "localhost"];
