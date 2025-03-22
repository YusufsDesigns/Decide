// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test, console2} from "forge-std/Test";
import {Decide} from "../../src/Decide.sol";
import {DeployDecide} from "../../script/DeployDecide.s.sol";

contract DecideTest is Test {
    Decide decideContract;

    Decide.ContestState contestState;

    address USER = makeAddr("USER");
    address USER2 = makeAddr("USER2");
    address USER3 = makeAddr("USER3");
    address USER4 = makeAddr("USER4");
    address USER5 = makeAddr("USER5");
    address USER6 = makeAddr("USER6");
    address USER7 = makeAddr("USER7");
    address USER8 = makeAddr("USER8");
    uint256 USER_BALANCE = 100 ether;

    event ContestCreated(string indexed name);
    event ContestJoined(uint256 indexed contestId, address indexed user, string indexed name);

    function setUp() public {
        DeployDecide deployer = new DeployDecide();
        decideContract = deployer.deploy();

        vm.deal(USER, USER_BALANCE);
        vm.deal(USER2, USER_BALANCE);
        vm.deal(USER3, USER_BALANCE);
        vm.deal(USER4, USER_BALANCE);
        vm.deal(USER5, USER_BALANCE);
        vm.deal(USER6, USER_BALANCE);
        vm.deal(USER7, USER_BALANCE);
        vm.deal(USER8, USER_BALANCE);
    }

    /*//////////////////////////////////////////////////////////////
                            CREATE CONTEST TESTS
    //////////////////////////////////////////////////////////////*/
    function testCreateContest() public {
        // act
        decideContract.createContest{value: 0.05 ether}("Contest 1", "Yusuf", "Description", 100, 100, 100);

        Decide.Contest[] memory contests = decideContract.getContestsBatch(0, 2);

        // assert
        assertEq(contests[0].name, "Contest 1");
        assertEq(contests[0].creator, "Yusuf");
        assertEq(contests[0].description, "Description");
        assertEq(contests[0].entryFee, 100);
        assertEq(contests[0].entryTimeDeadline, block.timestamp + 100);
        assertEq(contests[0].voteTimeDeadline, contests[0].entryTimeDeadline + 100);
        assertEq(uint256(contests[0].contestState), uint256(Decide.ContestState.OPEN));
        assertEq(contests[0].stakerRewardPool, 0);
    }

    function testCreateContestEmitsEvent() public {
        // act
        vm.expectEmit(true, false, false, false);
        emit ContestCreated("Contest 1");
        decideContract.createContest{value: 0.05 ether}("Contest 1", "Description", "Yusuf", 100, 100, 100);
    }

    function testCreateContestIncreasesUserStakedAmount() public {
        // act
        vm.startPrank(USER);
        decideContract.createContest{value: 0.05 ether}("Contest 1", "Description", "Yusuf", 100, 100, 100);
        vm.stopPrank();

        Decide.Contest[] memory contests = decideContract.getContestsBatch(0, 2);
        uint256 contestId = contests[0].id;

        uint256 stakedAmount = decideContract.getUserStakedAmount(USER, contestId);

        // assert
        assertEq(stakedAmount, 0.05 ether);
    }

    function testCreateContestIncreasesTotalStakedAmount() public {
        // act
        vm.startPrank(USER);
        decideContract.createContest{value: 0.05 ether}("Contest 1", "Description", "Yusuf", 100, 100, 100);
        vm.stopPrank();

        Decide.Contest[] memory contests = decideContract.getContestsBatch(0, 2);
        uint256 contestId = contests[0].id;

        uint256 totalStakedAmount = decideContract.getTotalContestStakedAmount(contestId);

        // assert
        assertEq(totalStakedAmount, 0.05 ether);
    }

    /*//////////////////////////////////////////////////////////////
                            JOIN ENTRY TESTS
    //////////////////////////////////////////////////////////////*/
    function testUserCanJoinWhenContestIsOpen() public {
        // arrange
        decideContract.createContest{value: 0.05 ether}("Contest 1", "Description", "Yusuf", 100, 100, 100);
        Decide.Contest[] memory contests = decideContract.getContestsBatch(0, 2);

        // act
        vm.startPrank(USER);
        decideContract.joinContest{value: 100}(contests[0].id, "Entry 1", "Yusuf", "");
        vm.stopPrank();

        Decide.Contest[] memory contestsAfter = decideContract.getContestsBatch(0, 2);

        // assert
        assertEq(contestsAfter[0].entryIds.length, 1);
    }

    function testJoinContestRevertsWhenEntryTimePassed() public {
        // arrange
        decideContract.createContest{value: 0.05 ether}("Contest 1", "Description", "Yusuf", 100, 100, 100);
        Decide.Contest[] memory contests = decideContract.getContestsBatch(0, 2);

        vm.warp(contests[0].entryTimeDeadline + 1);
        vm.roll(1);

        // act
        vm.expectRevert(Decide.Decide__EntryTimePassed.selector);
        vm.startPrank(USER);
        decideContract.joinContest(0, "Entry 1", "Yusuf", "");
    }

    function testJoinContestRevertsIfContestStateIsNotOpen() public {
        // arrange
        decideContract.createContest{value: 0.05 ether}("Contest 1", "Description", "Yusuf", 100, 100, 100);
        Decide.Contest[] memory contests = decideContract.getContestsBatch(0, 2);
        decideContract.changeContestStateManually(contests[0].id, 1);

        // act
        vm.expectRevert(Decide.Decide__ContestNotOpen.selector);
        vm.startPrank(USER);
        decideContract.joinContest(contests[0].id, "Entry 1", "Yusuf", "");
    }

    function testRevertsIfUserHasJoinedContest() public {
        // arrange
        decideContract.createContest{value: 0.05 ether}("Contest 1", "Description", "Yusuf", 100, 100, 100);
        Decide.Contest[] memory contests = decideContract.getContestsBatch(0, 2);

        vm.startPrank(USER);
        decideContract.joinContest{value: 100}(contests[0].id, "Entry 1", "Yusuf", "");
        vm.stopPrank();

        // act
        vm.expectRevert(Decide.Decide_UserHasJoinedContest.selector);
        vm.prank(USER);
        decideContract.joinContest(contests[0].id, "Entry 1", "Yusuf", "");
    }

    function testEntryFeeIsTransferredToContract() public {
        // arrange
        decideContract.createContest{value: 0.05 ether}("Contest 1", "Description", "Yusuf", 100, 100, 100);
        Decide.Contest[] memory contests = decideContract.getContestsBatch(0, 2);
        uint256 contractBalanceBefore = address(decideContract).balance;

        // act
        vm.startPrank(USER);
        decideContract.joinContest{value: 100}(contests[0].id, "Entry 1", "Yusuf", "");
        vm.stopPrank();

        uint256 contractBalanceAfter = address(decideContract).balance;

        // assert
        assertEq(contractBalanceAfter, contractBalanceBefore + contests[0].entryFee);
    }

    function testJoinContestEmitsEvent() public {
        // arrange
        decideContract.createContest{value: 0.05 ether}("Contest 1", "Description", "Yusuf", 100, 100, 100);
        Decide.Contest[] memory contests = decideContract.getContestsBatch(0, 2);

        // act
        vm.startPrank(USER);
        vm.expectEmit(true, true, true, false);
        emit ContestJoined(contests[0].id, USER, "Entry 1");
        decideContract.joinContest{value: 100}(contests[0].id, "Entry 1", "Yusuf", "");
        vm.stopPrank();
    }

    function testHasJoinedContestUpdatesAfterJoiningAContest() public {
        // arrange
        decideContract.createContest{value: 0.05 ether}("Contest 1", "Description", "Yusuf", 100, 100, 100);
        Decide.Contest[] memory contests = decideContract.getContestsBatch(0, 2);

        // act
        vm.startPrank(USER);
        decideContract.joinContest{value: 100}(contests[0].id, "Entry 1", "Yusuf", "");
        vm.stopPrank();

        bool hasJoined = decideContract.getHasUserJoinedContest(contests[0].id, USER);

        // assert
        assertEq(hasJoined, true);
    }

    function testMultipleUsersCanJoinTheSameContest() public {
        // arrange
        decideContract.createContest{value: 0.05 ether}("Contest 1", "Description", "Yusuf", 100, 100, 100);
        Decide.Contest[] memory contests = decideContract.getContestsBatch(0, 2);

        // act
        vm.startPrank(USER);
        decideContract.joinContest{value: 100}(contests[0].id, "Entry 1", "Yusuf", "");
        vm.stopPrank();

        vm.startPrank(USER2);
        decideContract.joinContest{value: 100}(contests[0].id, "Entry 2", "Lawal", "");
        vm.stopPrank();

        vm.startPrank(USER3);
        decideContract.joinContest{value: 100}(contests[0].id, "Entry 3", "Ola", "");
        vm.stopPrank();

        Decide.Contest[] memory contestsAfter = decideContract.getContestsBatch(0, 2);

        // assert
        assertEq(contestsAfter[0].entryIds.length, 3);
    }

    function testAUserCanJoinDifferentContests() public {
        // arrange
        decideContract.createContest{value: 0.05 ether}("Contest 1", "Description", "Yusuf", 100, 100, 100);
        decideContract.createContest{value: 0.05 ether}("Contest 2", "Description", "Lawal", 200, 200, 200);

        Decide.Contest[] memory contests = decideContract.getContestsBatch(0, 10);

        // act
        vm.startPrank(USER);
        decideContract.joinContest{value: 100}(contests[0].id, "Entry 1", "Yusuf", "");
        vm.stopPrank();

        vm.startPrank(USER);
        decideContract.joinContest{value: 200}(contests[1].id, "Entry 2", "Lawal", "");
        vm.stopPrank();

        Decide.Contest[] memory contestsAfter = decideContract.getContestsBatch(0, 10);
        console2.log(contestsAfter[0].entryIds.length);

        // assert
        assertEq(contestsAfter[0].entryIds.length, 1);
        assertEq(contestsAfter[1].entryIds.length, 1);
    }

    /*//////////////////////////////////////////////////////////////
                            VOTE TESTS
    //////////////////////////////////////////////////////////////*/
    modifier createContestAndJoin() {
        // arrange
        decideContract.createContest{value: 0.05 ether}("Contest 1", "Description", "Yusuf", 1 ether, 100, 100);
        Decide.Contest[] memory contests = decideContract.getContestsBatch(0, 2);

        vm.startPrank(USER);
        decideContract.joinContest{value: 1 ether}(contests[0].id, "Entry 1", "Yusuf", "");
        vm.stopPrank();

        _;
    }

    modifier createContestAndAddEntries() {
        // arrange
        decideContract.createContest{value: 0.05 ether}("Contest 1", "Description", "Yusuf", 100, 100, 100);
        Decide.Contest[] memory contests = decideContract.getContestsBatch(0, 2);

        vm.startPrank(USER);
        decideContract.joinContest{value: 100}(contests[0].id, "Entry 1", "Yusuf", "");
        vm.stopPrank();

        vm.startPrank(USER2);
        decideContract.joinContest{value: 100}(contests[0].id, "Entry 2", "Yusuf", "");
        vm.stopPrank();

        vm.startPrank(USER3);
        decideContract.joinContest{value: 100}(contests[0].id, "Entry 3", "Yusuf", "");
        vm.stopPrank();

        vm.startPrank(USER4);
        decideContract.joinContest{value: 100}(contests[0].id, "Entry 4", "Yusuf", "");
        vm.stopPrank();

        _;
    }

    function testUserCanVoteWhenInVotingPhase() public createContestAndJoin {
        Decide.Contest[] memory contests = decideContract.getContestsBatch(0, 2);
        decideContract.changeContestStateManually(contests[0].id, 1);
        // act
        vm.startPrank(USER2);
        decideContract.voteForEntry{value: 0.005 ether}(contests[0].id, contests[0].entryIds[0]);
        vm.stopPrank();

        // Decide.Contest[] memory contestsAfter = decideContract.getContestsBatch(0, 2);

        Decide.Entry memory entry = decideContract.getEntry(contests[0].id, contests[0].entryIds[0]);

        // assert
        assertEq(entry.votes, 2);
    }

    function testRevertsVoteIfContestIdIsInvalid() public createContestAndJoin {
        Decide.Contest[] memory contests = decideContract.getContestsBatch(0, 2);
        decideContract.changeContestStateManually(contests[0].id, 1);
        // act
        vm.startPrank(USER);
        vm.expectRevert(Decide.Decide__InvalidContestId.selector);
        decideContract.voteForEntry{value: 0.005 ether}(1, 0);
        vm.stopPrank();
    }

    function testRevertsVoteIfEntryIdIsInvalid() public createContestAndJoin {
        Decide.Contest[] memory contests = decideContract.getContestsBatch(0, 2);
        decideContract.changeContestStateManually(contests[0].id, 1);
        // act
        vm.startPrank(USER);
        vm.expectRevert(Decide.Decide__InvalidEntryId.selector);
        decideContract.voteForEntry{value: 0.005 ether}(contests[0].id, 1);
        vm.stopPrank();
    }

    function testRevertsVoteIfNotInVotingPhase() public createContestAndJoin {
        Decide.Contest[] memory contests = decideContract.getContestsBatch(0, 2);
        // act
        vm.startPrank(USER);
        vm.expectRevert(Decide.Decide__NotInVotingPhase.selector);
        decideContract.voteForEntry{value: 0.005 ether}(contests[0].id, contests[0].entryIds[0]);
        vm.stopPrank();
    }

    function testRevertsIfUserHasAlreadyVoted() public createContestAndJoin {
        Decide.Contest[] memory contests = decideContract.getContestsBatch(0, 2);
        // arrange
        decideContract.changeContestStateManually(contests[0].id, 1);
        vm.startPrank(USER2);
        decideContract.voteForEntry{value: 0.005 ether}(contests[0].id, contests[0].entryIds[0]);
        vm.stopPrank();

        // act
        vm.startPrank(USER2);
        vm.expectRevert(Decide.Decide_UserHasVotedAlready.selector);
        decideContract.voteForEntry{value: 0.005 ether}(contests[0].id, contests[0].entryIds[0]);
        vm.stopPrank();
    }

    function testRevertsIfStakeAmountIsInvalid() public createContestAndJoin {
        Decide.Contest[] memory contests = decideContract.getContestsBatch(0, 2);
        decideContract.changeContestStateManually(contests[0].id, 1);
        // act
        vm.startPrank(USER2);
        vm.expectRevert(Decide.Decide__InvalidStakeAmount.selector);
        decideContract.voteForEntry{value: 0.001 ether}(contests[0].id, contests[0].entryIds[0]);
        vm.stopPrank();
    }

    function testRevertsIfVotingTimeHasEnded() public createContestAndJoin {
        Decide.Contest[] memory contests = decideContract.getContestsBatch(0, 2);
        // arrange
        decideContract.changeContestStateManually(contests[0].id, 1);
        Decide.Contest[] memory contestsAfter = decideContract.getContestsBatch(0, 10);
        vm.warp(contestsAfter[0].voteTimeDeadline + 1);
        vm.roll(1);

        // act
        vm.startPrank(USER);
        vm.expectRevert(Decide.Decide__VotingClosed.selector);
        decideContract.voteForEntry{value: 0.005 ether}(contests[0].id, contests[0].entryIds[0]);
        vm.stopPrank();
    }

    function testUserStakeAmountIncreasesAfterVoting() public createContestAndJoin {
        // arrange
        Decide.Contest[] memory contests = decideContract.getContestsBatch(0, 2);
        decideContract.changeContestStateManually(contests[0].id, 1);

        // act
        vm.startPrank(USER2);
        decideContract.voteForEntry{value: 0.005 ether}(contests[0].id, contests[0].entryIds[0]);
        vm.stopPrank();

        uint256 contestId = contests[0].id;
        uint256 stakedAmount = decideContract.getUserStakedAmount(USER2, contestId);

        // assert
        assertEq(stakedAmount, 0.005 ether);
    }

    function testTotalStakeAmountIncreasesAfterVoting() public createContestAndJoin {
        // arrange
        Decide.Contest[] memory contests = decideContract.getContestsBatch(0, 2);
        decideContract.changeContestStateManually(contests[0].id, 1);

        // act
        vm.startPrank(USER2);
        decideContract.voteForEntry{value: 0.005 ether}(contests[0].id, contests[0].entryIds[0]);
        vm.stopPrank();

        uint256 contestId = contests[0].id;
        uint256 toatalStakedAmount = decideContract.getTotalContestStakedAmount(contestId);
        uint256 expectedTotal = 0.05 ether + 0.005 ether;

        // assert
        assertEq(toatalStakedAmount, expectedTotal);
    }

    function testHasVotedUpdatesAfterVoting() public createContestAndJoin {
        // arrange
        Decide.Contest[] memory contests = decideContract.getContestsBatch(0, 2);
        decideContract.changeContestStateManually(contests[0].id, 1);

        // act
        vm.startPrank(USER2);
        decideContract.voteForEntry{value: 0.005 ether}(contests[0].id, contests[0].entryIds[0]);
        vm.stopPrank();

        bool hasUserVoted = decideContract.getHasUserVoted(contests[0].id, USER2);

        // assert
        assertEq(hasUserVoted, true);
    }

    function testUsersCanVoteInMultipleContests() public createContestAndJoin {
        // arrange
        decideContract.createContest{value: 0.05 ether}("Contest 2", "Yusuf", "", 100, 1, 100);
        Decide.Contest[] memory contests = decideContract.getContestsBatch(0, 2);

        vm.startPrank(USER);
        decideContract.joinContest{value: 100}(contests[1].id, "Entry 1", "Yusuf", "");
        vm.stopPrank();

        Decide.Contest[] memory contestsAfter = decideContract.getContestsBatch(0, 2);

        decideContract.changeContestStateManually(contestsAfter[0].id, 1);
        decideContract.changeContestStateManually(contestsAfter[1].id, 1);
        // act
        vm.startPrank(USER3);
        decideContract.voteForEntry{value: 0.005 ether}(contestsAfter[0].id, contestsAfter[0].entryIds[0]);
        vm.stopPrank();

        vm.startPrank(USER3);
        decideContract.voteForEntry{value: 0.005 ether}(contestsAfter[1].id, contestsAfter[1].entryIds[0]);
        vm.stopPrank();

        Decide.Entry memory contestOneEntry = decideContract.getEntry(contestsAfter[0].id, contestsAfter[0].entryIds[0]);
        Decide.Entry memory contestTwoEntry = decideContract.getEntry(contestsAfter[1].id, contestsAfter[1].entryIds[0]);

        // assert
        assertEq(contestOneEntry.votes, 2);
        assertEq(contestTwoEntry.votes, 2);
    }

    function testMultipleUsersCanVoteForAnEntry() public createContestAndJoin {
        Decide.Contest[] memory contests = decideContract.getContestsBatch(0, 2);
        decideContract.changeContestStateManually(contests[0].id, 1);
        // act
        vm.startPrank(USER4);
        decideContract.voteForEntry{value: 0.005 ether}(contests[0].id, contests[0].entryIds[0]);
        vm.stopPrank();

        vm.startPrank(USER2);
        decideContract.voteForEntry{value: 0.005 ether}(contests[0].id, contests[0].entryIds[0]);
        vm.stopPrank();

        vm.startPrank(USER3);
        decideContract.voteForEntry{value: 0.005 ether}(contests[0].id, contests[0].entryIds[0]);
        vm.stopPrank();

        Decide.Entry memory entry = decideContract.getEntry(contests[0].id, contests[0].entryIds[0]);

        // assert
        assertEq(entry.votes, 4);
    }

    function testTotalStakeAmountIncreasesAfterMultipleVotes() public createContestAndJoin {
        Decide.Contest[] memory contests = decideContract.getContestsBatch(0, 2);
        decideContract.changeContestStateManually(contests[0].id, 1);
        // act
        vm.startPrank(USER2);
        decideContract.voteForEntry{value: 0.005 ether}(contests[0].id, contests[0].entryIds[0]);
        vm.stopPrank();

        vm.startPrank(USER3);
        decideContract.voteForEntry{value: 0.005 ether}(contests[0].id, contests[0].entryIds[0]);
        vm.stopPrank();

        vm.startPrank(USER4);
        decideContract.voteForEntry{value: 0.005 ether}(contests[0].id, contests[0].entryIds[0]);
        vm.stopPrank();

        uint256 contestId = contests[0].id;
        uint256 toatalStakedAmount = decideContract.getTotalContestStakedAmount(contestId);
        uint256 expectedTotal = 0.05 ether + (0.005 ether * 3);

        // assert
        assertEq(toatalStakedAmount, expectedTotal);
    }

    /*//////////////////////////////////////////////////////////////
                        CHECK UPKEEP TESTS
    //////////////////////////////////////////////////////////////*/
    // ✅ Test if checkUpkeep returns upkeepNeeded as true when the contest state is OPEN and the entry time has passed.
    function testCheckUpKeepReturnsTrueWhenContestStateIsOpenAndEntryTimeHasPassed() public {
        // arrange
        decideContract.createContest{value: 0.05 ether}("Contest 1", "Description", "Yusuf", 100, 100, 100);
        Decide.Contest[] memory contests = decideContract.getContestsBatch(0, 2);
        vm.warp(contests[0].entryTimeDeadline + 1);
        vm.roll(1);

        // act
        (bool upkeepNeeded,) = decideContract.checkUpkeep();

        // assert
        assert(upkeepNeeded);
    }

    // ✅ Test if checkUpkeep returns upkeepNeeded as true when the contest state is VOTING and the vote time has passed.
    function testCheckUpKeepReturnsTrueWhenContestStateIsVotingAndVoteTimeHasPassed() public {
        // arrange
        decideContract.createContest{value: 0.05 ether}("Contest 1", "Yusuf", "", 100, 1, 1);
        Decide.Contest[] memory contests = decideContract.getContestsBatch(0, 2);
        decideContract.changeContestStateManually(contests[0].id, 1);
        vm.warp(contests[0].voteTimeDeadline + 1);
        vm.roll(1);

        // act
        (bool upkeepNeeded,) = decideContract.checkUpkeep();

        // assert
        assert(upkeepNeeded);
    }

    // ✅ Test if checkUpkeep returns false when no contests need upkeep.
    function testCheckUpKeepReturnsFalseWhenNoContestsNeedUpkeep() public {
        // arrange
        decideContract.createContest{value: 0.05 ether}("Contest 1", "Description", "Yusuf", 100, 100, 100);

        // act
        (bool upkeepNeeded,) = decideContract.checkUpkeep();

        // assert
        assert(!upkeepNeeded);
    }

    // ✅ Test if checkUpkeep returns the correct contest ID for upkeep when it's needed.
    function testCheckUpKeepReturnsCorrectContestIdForUpkeep() public {
        // arrange
        decideContract.createContest{value: 0.05 ether}("Contest 1", "Description", "Yusuf", 100, 100, 100);
        decideContract.createContest{value: 0.05 ether}("Contest 2", "Description", "Yusuf", 100, 1, 100);
        decideContract.createContest{value: 0.05 ether}("Contest 3", "Description", "Yusuf", 100, 1, 100);

        Decide.Contest[] memory contests = decideContract.getContestsBatch(0, 10);
        vm.warp(contests[0].entryTimeDeadline + 1);
        vm.roll(1);

        // act
        (bool upkeepNeeded, bytes memory performData) = decideContract.checkUpkeep();
        uint256[] memory contestId = abi.decode(performData, (uint256[]));
        uint256 expectedContestId = contestId[0];

        // assert
        assert(upkeepNeeded);
        assertEq(expectedContestId, contests[0].id);
    }

    // ✅ Should return multiple contest IDs if multiple contests need upkeep
    function testCheckUpKeepReturnsMultipleContestIdsForUpkeep() public {
        // arrange
        decideContract.createContest{value: 0.05 ether}("Contest 1", "Description", "Yusuf", 100, 100, 100);
        decideContract.createContest{value: 0.05 ether}("Contest 2", "Description", "Yusuf", 100, 200, 100);
        decideContract.createContest{value: 0.05 ether}("Contest 3", "Description", "Yusuf", 100, 300, 100);

        // (, , , , , contests[0].entryTimeDeadline, , , , ) = decideContract.getContest(0);
        Decide.Contest[] memory contests = decideContract.getContestsBatch(0, 10);
        vm.warp(contests[1].entryTimeDeadline + 1);
        vm.roll(1);

        // vm.warp(contests[0].entryTimeDeadline + 1);
        // vm.roll(1);

        // act
        (bool upkeepNeeded, bytes memory performData) = decideContract.checkUpkeep();
        uint256[] memory contestIds = abi.decode(performData, (uint256[]));

        uint256 expectedContestOneId = contestIds[0];
        uint256 expectedContestTwoId = contestIds[1];

        // assert
        assert(upkeepNeeded);
        assertEq(contestIds.length, 2);
        assertEq(expectedContestOneId, contests[0].id);
        assertEq(expectedContestTwoId, contests[1].id);
    }

    /*//////////////////////////////////////////////////////////////
                        PERFORM UPKEEP TESTS
    //////////////////////////////////////////////////////////////*/
    // ✅ Should transition a contest from OPEN to VOTING when entry time has passed
    function testPerformUpkeepTransitionsContestFromOpenToVoting() public {
        // arrange
        decideContract.createContest{value: 0.05 ether}("Contest 1", "Description", "Yusuf", 100, 5, 100);
        Decide.Contest[] memory contests = decideContract.getContestsBatch(0, 10);
        vm.warp(contests[0].entryTimeDeadline + 1);
        vm.roll(1);

        uint256[] memory contestIds = new uint256[](1);
        contestIds[0] = contests[0].id;
        bytes memory performData = abi.encode(contestIds);

        // act
        decideContract.performUpkeep(performData);
        Decide.Contest[] memory contestsAfter = decideContract.getContestsBatch(0, 2);

        // assert
        assertEq(uint256(contestsAfter[0].contestState), uint256(Decide.ContestState.VOTING));
    }

    // ✅ Should transition a contest from VOTING to CLOSED when vote time has passed
    function testPerformUpkeepTransitionsContestFromVotingToClosed() public createContestAndJoin {
        // arrange
        Decide.Contest[] memory contests = decideContract.getContestsBatch(0, 2);
        decideContract.changeContestStateManually(contests[0].id, 1);
        vm.warp(contests[0].voteTimeDeadline + 1);
        vm.roll(1);

        uint256[] memory contestIds = new uint256[](1);
        contestIds[0] = contests[0].id;
        bytes memory performData = abi.encode(contestIds);

        // act
        decideContract.performUpkeep(performData);
        Decide.Contest[] memory contestsAfter = decideContract.getContestsBatch(0, 2);

        // assert
        assertEq(uint256(contestsAfter[0].contestState), uint256(Decide.ContestState.CLOSED));
    }

    // ✅ Should call determineWinners when transitioning to CLOSED
    function testPerformUpkeepCallsDetermineWinnersWhenTransitioningToClosed() public createContestAndJoin {
        // arrange
        Decide.Contest[] memory contests = decideContract.getContestsBatch(0, 2);
        decideContract.changeContestStateManually(contests[0].id, 1);
        vm.startPrank(USER2);
        decideContract.voteForEntry{value: 0.005 ether}(contests[0].id, contests[0].entryIds[0]);
        vm.stopPrank();
        vm.startPrank(USER3);
        decideContract.voteForEntry{value: 0.005 ether}(contests[0].id, contests[0].entryIds[0]);
        vm.warp(contests[0].voteTimeDeadline + 1);
        vm.roll(1);

        uint256[] memory contestIds = new uint256[](1);
        contestIds[0] = contests[0].id;
        bytes memory performData = abi.encode(contestIds);

        // act
        decideContract.performUpkeep(performData);
        Decide.Contest[] memory contestsAfter = decideContract.getContestsBatch(0, 2);

        // assert
        assertEq(uint256(contestsAfter[0].contestState), uint256(Decide.ContestState.CLOSED));
    }
    // ❌ Should revert if the contest ID is invalid
    // function testPerformUpkeepRevertsIfContestIdIsInvalid() public {
    //     // arrange
    //     uint256[] memory contestIds = new uint256[](1);
    //     contestIds[0] = 0;
    //     bytes memory performData = abi.encode(contestIds);

    //     // act
    //     vm.expectRevert((0x32));
    //     decideContract.performUpkeep(performData);
    // }

    /*//////////////////////////////////////////////////////////////
                        DETERMINE WINNERS TESTS
    //////////////////////////////////////////////////////////////*/
    // ✅ Should correctly identify the top 3 winners based on vote count
    function testDetermineWinnersIdentifiesTopThreeWinners() public createContestAndAddEntries {
        Decide.Contest[] memory contests = decideContract.getContestsBatch(0, 2);
        // arrange
        decideContract.changeContestStateManually(contests[0].id, 1);
        vm.startPrank(USER5);
        decideContract.voteForEntry{value: 0.005 ether}(contests[0].id, contests[0].entryIds[0]);
        vm.stopPrank();
        vm.startPrank(USER6);
        decideContract.voteForEntry{value: 0.005 ether}(contests[0].id, contests[0].entryIds[1]);
        vm.stopPrank();
        vm.startPrank(USER7);
        decideContract.voteForEntry{value: 0.005 ether}(contests[0].id, contests[0].entryIds[3]);
        vm.stopPrank();

        vm.warp(contests[0].voteTimeDeadline + 1);
        vm.roll(1);

        uint256[] memory contestIds = new uint256[](1);
        contestIds[0] = contests[0].id;
        bytes memory performData = abi.encode(contestIds);

        // act
        decideContract.performUpkeep(performData);
        Decide.Contest[] memory contestsAfter = decideContract.getContestsBatch(0, 2);

        // assert
        assertEq(contestsAfter[0].winners.length, 3);
    }

    // ✅ Should correctly update the winners list
    function testDetermineWinnersUpdatesWinnersList() public createContestAndAddEntries {
        // arrange
        Decide.Contest[] memory contests = decideContract.getContestsBatch(0, 2);
        decideContract.changeContestStateManually(contests[0].id, 1);
        vm.startPrank(USER5);
        decideContract.voteForEntry{value: 0.005 ether}(contests[0].id, contests[0].entryIds[0]);
        vm.stopPrank();
        vm.startPrank(USER6);
        decideContract.voteForEntry{value: 0.005 ether}(contests[0].id, contests[0].entryIds[1]);
        vm.stopPrank();
        vm.stopPrank();
        vm.startPrank(USER7);
        decideContract.voteForEntry{value: 0.005 ether}(contests[0].id, contests[0].entryIds[3]);
        vm.stopPrank();

        vm.warp(contests[0].voteTimeDeadline + 1);
        vm.roll(1);

        uint256[] memory contestIds = new uint256[](1);
        contestIds[0] = contests[0].id;
        bytes memory performData = abi.encode(contestIds);

        // act
        decideContract.performUpkeep(performData);
        Decide.Contest[] memory contestsAfter = decideContract.getContestsBatch(0, 2);

        // assert
        assertEq(contestsAfter[0].winners[0].owner, address(USER));
        assertEq(contestsAfter[0].winners[1].owner, address(USER2));
        assertEq(contestsAfter[0].winners[2].owner, address(USER4));
    }

    // ❌ Should revert if called before VOTING has ended
    function testDetermineWinnersRevertsIfCalledBeforeVotingHasEnded() public createContestAndAddEntries {
        // arrange
        Decide.Contest[] memory contests = decideContract.getContestsBatch(0, 2);
        decideContract.changeContestStateManually(contests[0].id, 1);

        // act
        vm.expectRevert(Decide.Decide__ContestNotYetEnded.selector);
        decideContract.determineWinners(0);
    }

    // ❌ Should revert if there are no entries in the contest
    function testDetermineWinnersRevertsIfThereAreNoEntriesInContest() public {
        // arrange
        decideContract.createContest{value: 0.05 ether}("Contest 1", "Description", "Yusuf", 100, 100, 100);
        Decide.Contest[] memory contests = decideContract.getContestsBatch(0, 2);
        decideContract.changeContestStateManually(contests[0].id, 1);
        vm.warp(contests[0].voteTimeDeadline + 1);
        vm.roll(1);

        // act
        vm.expectRevert(Decide.Decide__NoEntries.selector);
        decideContract.determineWinners(contests[0].id);
    }

    /*//////////////////////////////////////////////////////////////
                        WITHDRAW STAKE TESTS
    //////////////////////////////////////////////////////////////*/
    function testRevertsIfContestHasNotEnded() public createContestAndJoin {
        // arrange
        Decide.Contest[] memory contests = decideContract.getContestsBatch(0, 2);

        // act
        vm.expectRevert(Decide.Decide__ContestNotYetEnded.selector);
        decideContract.withdrawStake(contests[0].id);
    }

    function testRevertsIfStakeAmountIsZero() public createContestAndJoin {
        // arrange
        Decide.Contest[] memory contests = decideContract.getContestsBatch(0, 2);
        decideContract.changeContestStateManually(contests[0].id, 0);
        vm.warp(contests[0].voteTimeDeadline + 1);
        vm.roll(1);

        // act
        vm.prank(USER);
        vm.expectRevert(Decide.Decide__NoStakedTokens.selector);
        decideContract.withdrawStake(contests[0].id);
    }

    // ✅ Should correctly withdraw the staked amount after multiple votes and contest has ended

    function testWithdrawStakeCorrectlyWithdrawsStakedAmount() public createContestAndJoin {
        // arrange
        Decide.Contest[] memory contests = decideContract.getContestsBatch(0, 2);
        decideContract.changeContestStateManually(contests[0].id, 1);
        uint256 userTwoStakedAmount = 0.05 ether;
        uint256 userThreeStakedAmount = 0.07 ether;
        uint256 userFourStakedAmount = 0.07 ether;

        vm.startPrank(USER2);
        decideContract.voteForEntry{value: userTwoStakedAmount}(contests[0].id, contests[0].entryIds[0]);
        vm.stopPrank();

        vm.startPrank(USER3);
        decideContract.voteForEntry{value: userThreeStakedAmount}(contests[0].id, contests[0].entryIds[0]);
        vm.stopPrank();
        
        vm.startPrank(USER4);
        decideContract.voteForEntry{value: userFourStakedAmount}(contests[0].id, contests[0].entryIds[0]);
        vm.stopPrank();

        vm.warp(contests[0].voteTimeDeadline + 1);
        vm.roll(1);

        uint256[] memory contestIds = new uint256[](1);
        contestIds[0] = contests[0].id;
        bytes memory performData = abi.encode(contestIds);
        decideContract.performUpkeep(performData);

        Decide.Contest[] memory contestsAfter = decideContract.getContestsBatch(0, 2);
        uint256 totalStakedAmount = decideContract.getTotalContestStakedAmount(contestsAfter[0].id);
        uint256 userTwoReward = (userTwoStakedAmount * contestsAfter[0].stakerRewardPool) / totalStakedAmount;

        uint256 expectedUserTwoBalance = address(USER2).balance + userTwoStakedAmount + userTwoReward;

        // act
        vm.startPrank(USER2);
        decideContract.withdrawStake(contestsAfter[0].id);
        vm.stopPrank();

        uint256 endingUserTwoBalance = address(USER2).balance;

        // assert
        assertEq(endingUserTwoBalance, expectedUserTwoBalance);
    }

    /*//////////////////////////////////////////////////////////////
                        DISTRIBUTE PRIZES TESTS
    //////////////////////////////////////////////////////////////*/
    // ✅ Should correctly distribute 50%, 30%, and 20% of the prize pool to the top 3 winners
    function testDistributePrizesCorrectlyDistributesPrizes() public createContestAndAddEntries {
        // arrange
        Decide.Contest[] memory contests = decideContract.getContestsBatch(0, 2);
        decideContract.changeContestStateManually(contests[0].id, 1);
        vm.startPrank(USER5);
        decideContract.voteForEntry{value: 0.005 ether}(contests[0].id, contests[0].entryIds[0]);
        vm.stopPrank();
        vm.startPrank(USER6);
        decideContract.voteForEntry{value: 0.005 ether}(contests[0].id, contests[0].entryIds[1]);
        vm.stopPrank();
        vm.stopPrank();
        vm.startPrank(USER7);
        decideContract.voteForEntry{value: 0.005 ether}(contests[0].id, contests[0].entryIds[3]);
        vm.stopPrank();

        vm.warp(contests[0].voteTimeDeadline + 1);
        vm.roll(1);

        uint256[] memory contestIds = new uint256[](1);
        contestIds[0] = contests[0].id;
        bytes memory performData = abi.encode(contestIds);

        uint256 expectedUserBalance = address(USER).balance + 180;
        uint256 expectedUser2Balance = address(USER2).balance + 108;
        uint256 expectedUser4Balance = address(USER4).balance + 72;

        // act
        decideContract.performUpkeep(performData);

        uint256 endingUserBalance = address(USER).balance;
        uint256 endingUser2Balance = address(USER2).balance;
        uint256 endingUser4Balance = address(USER4).balance;

        // assert
        assertEq(endingUserBalance, expectedUserBalance);
        assertEq(endingUser2Balance, expectedUser2Balance);
        assertEq(endingUser4Balance, expectedUser4Balance);
    }

    /*//////////////////////////////////////////////////////////////
                        GETTER FUNCTION TESTS
    //////////////////////////////////////////////////////////////*/
    function testGetAllEnteries() public {
        // arrange
        decideContract.createContest{value: 0.05 ether}("Contest 1", "Description", "Yusuf", 100, 100, 100);
        Decide.Contest[] memory contests = decideContract.getContestsBatch(0, 2);

        // act
        vm.startPrank(USER);
        decideContract.joinContest{value: 100}(contests[0].id, "Entry 1", "Yusuf", "");
        vm.stopPrank();

        vm.startPrank(USER2);
        decideContract.joinContest{value: 100}(contests[0].id, "Entry 2", "Lawal", "");
        vm.stopPrank();

        vm.startPrank(USER3);
        decideContract.joinContest{value: 100}(contests[0].id, "Entry 3", "Ola", "");
        vm.stopPrank();

        Decide.Entry[] memory entries = decideContract.getAllEntries(contests[0].id);

        // assert
        assertEq(entries.length, 3);
    }
}
