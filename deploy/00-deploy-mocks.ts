import { HardhatRuntimeEnvironment } from "hardhat/types";
import { developmentChains } from "../helper-hardhat-config";
import { ethers } from "ethers";

const BASE_FEE: bigint = ethers.parseEther("0.25"); // premium 0.25 LINK
const GAS_PRICE_LINK: bigint = ethers.parseEther("0.000000001"); // 0.000000001 LINK per gas, calculated based on gas price

const deployMocks = async ({
  deployments,
  getNamedAccounts,
  network,
}: HardhatRuntimeEnvironment) => {
  const { deploy, log } = deployments;
  const { deployer } = await getNamedAccounts();

  if (!developmentChains.includes(network.name)) {
    return;
  }

  log("Local network detected! Deploying mocks....");
  await deploy("VRFCoordinatorV2Mock", {
    from: deployer,
    log: true,
    // See constructor args from "@chainlink/contracts/src/v0.8/tests/MockV3Aggregator.sol"
    args: [BASE_FEE, GAS_PRICE_LINK],
  });

  log("Mocks deployed!");
  log("-----------------------------------------------");

  log(
    "You are deploying to a local network, you'll need a local network running to interact"
  );
  log(
    "Please run `yarn hardhat console --network localhost` to interact with the deployed smart contracts!"
  );
  log("----------------------------------");
};

export default deployMocks;
// we add a tag such that it can be run independently
// `hardhat deploy --tags mocks`
deployMocks.tags = ["all", "mocks"];
