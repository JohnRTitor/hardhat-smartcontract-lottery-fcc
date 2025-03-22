// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;
/**
 * @title Raffle Contract
 * @author Masum Reza, originally by Patrick Collins in FCC course
 * @notice This contract implements a decentralized lottery system
 * @dev This contract uses Chainlink Oracle for verifiably random number generation
 * and Chainlink Keepers for automated execution
 */

/**
 * @notice Error thrown when a user tries to enter the raffle with insufficient ETH
 */
error Raffle__NotEnoughETHEntered();

/**
 * @title Raffle Contract
 * @notice Implements a decentralized lottery where users can enter by paying an entrance fee
 * and a winner is selected randomly at specified intervals
 */
contract Raffle {
    /* State variables */
    uint256 private immutable i_entraceFee;
    address payable[] private s_players;

    /* Events */
    // events can't be accessed by smart contracts
    // events use log data structure to store log
    // this is way cheaper than storing in a storage variable
    event RaffleEnter(address indexed player);

    /**
     * @notice Constructor sets the entrance fee for the raffle
     * @param entranceFee The amount of ETH required to enter the raffle
     */
    constructor(uint256 entranceFee) {
        i_entraceFee = entranceFee;
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
    /*
    function pickRandomWinner() {

    }
    */

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
