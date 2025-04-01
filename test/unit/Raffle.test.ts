// Run using `hardhat test`
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { assert, expect } from "chai";
import { ethers, network, deployments } from "hardhat";
import { Raffle, VRFCoordinatorV2_5Mock } from "../../typechain-types";
import { EventLog, Signer } from "ethers";
import {
  developmentChains,
  ENABLE_NATIVE_PAYMENT,
  networkConfig,
  RAFFLE_ENTRANCE_FEE,
  RAFFLE_INTERVAL,
} from "../../helper-hardhat-config";
import { Address } from "hardhat-deploy/dist/types";

describe("Raffle Unit Tests", function () {
  let owner: Signer, player1: Signer;
  let raffle: Raffle, vrfCoordinatorV2_5Mock: VRFCoordinatorV2_5Mock;
  let raffleAddress: Address;

  const calldataArg: string = new ethers.AbiCoder().encode(
    ["bool"],
    [ENABLE_NATIVE_PAYMENT]
  );

  before(function () {
    // we want to run this only on development chains
    if (!developmentChains.includes(network.name)) {
      this.skip();
    }
  });

  // deploy raffle contract before each test
  beforeEach(async function () {
    [owner, player1] = await ethers.getSigners();

    await deployments.fixture(["all"]);

    raffleAddress = (await deployments.get("Raffle")).address;

    raffle = await ethers.getContractAt("Raffle", raffleAddress);
    vrfCoordinatorV2_5Mock = await ethers.getContractAt(
      "VRFCoordinatorV2_5Mock",
      (
        await deployments.get("VRFCoordinatorV2_5Mock")
      ).address
    );
  });

  describe("constructor", function () {
    it("initializes the raffle correctly", async function () {
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

  describe("enterRaffle", function () {
    it("Fails if we don't enter with enough ETH", async function () {
      await expect(
        raffle.connect(player1).enterRaffle({
          value: ethers.parseEther("0.001"),
        })
      ).to.be.revertedWithCustomError(raffle, "Raffle__NotEnoughETHEntered");
    });

    it("Updates the s_players array with the new player address", async function () {
      await raffle.connect(player1).enterRaffle({
        value: RAFFLE_ENTRANCE_FEE,
      });

      // new player is in the 0'th index
      const playerFromContract = await raffle.getPlayer(0);
      assert.equal(playerFromContract, await player1.getAddress());
    });

    it("Emits an event on successful entry", async function () {
      await expect(raffle.enterRaffle({ value: RAFFLE_ENTRANCE_FEE })).to.emit(
        raffle,
        "RaffleEnter"
      );
    });

    it("Doesn't allow entrance when raffle is closed", async function () {
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
      await raffle.performUpkeep(calldataArg);

      await expect(
        raffle.connect(player1).enterRaffle({ value: RAFFLE_ENTRANCE_FEE })
      ).to.be.revertedWithCustomError(raffle, "Raffle__NotOpen");
    });
  });

  describe("checkUpkeep", function () {
    it("Returns false if people haven't sent any ETH", async function () {
      // here we want to progress time artificially, but checkUpkeep should return false
      // as nobody has sent any ETH to enter the raffle
      await network.provider.send("evm_increaseTime", [RAFFLE_INTERVAL + 1]);
      await network.provider.send("evm_mine", []);
      // we do not want to send it as a transaction, so we static call it
      const { upkeepNeeded } = await raffle.checkUpkeep.staticCall(calldataArg);
      assert(!upkeepNeeded);
    });

    it("Returns false if Raffle isn't open", async function () {
      await raffle.enterRaffle({ value: RAFFLE_ENTRANCE_FEE });
      await network.provider.send("evm_increaseTime", [RAFFLE_INTERVAL + 1]);
      await network.provider.send("evm_mine", []);

      await raffle.performUpkeep(calldataArg);
      const raffleState = await raffle.getRaffleState();
      const { upkeepNeeded } = await raffle.checkUpkeep.staticCall(calldataArg);
      assert(raffleState.toString() === "1");
      assert(!upkeepNeeded);
    });

    it("Returns false if enough time hasn't passed", async function () {
      await raffle.enterRaffle({ value: RAFFLE_ENTRANCE_FEE });

      // progress time by a few seconds less than the interval
      await network.provider.send("evm_increaseTime", [RAFFLE_INTERVAL - 3]);
      await network.provider.send("evm_mine", []);

      const { upkeepNeeded } = await raffle.checkUpkeep.staticCall(calldataArg);
      assert(!upkeepNeeded);
    });

    it("Returns true if enough time has passed, has players, eth, and is open", async function () {
      await raffle.enterRaffle({ value: RAFFLE_ENTRANCE_FEE });
      await raffle.connect(player1).enterRaffle({ value: RAFFLE_ENTRANCE_FEE });

      await network.provider.send("evm_increaseTime", [RAFFLE_INTERVAL + 1]);
      await network.provider.send("evm_mine", []);

      const raffleState = await raffle.getRaffleState();
      const { upkeepNeeded } = await raffle.checkUpkeep.staticCall(calldataArg);

      assert(raffleState.toString() === "0");
      assert(upkeepNeeded);
    });
  });

  describe("performUpkeep", function () {
    it("it can only run if checkUpkeep is true", async function () {
      await raffle.enterRaffle({ value: RAFFLE_ENTRANCE_FEE });

      // increase time + fund contract (already done) so checkUpkeep returns true
      await network.provider.send("evm_increaseTime", [RAFFLE_INTERVAL + 1]);
      await network.provider.send("evm_mine", []);

      const tx = await raffle.performUpkeep(calldataArg);
      assert(tx);
    });

    it("reverts when checkUpkeep is false", async function () {
      await expect(
        raffle.performUpkeep(calldataArg)
      ).to.be.revertedWithCustomError(raffle, "Raffle__UpkeepNotNeeded");
    });

    it("updates the raffle state, emits an event, calls the vrf coordinator", async function () {
      await raffle.enterRaffle({ value: RAFFLE_ENTRANCE_FEE });

      await network.provider.send("evm_increaseTime", [RAFFLE_INTERVAL + 1]);
      await network.provider.send("evm_mine", []);

      const tx = await raffle.performUpkeep(calldataArg);
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

  describe("fulfillRandomWords", function () {
    // before each have our deployer enter the lottery
    // and increase the time so we can performUpkeep
    beforeEach(async function () {
      await raffle.enterRaffle({ value: RAFFLE_ENTRANCE_FEE });

      await network.provider.send("evm_increaseTime", [RAFFLE_INTERVAL + 1]);
      await network.provider.send("evm_mine", []);
    });

    it("can only be called after performUpkeep", async function () {
      // we haven't even called performUpkeep, which calls this fulfillRandomWords
      // function, so requestId if 0, is invalid, at the moment
      await expect(
        vrfCoordinatorV2_5Mock.fulfillRandomWords(0, raffleAddress)
      ).to.be.revertedWithCustomError(vrfCoordinatorV2_5Mock, "InvalidRequest");
      // 3 as requestId is also invalid
      await expect(
        vrfCoordinatorV2_5Mock.fulfillRandomWords(3, raffleAddress)
      ).to.be.revertedWithCustomError(vrfCoordinatorV2_5Mock, "InvalidRequest");
    });

    it("picks a winner, resets the lottery, and sends money", async function () {
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
      const startingTimeStamp = await raffle.getLatestTimestamp();

      // we want to call performUpkeep (acting like a Chainlink Keeper)
      // it then calls fulfillRandomWords, acting as a Chainlink VRF
      // We need to wait for fulfillRandomWords to be called by the VRF/us
      // to be honest, since our hardhat node is fast, we don't need to wait
      // for it at all, but it's a good practice to wait as we have to wait
      // if we decide to do this on a testnet later
      await new Promise<string>(async (resolve, reject) => {
        // Event listener for WinnerPicked
        raffle.once(raffle.filters.WinnerPicked, async function () {
          // we reach here if we found the event
          // console.log("WinnerPicked event emitted");
          try {
            const recentWinner = await raffle.getRecentWinner();
            const raffleState = await raffle.getRaffleState();
            const endingTimeStamp = await raffle.getLatestTimestamp();
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

            // we got everything, finally resolve
            resolve("Winner picked successfully");
            // console.log("Winner picked successfully");
          } catch (error) {
            // if the event is not emiited or takes too long, we throw an error
            reject(error);
          }
        });

        try {
          // console.log("Searching for RequestedRaffleWinner event!");
          // Below we performUpkeep, which returns an event
          // with our requestId
          const tx = await raffle.performUpkeep(calldataArg);
          const txReceipt = await tx.wait(1);
          const event = txReceipt!.logs.find(
            (eachLog) =>
              eachLog.address === raffleAddress &&
              (eachLog as EventLog).eventName === "RequestedRaffleWinner"
          ) as EventLog;

          if (!event) {
            throw new Error("RequestedRaffleWinner event not found!");
          }

          // console.log("Calling fulfillRandomWords...");

          // we feed the requestId to fulfillRandomWords
          // which emits the WinnerPicked event, once successful
          const fulfiling = await vrfCoordinatorV2_5Mock.fulfillRandomWords(
            event.args[0],
            raffleAddress
          );
          await fulfiling.wait(1);
          // once WinnerPicked event is fired, we go back to the
          // event listener few lines above ^^
          // console.log("Fulfilled random words!");
        } catch (error) {
          reject(error);
        }
      });
    });
  });
});
