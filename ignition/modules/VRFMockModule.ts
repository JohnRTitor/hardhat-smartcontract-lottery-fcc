// Run hardhat ignition deploy ignition/modules/VRFMockModule.ts --network localhost
import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { network } from "hardhat";
import { ethers } from "ethers";
import { developmentChains } from "../../helper-hardhat-config";

const VRFMockModule = buildModule("VRFMockModule", (m) => {
  // https://docs.chain.link/vrf/v2/subscription/supported-networks#sepolia-testnet
  const BASE_FEE: bigint = ethers.parseEther("0.25"); // premium 0.25 LINK
  const GAS_PRICE_LINK: bigint = ethers.parseEther("0.000000001"); // 0.000000001 LINK per gas, calculated based on gas price

  const vrfMock = m.contract("VRFCoordinatorV2Mock", [
    BASE_FEE,
    GAS_PRICE_LINK,
  ]);
  return { vrfMock };
});

export default VRFMockModule;
