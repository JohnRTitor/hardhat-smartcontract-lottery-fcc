/**
 * @title Raffle Contract
 * @author Masum Reza, originally by Patrick Collins in FCC course
 * @notice This contract implements a decentralized lottery system where users can participate
 * by paying an entrance fee, and a winner is randomly selected at regular intervals.
 * @dev Utilizes Chainlink VRF V2 for verifiable randomness and Chainlink Keepers for automated execution.
 */

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import {VRFConsumerBaseV2Plus} from "@chainlink/contracts/src/v0.8/vrf/dev/VRFConsumerBaseV2Plus.sol";
import {VRFV2PlusClient} from "@chainlink/contracts/src/v0.8/vrf/dev/libraries/VRFV2PlusClient.sol";
import {KeeperCompatibleInterface} from "@chainlink/contracts/src/v0.8/automation/interfaces/KeeperCompatibleInterface.sol";

/** @dev Error messages for revert statements */
error Raffle__NotEnoughETHEntered();
error Raffle__TransferFailed();
error Raffle__NotOpen();
error Raffle__UpkeepNotNeeded(
    uint256 currentBalance,
    uint256 numPlayers,
    uint256 raffleState
);

contract Raffle is VRFConsumerBaseV2Plus, KeeperCompatibleInterface {
    /// @notice Enum representing the state of the raffle
    enum RaffleState {
        OPEN,
        CALCULATING
    } // 0 = OPEN, 1 = CALCULATING

    /* State Variables */
    uint256 private immutable i_entraceFee;
    address payable[] private s_players;

    /**
     * @dev Determines the maximum gas price willing to be paid for a Chainlink VRF request
     * https://docs.chain.link/docs/vrf/v2-5/supported-networks
     */
    bytes32 private immutable i_gasLane;

    /**
     * @dev This ID links the contract to a funded subscription in Chainlink VRF
     * to pay for random number generation requests
     */
    uint256 private immutable i_subscriptionId;

    /**
     * @dev Determines the maximum gas allowed for fulfillRandomWords to execute
     * and process the random number
     */
    uint32 private immutable i_callbackGasLimit;

    /// @dev number of block confirmations required for the request to be considered valid
    uint16 private constant REQUEST_CONFIRMATIONS = 3;

    /**
     * @dev Determines how many random numbers will be returned in a single VRF response
     * We only need 1 to use a modulo hash function to decide the winner
     */
    uint32 private constant NUM_WORDS = 1;

    /* Lottery Variables */
    address private s_recentWinner;
    RaffleState private s_raffleState;
    uint256 private s_lastTimestamp;
    /// @notice Intervals at which a winner can be picked
    uint256 private immutable i_interval;

    /* Events */
    event RaffleEnter(address indexed player);
    event RequestedRaffleWinner(uint256 indexed requestId);
    event WinnerPicked(address indexed winner);

    /**
     * @notice Constructor initializes the contract with necessary Chainlink parameters
     * @param vrfCoordinatorAddress Address of the Chainlink VRF Coordinator
     * @param entranceFee The ETH amount required to enter the raffle
     * @param gasLane The gas lane key hash for VRF request
     * @param subscriptionId Chainlink VRF subscription ID
     * @param callbackGasLimit Gas limit for fulfilling VRF request
     * @param interval Time interval for automated execution
     */
    constructor(
        address vrfCoordinatorAddress,
        uint256 entranceFee,
        bytes32 gasLane,
        uint256 subscriptionId,
        uint32 callbackGasLimit,
        uint256 interval
    ) VRFConsumerBaseV2Plus(vrfCoordinatorAddress) {
        i_entraceFee = entranceFee;
        i_gasLane = gasLane;
        i_subscriptionId = subscriptionId;
        i_callbackGasLimit = callbackGasLimit;
        s_raffleState = RaffleState.OPEN;
        // Set it to the current timestamp
        s_lastTimestamp = block.timestamp;
        i_interval = interval;
    }

    /**
     * @notice Allows users to enter the raffle by sending ETH
     * @dev Reverts if the raffle is closed or insufficient ETH is sent
     * Emits an event when a player successfully enters the raffle
     */
    function enterRaffle() public payable {
        if (s_raffleState != RaffleState.OPEN) revert Raffle__NotOpen();
        if (msg.value < i_entraceFee) revert Raffle__NotEnoughETHEntered();
        s_players.push(payable(msg.sender));
        emit RaffleEnter(msg.sender);
    }

    /**
     * @notice Checks if upkeep is needed for Chainlink Keepers
     * @return upkeepNeeded Boolean indicating whether upkeep should be performed
     * @dev This is the function that the Chainlink automation nodes call
     * they look for the upkeepNeeded to return true
     * if it returns true, the Chainlink automation nodes will call performUpkeep
     * The following should be true in order to return true:
     * 1. The raffle is open
     * 2. The upkeep interval has passed
     * 3. The contract has enough ETH to pay the prize and have at least one player
     */
    function checkUpkeep(
        bytes memory /* checkData */
    )
        public
        view
        override
        returns (bool upkeepNeeded, bytes memory /* performData */)
    {
        bool isOpen = s_raffleState == RaffleState.OPEN;
        bool hasTimePassed = (block.timestamp - s_lastTimestamp) > i_interval;
        bool hasPlayers = s_players.length >= 1;
        bool hasBalance = address(this).balance > 0;
        upkeepNeeded = isOpen && hasTimePassed && hasPlayers && hasBalance;
    }

    /**
     * @notice Requests a random winner selection when upkeep conditions are met
     * @dev Calls Chainlink VRF to generate a random number
     * this is actually the requestRandomWords function but named performUpkeep
     * so that it can be called by the Chainlink Keepers
     */
    function performUpkeep(bytes calldata /*performData*/) external override {
        (bool upkeepNeeded, ) = checkUpkeep("");
        if (!upkeepNeeded)
            revert Raffle__UpkeepNotNeeded(
                address(this).balance,
                s_players.length,
                uint256(s_raffleState)
            );

        // Close the lottery
        s_raffleState = RaffleState.CALCULATING;
        uint256 requestId = s_vrfCoordinator.requestRandomWords(
            VRFV2PlusClient.RandomWordsRequest({
                keyHash: i_gasLane,
                subId: i_subscriptionId,
                requestConfirmations: REQUEST_CONFIRMATIONS,
                callbackGasLimit: i_callbackGasLimit,
                numWords: NUM_WORDS,
                extraArgs: VRFV2PlusClient._argsToBytes(
                    VRFV2PlusClient.ExtraArgsV1({nativePayment: false})
                )
            })
        );
        emit RequestedRaffleWinner(requestId);
    }

    /**
     * @notice Fulfills the randomness request and selects a winner
     * @param randomWords Array of random numbers from Chainlink VRF
     */
    function fulfillRandomWords(
        uint256 /* requestId */,
        uint256[] calldata randomWords
    ) internal override {
        uint256 indexOfWinner = randomWords[0] % s_players.length;
        address payable recentWinner = s_players[indexOfWinner];
        s_recentWinner = recentWinner;

        (bool success, ) = recentWinner.call{value: address(this).balance}("");
        if (!success) revert Raffle__TransferFailed();

        s_players = new address payable[](0);
        s_lastTimestamp = block.timestamp;
        // Reopen the lottery
        s_raffleState = RaffleState.OPEN;
        emit WinnerPicked(recentWinner);
    }

    /* View Functions */

    /// @return uint256 The entrance fee in wei
    function getEntranceFee() public view returns (uint256) {
        return i_entraceFee;
    }

    /// @param index The index of a player in the raffle
    /// @return address The player's address
    function getPlayer(uint256 index) public view returns (address) {
        return s_players[index];
    }

    /// @return address The address of the most recent raffle winner
    function getRecentWinner() public view returns (address) {
        return s_recentWinner;
    }

    /// @return RaffleState The current state of the raffle
    function getRaffleState() public view returns (RaffleState) {
        return s_raffleState;
    }

    /// @return uint256 The number of random words requested from Chainlink VRF
    function getNumWords() public pure returns (uint256) {
        return NUM_WORDS;
    }

    /// @return uint256 The number of players in the raffle
    function getNumberOfPlayers() public view returns (uint256) {
        return s_players.length;
    }

    /// @return uint256 The timestamp of the last raffle
    function getLatestTimestamp() public view returns (uint256) {
        return s_lastTimestamp;
    }

    /// @return uint256 The number of confirmations required for Chainlink VRF
    function getRequestConfirmations() public pure returns (uint256) {
        return REQUEST_CONFIRMATIONS;
    }

    /// @return uint256 The interval between raffles, or intervals betweeen selection of winner
    function getInterval() public view returns (uint256) {
        return i_interval;
    }
}
