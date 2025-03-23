// Run using `hardhat test`
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { assert, expect } from "chai";
import { ethers } from "hardhat";
import { Raffle } from "../../typechain-types";
import { Signer } from "ethers";

describe("Raffle", async () => {
  let owner: Signer, player1: Signer;
  const entranceFee: bigint = ethers.parseEther("0.01");
  let raffle: Raffle;

  // deploy raffle contract before each test
  beforeEach(async () => {
    [owner, player1] = await ethers.getSigners();

    const raffleFactory = await ethers.getContractFactory("Raffle");
    raffle = await raffleFactory.deploy(entranceFee);

    await raffle.waitForDeployment();
  });

  describe("constructor", async () => {
    it("Set the entrance fee correctly", async () => {
      const contractEntranceFee: bigint = await raffle.getEntranceFee();
      assert.equal(contractEntranceFee, entranceFee);
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
        value: entranceFee,
      });

      // new player is in the 0'th index
      const playerAddress = await raffle.getPlayer(0);
      assert.equal(playerAddress, await player1.getAddress());
    });
  });
});
