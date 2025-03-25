// Run hardhat ignition deploy ignition/modules/Raffle.ts --network localhost
import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { network } from "hardhat";
import { ethers } from "ethers";
import { developmentChains, networkConfig } from "../../helper-hardhat-config";
import VRFMockModule from "./VRFMockModule";
import { subtle } from "node:crypto";

export default buildModule("RaffleModule", (m) => {
  // https://docs.chain.link/vrf/v2/subscription/supported-networks#sepolia-testnet
  const BASE_FEE: bigint = ethers.parseEther("0.25"); // premium 0.25 LINK
  const GAS_PRICE_LINK = ethers.parseEther("0.000000001"); // 0.000000001 LINK per gas, calculated based on gas price

  let vrfCoordinatorAddress;
  let subscriptionId;

  if (developmentChains.includes(network.name)) {
    const { vrfMock } = m.useModule(VRFMockModule);
    vrfCoordinatorAddress = vrfMock;
    // Create a Chainlink subscription ID (mock setup)
    subscriptionId = m.call(vrfCoordinatorAddress, "createSubscription", []);
  } else {
    vrfCoordinatorAddress = ""; // Replace with real VRF Coordinator address on a testnet
    subscriptionId = ""; // Replace with real subscription ID on a testnet
  }

  // Set up parameters for Raffle contract
  const entranceFee = ethers.parseEther("0.1");
  const gasLane = ""; // Replace with actual key hash
  const callbackGasLimit = 500000;
  const interval = 60;

  // Deploy Raffle contract with mock VRFCoordinator
  const raffle = m.contract("Raffle", [
    vrfCoordinatorAddress,
    entranceFee,
    gasLane,
    subscriptionId,
    callbackGasLimit,
    interval,
  ]);

  return { raffle };
});
