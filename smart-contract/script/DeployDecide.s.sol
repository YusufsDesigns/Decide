// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { Script } from "forge-std/Script.sol";
import { Decide } from "../src/Decide.sol";

contract DeployDecide is Script {
    function run() public {
        deploy();
    }

    function deploy() public returns (Decide) {
        vm.startBroadcast();
        Decide decide = new Decide();
        vm.stopBroadcast();

        return decide;
    }
}