// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.9;

contract MockOwnable {
    address public owner;

    constructor() {
        owner = msg.sender;
    }
}
