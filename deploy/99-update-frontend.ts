// To run this:
// FRONTEND_CONSTANTS_JSON="/home/masum/Dev-Environment/Blockchains/blockchain-websites/nextjs-smartcontract-lottery-fcc/src/constants/constants.json" hardhat deploy
// OR pass --tags frontend to only run this script

import { deployments, ethers, network } from "hardhat";
import dotenv from "dotenv";
import fs from "fs";
import { PathLike } from "fs";
import { InterfaceAbi } from "ethers";
import { DeployFunction, Deployment } from "hardhat-deploy/dist/types";
import { Raffle } from "../typechain-types";

interface Constants {
  contractAbi: InterfaceAbi;
  contractAddresses: {
    [chainId: string]: string;
  };
}

dotenv.config();

const updateFrontendWrapper: DeployFunction = async () => {
  const defaultPath = "/location/constant/constants.json";
  const constantsPath = process.env.FRONTEND_CONSTANTS_JSON || defaultPath;

  console.log("Updating front end");
  updateFrontendConstants(constantsPath).catch((err) => {
    console.error("❌ Failed to update constants.json:", err);
  });
};

async function updateFrontendConstants(outputPath: PathLike) {
  const raffleDeployment: Deployment = await deployments.get("Raffle");
  const raffle: Raffle = await ethers.getContractAt(
    "Raffle",
    raffleDeployment.address
  );
  const raffleAbi = raffle.interface.fragments;

  let constants: Constants = {
    contractAbi: [],
    contractAddresses: {},
  };

  // Load existing constants.json if it exists
  if (fs.existsSync(outputPath)) {
    try {
      const existing = fs.readFileSync(outputPath, "utf8");
      constants = JSON.parse(existing);
    } catch (err) {
      console.warn("⚠️ Could not parse existing constants.json. Overwriting.");
    }
  }

  constants.contractAbi = raffleAbi;
  constants.contractAddresses = {
    ...constants.contractAddresses,
    [network.config.chainId!]: raffleDeployment.address,
  };

  fs.writeFileSync(outputPath, JSON.stringify(constants, null, 2));
  console.log(`✅ constants.json updated at ${outputPath}`);
}

export default updateFrontendWrapper;
updateFrontendWrapper.tags = ["all", "frontend"];
