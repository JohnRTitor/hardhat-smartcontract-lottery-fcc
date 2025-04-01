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
      "0x787d74caea10b2b357790d5b5247c2f63d1d91572a9846f780606e4d953677ae",
    callbackGasLimit: 500000,
    blockConfirmations: 1,
  },
  // https://docs.chain.link/vrf/v2-5/supported-networks#ethereum-sepolia-testnet
  11155111: {
    name: "sepolia",
    vrfCoordinatorV2Address: "0x9DdfaCa8183c41ad55329BdeeD9F6A8d53168B1B",
    // 500 gwei key hash
    gasLane:
      "0x787d74caea10b2b357790d5b5247c2f63d1d91572a9846f780606e4d953677ae",
    // https://vrf.chain.link/ create a subscription there and add our contract's
    // address as the consumer
    subscriptionId:
      "92258930333064062300767612623392355552465533766246726876728170367089958726019",
    callbackGasLimit: 500000,
    blockConfirmations: 5,
  },
};

// entrance fee to enter the lottery for each player, chosen by us
// could vary by network, but lets charge the same fee for all networks
export const RAFFLE_ENTRANCE_FEE: bigint = ethers.parseEther("0.1");
// the time to wait before picking a winner
export const RAFFLE_INTERVAL: number = 30;
// whether to pay in native tokens (ETH) or pay in LINK
export const ENABLE_NATIVE_PAYMENT: boolean = false;

export const developmentChains: string[] = ["hardhat", "localhost"];
