// Run using `hardhat test`
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { assert, expect } from "chai";
import { ethers, network, deployments } from "hardhat";
import { Raffle, VRFCoordinatorV2Mock } from "../../typechain-types";
import { EventLog, Signer } from "ethers";
import {
  developmentChains,
  networkConfig,
  RAFFLE_ENTRANCE_FEE,
  RAFFLE_INTERVAL,
} from "../../helper-hardhat-config";
import { Address } from "hardhat-deploy/dist/types";

// only run on development chains like localhost or hardhat
if (!developmentChains.includes(network.name)) {
  describe.skip;
}

describe("Raffle", () => {
  let owner: Signer, player1: Signer;
  let raffle: Raffle, vrfCoordinatorV2Mock: VRFCoordinatorV2Mock;
  let raffleAddress: Address;

  const chainId = network.config.chainId!;

  // deploy raffle contract before each test
  beforeEach(async () => {
    [owner, player1] = await ethers.getSigners();

    await deployments.fixture(["all"]);

    raffleAddress = (await deployments.get("Raffle")).address;

    raffle = await ethers.getContractAt("Raffle", raffleAddress);
    vrfCoordinatorV2Mock = await ethers.getContractAt(
      "VRFCoordinatorV2Mock",
      (
        await deployments.get("VRFCoordinatorV2Mock")
      ).address
    );
  });

  describe("constructor", () => {
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

  describe("enterRaffle", () => {
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

    it("Doesn't allow entrance when raffle is closed", async () => {
      // GOAL: is to put the contract in critical section/calculating state

      // enter the raffle
      await raffle.enterRaffle({ value: RAFFLE_ENTRANCE_FEE });

      // https://hardhat.org/hardhat-network/docs/reference#special-testing/debugging-methods
      // allows us to progress the time artificially on the blockchain
      await network.provider.send("evm_increaseTime", [RAFFLE_INTERVAL + 1]);
      // mine a dummy new block
      await network.provider.send("evm_mine", []);

      // Pretend to be a Chainlink keeper
      // also send a empty calldata value by sending 0x
      await raffle.performUpkeep("0x");

      await expect(
        raffle.connect(player1).enterRaffle({ value: RAFFLE_ENTRANCE_FEE })
      ).to.be.revertedWithCustomError(raffle, "Raffle__NotOpen");
    });
  });

  describe("checkUpkeep", () => {
    it("Returns false if people haven't sent any ETH", async () => {
      // here we want to progress time artificially, but checkUpkeep should return false
      // as nobody has sent any ETH to enter the raffle
      await network.provider.send("evm_increaseTime", [RAFFLE_INTERVAL + 1]);
      await network.provider.send("evm_mine", []);
      // we do not want to send it as a transaction, so we static call it
      const { upkeepNeeded } = await raffle.checkUpkeep.staticCall("0x");
      assert(!upkeepNeeded);
    });

    it("Returns false if Raffle isn't open", async () => {
      await raffle.enterRaffle({ value: RAFFLE_ENTRANCE_FEE });
      await network.provider.send("evm_increaseTime", [RAFFLE_INTERVAL + 1]);
      await network.provider.send("evm_mine", []);

      await raffle.performUpkeep("0x");
      const raffleState = await raffle.getRaffleState();
      const { upkeepNeeded } = await raffle.checkUpkeep.staticCall("0x");
      assert(raffleState.toString() === "1");
      assert(!upkeepNeeded);
    });

    it("Returns false if enough time hasn't passed", async () => {
      await raffle.enterRaffle({ value: RAFFLE_ENTRANCE_FEE });

      // progress time by a few seconds less than the interval
      await network.provider.send("evm_increaseTime", [RAFFLE_INTERVAL - 3]);
      await network.provider.send("evm_mine", []);

      const { upkeepNeeded } = await raffle.checkUpkeep.staticCall("0x");
      assert(!upkeepNeeded);
    });

    it("Returns true if enough time has passed, has players, eth, and is open", async () => {
      await raffle.enterRaffle({ value: RAFFLE_ENTRANCE_FEE });
      await raffle.connect(player1).enterRaffle({ value: RAFFLE_ENTRANCE_FEE });

      await network.provider.send("evm_increaseTime", [RAFFLE_INTERVAL + 1]);
      await network.provider.send("evm_mine", []);

      const raffleState = await raffle.getRaffleState();
      const { upkeepNeeded } = await raffle.checkUpkeep.staticCall("0x");

      assert(raffleState.toString() === "0");
      assert(upkeepNeeded);
    });
  });

  describe("performUpkeep", () => {
    it("it can only run if checkUpkeep is true", async () => {
      await raffle.enterRaffle({ value: RAFFLE_ENTRANCE_FEE });

      // increase time + fund contract (already done) so checkUpkeep returns true
      await network.provider.send("evm_increaseTime", [RAFFLE_INTERVAL + 1]);
      await network.provider.send("evm_mine", []);

      const tx = await raffle.performUpkeep("0x");
      assert(tx);
    });

    it("reverts when checkUpkeep is false", async () => {
      await expect(raffle.performUpkeep("0x")).to.be.revertedWithCustomError(
        raffle,
        "Raffle__UpkeepNotNeeded"
      );
    });

    it("updates the raffle state, emits an event, calls the vrf coordinator", async () => {
      await raffle.enterRaffle({ value: RAFFLE_ENTRANCE_FEE });

      await network.provider.send("evm_increaseTime", [RAFFLE_INTERVAL + 1]);
      await network.provider.send("evm_mine", []);

      const tx = await raffle.performUpkeep("0x");
      const txReceipt = await tx.wait(1);

      const raffleAddress = await raffle.getAddress();

      const event = txReceipt!.logs.find(
        (eachLog) =>
          eachLog.address === raffleAddress &&
          (eachLog as EventLog).eventName === "RequestedRaffleWinner"
      ) as EventLog;

      if (!event) {
        throw new Error("RequestedRaffleWinner event not found!");
      }

      // get the requestId from the emitted event
      const requestId: string = event.args[0].toString();
      const raffleState = await raffle.getRaffleState();

      assert(Number.parseInt(requestId) > 0);
      assert(raffleState.toString() == "1");
    });
  });

  describe("fulfillRandomWords", () => {
    // before each have our deployer enter the lottery
    // and increase the time so we can performUpkeep
    beforeEach(async () => {
      await raffle.enterRaffle({ value: RAFFLE_ENTRANCE_FEE });

      await network.provider.send("evm_increaseTime", [RAFFLE_INTERVAL + 1]);
      await network.provider.send("evm_mine", []);
    });

    it("can only be called after performUpkeep", async () => {
      // we haven't even called performUpkeep, which calls this fulfillRandomWords
      // function, so requestId if 0, is invalid, at the moment
      await expect(
        vrfCoordinatorV2Mock.fulfillRandomWords(0, raffleAddress)
      ).to.be.revertedWith("nonexistent request");
      // 1 as requestId is also invalid
      await expect(
        vrfCoordinatorV2Mock.fulfillRandomWords(0, raffleAddress)
      ).to.be.revertedWith("nonexistent request");
    });

    it("picks a winner, resets the lottery, and sends money", async () => {
      // we want to have 3 additional people in the lottery
      // so, including the deployer we got 4
      const additionalEntrants = 3;
      const startingAccountIndex = 1;
      const accounts: Signer[] = await ethers.getSigners();
      // for recording the balance of all accounts after betting
      let balanceAfterBetting: Record<string, bigint> = {};

      // record the balance of deployer, we already entered at the top level describe
      balanceAfterBetting[await accounts[0].getAddress()] =
        await ethers.provider.getBalance(await accounts[0].getAddress());

      for (
        let i = startingAccountIndex;
        i < startingAccountIndex + additionalEntrants;
        i++
      ) {
        // enter the raffle as the new account
        await raffle
          .connect(accounts[i])
          .enterRaffle({ value: RAFFLE_ENTRANCE_FEE });
        // record balance after betting
        balanceAfterBetting[await accounts[i].getAddress()] =
          await ethers.provider.getBalance(await accounts[i].getAddress());
      }

      // record the initial timestamp
      const startingTimeStamp = await raffle.getLatestTimeStamp();

      // we want to call performUpkeep (acting like a Chainlink Keeper)
      // it then calls fulfillRandomWords, acting as a Chainlink VRF
      // We need to wait for fulfillRandomWords to be called by the VRF/us
      // to be honest, since our hardhat node is fast, we don't need to wait
      // for it at all, but it's a good practice to wait as we have to wait
      // if we decide to do this on a testnet later
      await new Promise<void>(async (resolve, reject) => {
        // Event listener for WinnerPicked
        raffle.once(raffle.filters.WinnerPicked, async () => {
          // we reach here if we found the event
          try {
            const recentWinner = await raffle.getRecentWinner();
            const raffleState = await raffle.getRaffleState();
            const endingTimeStamp = await raffle.getLatestTimeStamp();
            const numPlayers = await raffle.getNumberOfPlayers();

            const winnerBalanceBeforeWinning: bigint =
              balanceAfterBetting[recentWinner];
            const winnerBalanceAfterWinning: bigint =
              await ethers.provider.getBalance(recentWinner);

            // once a winner is picked, the lottery is reset
            assert.equal(numPlayers.toString(), "0"); // no players
            assert.equal(raffleState.toString(), "0"); // open
            assert(endingTimeStamp > startingTimeStamp); // timestamp updated

            // check that the winner has the money of all players
            assert.equal(
              winnerBalanceBeforeWinning +
                RAFFLE_ENTRANCE_FEE * BigInt(1 + additionalEntrants),
              winnerBalanceAfterWinning
            );
          } catch (error) {
            // if the event is not emiited or takes too long, we throw an error
            reject(error);
          }
          // we got everything, finally resolve
          resolve();
        });

        // Below we performUpkeep, which returns an event
        // with our requestId
        const tx = await raffle.performUpkeep("0x");
        const txReceipt = await tx.wait(1);
        const event = txReceipt!.logs.find(
          (eachLog) =>
            eachLog.address === raffleAddress &&
            (eachLog as EventLog).eventName === "RequestedRaffleWinner"
        ) as EventLog;

        if (!event) {
          throw new Error("RequestedRaffleWinner event not found!");
        }

        // we feed the requestId to fulfillRandomWords
        // which emits the WinnerPicked event, once successful
        await vrfCoordinatorV2Mock.fulfillRandomWords(
          event.args[0],
          raffleAddress
        );
        // once WinnerPicked event is fired, we go back to the
        // event listener few lines above ^^
      });
    });
  });
});
