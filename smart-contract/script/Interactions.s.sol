// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import {Script, console} from "forge-std/Script.sol";
import {Decide} from "../src/Decide.sol";
import {DevOpsTools} from "foundry-devops/src/DevOpsTools.sol";

contract Upkeep is Script {
    function checkUpkeep(address mostRecentlyDeployed) public {
        vm.startBroadcast();
        (bool upkeepNeeded, bytes memory performData ) = Decide(mostRecentlyDeployed).checkUpkeep();
        if (upkeepNeeded) {
            console.log("Upkeep True: ", upkeepNeeded);
            Decide(mostRecentlyDeployed).performUpkeep(performData);
        }
        vm.stopBroadcast();

        console.log("Upkeep Needed: ", upkeepNeeded);
    }

    function run() external {
        address mostRecentlyDeployed = DevOpsTools.get_most_recent_deployment("Decide", block.chainid);
        checkUpkeep(mostRecentlyDeployed);
    }
}