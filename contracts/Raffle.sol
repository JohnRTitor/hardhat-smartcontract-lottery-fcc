/**
 * @title Raffle Contract
 * @author Masum Reza, originally by Patrick Collins in FCC course
 * @notice This contract implements a decentralized lottery system
 * @dev This contract uses Chainlink Oracle for verifiably random number generation
 * and Chainlink Keepers for automated execution
 */

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "@chainlink/contracts/src/v0.8/vrf/VRFConsumerBaseV2.sol";
import "@chainlink/contracts/src/v0.8/vrf/interfaces/VRFCoordinatorV2Interface.sol";

/**
 * @notice Error thrown when a user tries to enter the raffle with insufficient ETH
 */
error Raffle__NotEnoughETHEntered();

/**
 * @title Raffle Contract
 * @notice Implements a decentralized lottery where users can enter by paying an entrance fee
 * and a winner is selected randomly at specified intervals
 */
contract Raffle is VRFConsumerBaseV2 {
    /* State variables */
    uint256 private immutable i_entraceFee;
    address payable[] private s_players;
    /**
     * @dev Interface for interacting with the Chainlink VRF Coordinator
     */
    VRFCoordinatorV2Interface private immutable i_vrfCoordinator;
    /**
     * @dev Determines the maximum gas price willing to be paid for a Chainlink VRF request
     */
    bytes32 private immutable i_gasLane;
    /**
     * @dev This ID links the contract to a funded subscription in Chainlink VRF
     * to pay for random number generation requests
     */
    uint64 private immutable i_subscriptionId;
    /**
     * @notice The gas limit for the callback function when fulfilling the VRF request
     * @dev Determines the maximum gas allowed for `fulfillRandomWords` to execute
     * and process the random number
     */
    uint32 private immutable i_callbackGasLimit;

    /**
     * @dev number of confirmations required for the request to be considered valid
     */
    uint16 private constant REQUEST_CONFIRMATIONS = 3;
    /**
     * @dev Determines how many random numbers will be returned in a single VRF response
     */
    uint32 private constant NUM_WORDS = 1;

    /* Events */
    // events can't be accessed by smart contracts
    // events use log data structure to store log
    // this is way cheaper than storing in a storage variable
    event RaffleEnter(address indexed player);
    event RequestedRaffleWinner(uint256 indexed requestId);

    /**
     * @notice Constructor sets the entrance fee for the raffle
     * @param entranceFee The amount of ETH required to enter the raffle
     */
    constructor(
        address vrfCoordinatorAddress,
        uint256 entranceFee,
        bytes32 gasLane,
        uint64 subscriptionId,
        uint32 callbackGasLimit
    ) VRFConsumerBaseV2(vrfCoordinatorAddress) {
        i_vrfCoordinator = VRFCoordinatorV2Interface(vrfCoordinatorAddress);
        i_entraceFee = entranceFee;
        i_gasLane = gasLane;
        i_subscriptionId = subscriptionId;
        i_callbackGasLimit = callbackGasLimit;
    }

    /**
     * @notice Function for users to enter the raffle
     * @dev Users must send at least the entrance fee to participate
     * Reverts if insufficient ETH is sent
     */
    function enterRaffle() public payable {
        if (msg.value < i_entraceFee) {
            revert Raffle__NotEnoughETHEntered();
        }
        s_players.push(payable(msg.sender));
        emit RaffleEnter(msg.sender);
    }

    /**
     * @notice Function to select a random winner from the participants
     * @dev This function is not implemented yet
     * Will use Chainlink VRF for verifiable randomness
     */
    function requestRandomWinner() external {
        // Request the random number
        // Once we get it, do something with it
        // 2 transaction process

        uint256 requestId = i_vrfCoordinator.requestRandomWords(
            i_gasLane,
            i_subscriptionId,
            REQUEST_CONFIRMATIONS,
            i_callbackGasLimit,
            NUM_WORDS
        );

        emit RequestedRaffleWinner(requestId);
    }

    function fulfillRandomWords(
        uint256 requestId,
        uint256[] memory randomWords
    ) internal override {}

    /* View / Pure functions*/
    /**
     * @notice Returns the entrance fee for the raffle
     * @return uint256 The entrance fee in wei
     */
    function getEntranceFee() public view returns (uint256) {
        return i_entraceFee;
    }

    /**
     * @notice Returns the address of a player at the specified index
     * @param index The position in the players array
     * @return address The player's address
     */
    function getPlayer(uint256 index) public view returns (address) {
        return s_players[index];
    }
}
