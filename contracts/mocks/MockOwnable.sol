// SPDX-License-Identifier: GPLv3
pragma solidity ^0.8.9;

contract MockOwnable {
    address public owner;

    constructor() {
        owner = msg.sender;
    }
}
