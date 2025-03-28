// Run using `hardhat test`
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { assert, expect } from "chai";
import { ethers, network, deployments } from "hardhat";
import { Raffle, VRFCoordinatorV2Mock } from "../../typechain-types";
import { Signer } from "ethers";
import {
  developmentChains,
  networkConfig,
  RAFFLE_ENTRANCE_FEE,
  RAFFLE_INTERVAL,
} from "../../helper-hardhat-config";

// only run on development chains like localhost or hardhat
if (!developmentChains.includes(network.name)) {
  describe.skip;
}

describe("Raffle", async () => {
  let owner: Signer, player1: Signer;
  let raffle: Raffle, vrfCoordinatorV2Mock: VRFCoordinatorV2Mock;

  const chainId = network.config.chainId!;

  // deploy raffle contract before each test
  beforeEach(async () => {
    [owner, player1] = await ethers.getSigners();

    await deployments.fixture(["all"]);

    raffle = await ethers.getContractAt(
      "Raffle",
      (
        await deployments.get("Raffle")
      ).address
    );
    vrfCoordinatorV2Mock = await ethers.getContractAt(
      "VRFCoordinatorV2Mock",
      (
        await deployments.get("VRFCoordinatorV2Mock")
      ).address
    );
  });

  describe("constructor", async () => {
    it("initializes the raffle correctly", async () => {
      // ideally we make our tests one assert per it
      const raffleState = await raffle.getRaffleState();
      const interval = await raffle.getInterval();
      const entranceFee = await raffle.getEntranceFee();

      assert.equal(raffleState.toString(), "0");
      assert.equal(interval.toString(), RAFFLE_INTERVAL.toString());
      assert.equal(entranceFee.toString(), RAFFLE_ENTRANCE_FEE.toString());
      // we have a lot of args to our constructors but I think this much asserts
      // are enough
    });
  });

  describe("enterRaffle", async () => {
    it("Fails if we don't enter with enough ETH", async () => {
      await expect(
        raffle.connect(player1).enterRaffle({
          value: ethers.parseEther("0.001"),
        })
      ).to.be.revertedWithCustomError(raffle, "Raffle__NotEnoughETHEntered");
    });

    it("Updates the s_players array with the new player address", async () => {
      await raffle.connect(player1).enterRaffle({
        value: RAFFLE_ENTRANCE_FEE,
      });

      // new player is in the 0'th index
      const playerFromContract = await raffle.getPlayer(0);
      assert.equal(playerFromContract, await player1.getAddress());
    });

    it("Emits an event on successful entry", async () => {
      await expect(raffle.enterRaffle({ value: RAFFLE_ENTRANCE_FEE })).to.emit(
        raffle,
        "RaffleEnter"
      );
    });
  });
});
