import { HardhatRuntimeEnvironment } from "hardhat/types";
import { developmentChains, networkConfig } from "../helper-hardhat-config";
import { ethers } from "ethers";

const deployRaffle = async ({
  deployments,
  getNamedAccounts,
  network,
}: HardhatRuntimeEnvironment) => {
  const { deploy, log } = deployments;
  const { deployer } = await getNamedAccounts();
  let chainId: number = network.config.chainId!;

  let vrfCoordinatorV2Address: string;

  // if we are on a development chain, we deploy mocks
  if (developmentChains.includes(network.name)) {
    const vrfCoordinatorV2Mock = await deployments.get("VRFCoordinatorV2Mock");
    vrfCoordinatorV2Address = vrfCoordinatorV2Mock.address;
  } else {
    vrfCoordinatorV2Address =
      networkConfig[chainId]["vrfCoordinatorV2Address"]!;
  }
};
