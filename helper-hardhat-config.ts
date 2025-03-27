import { ethers } from "ethers";

export interface networkConfigItem {
  name?: string;
  vrfCoordinatorV2Address?: string;
}

export interface networkConfigInfo {
  [key: number]: networkConfigItem;
}

export const networkConfig: networkConfigInfo = {
  11155111: {
    name: "sepolia",
    vrfCoordinatorV2Address: "0x8103B0A8A00be2DDC778e6e7eaa21791Cd364625",
  },
};

export const developmentChains: string[] = ["hardhat", "localhost"];
