// Run hardhat ignition deploy ignition/modules/Raffle.ts --network localhost
import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { ethers } from "hardhat";

const RaffleModule = buildModule("RaffleModule", (m) => {
  const entranceFee = m.getParameter("entranceFee", ethers.parseEther("0.01"));

  const raffle = m.contract("Raffle", [entranceFee]);

  return { raffle };
});

export default RaffleModule;
