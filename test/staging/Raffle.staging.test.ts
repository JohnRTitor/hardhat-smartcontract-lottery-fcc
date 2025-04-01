// Run using `hardhat test`
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { assert, expect } from "chai";
import { ethers, network, deployments } from "hardhat";
import { Raffle } from "../../typechain-types";
import { EventLog, Signer } from "ethers";
import {
  developmentChains,
  networkConfig,
  RAFFLE_ENTRANCE_FEE,
  RAFFLE_INTERVAL,
} from "../../helper-hardhat-config";
import { Address } from "hardhat-deploy/dist/types";

describe("Raffle Staging Tests", function () {
  let owner: Signer, player1: Signer;
  let raffle: Raffle;
  let raffleAddress: Address;

  before(function () {
    // we want to run this only on testnets
    if (developmentChains.includes(network.name)) {
      this.skip();
    }
  });

  // deploy raffle contract before each test
  beforeEach(async function () {
    [owner, player1] = await ethers.getSigners();

    raffleAddress = (await deployments.get("Raffle")).address;
    raffle = await ethers.getContractAt("Raffle", raffleAddress);
  });

  describe("fulfillRandomWords", function () {
    it("works with live Chainlink Keepers and Chainlink VRF, we get a random winner", async function () {
      // enter the Raffle
      const startingTimestamp = await raffle.getLatestTimestamp();

      await new Promise<void>(async (resolve, reject) => {
        raffle.once(raffle.filters.WinnerPicked, async () => {
          console.log("Winner event fired!");
          try {
          } catch (error) {
            console.error(error);
            reject(error);
          }
          resolve();
        });
      });

      // setup listener before we enter the Raffle
      // just in case the blockchain moves really fast

      await raffle.enterRaffle({ value: RAFFLE_ENTRANCE_FEE });
    });
  });
});
