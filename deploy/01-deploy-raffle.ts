import { HardhatRuntimeEnvironment } from "hardhat/types";
import {
  developmentChains,
  networkConfig,
  RAFFLE_ENTRANCE_FEE,
  RAFFLE_INTERVAL,
} from "../helper-hardhat-config";
import { ethers } from "hardhat";
import verify from "../utils/verify";
import { Address, DeployFunction, Deployment } from "hardhat-deploy/dist/types";

const VRF_SUB_FUND_AMOUNT = ethers.parseEther("30");

const deployRaffle: DeployFunction = async ({
  deployments,
  getNamedAccounts,
  network,
}: HardhatRuntimeEnvironment) => {
  const { deploy, log } = deployments;
  const { deployer } = await getNamedAccounts();
  let chainId: number = network.config.chainId!;

  if (!networkConfig[chainId]) {
    throw new Error(
      `Error: Chain ID ${chainId} is not supported in networkConfig. Please update helper-hardhat-config.`
    );
  }

  let vrfCoordinatorV2Address: Address, subscriptionId: string;

  if (developmentChains.includes(network.name)) {
    // if we are on a development chain, we deploy mocks
    const vrfCoordinatorV2MockDeployment: Deployment = await deployments.get(
      "VRFCoordinatorV2Mock"
    );
    vrfCoordinatorV2Address = vrfCoordinatorV2MockDeployment.address;

    // get the contract so we can call its functions
    const vrfCoordinatorV2Mock = await ethers.getContractAt(
      "VRFCoordinatorV2Mock",
      vrfCoordinatorV2Address
    );

    // create a subscription
    const tx = await vrfCoordinatorV2Mock.createSubscription();
    const txReceipt = await tx.wait(1);

    const event = txReceipt!.logs.find(
      (eachLog) => eachLog.address === vrfCoordinatorV2Mock.target
    );
    if (!event) {
      throw new Error("Subscription event not found!");
    }

    // Decode the event using the correct ABI
    subscriptionId = ethers.AbiCoder.defaultAbiCoder()
      .decode(["uint64"], event.data)[0]
      .toString();

    log("Subscription created with ID:", subscriptionId);
    await vrfCoordinatorV2Mock.fundSubscription(
      subscriptionId,
      VRF_SUB_FUND_AMOUNT
    );
  } else {
    vrfCoordinatorV2Address =
      networkConfig[chainId]["vrfCoordinatorV2Address"]!;
    subscriptionId = networkConfig[chainId]["subscriptionId"]!;
  }

  const gasLane: Address = networkConfig[chainId]["gasLane"]!;
  const callbackGasLimit: number = networkConfig[chainId]["callbackGasLimit"]!;

  // the args we are passing to the contract's constructor
  // it's better to pass them as strings
  const args: string[] = [
    vrfCoordinatorV2Address,
    RAFFLE_ENTRANCE_FEE.toString(),
    gasLane,
    subscriptionId,
    callbackGasLimit.toString(),
    RAFFLE_INTERVAL.toString(),
  ];

  const raffle = await deploy("Raffle", {
    from: deployer,
    args: args,
    log: true,
    waitConfirmations: networkConfig[chainId]["blockConfirmations"]!,
  });

  // Verify the contract if and only if we are on a testnet and we have an API key
  if (
    !developmentChains.includes(network.name) &&
    process.env.ETHERSCAN_API_KEY
  ) {
    await verify(raffle.address, args);
  }
};

export default deployRaffle;
