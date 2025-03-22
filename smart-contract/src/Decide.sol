// Layout of Contract:
// version
// imports
// errors
// interfaces, libraries, contracts
// Type declarations
// State variables
// Events
// Modifiers
// Functions

// Layout of Functions:
// constructor
// receive function (if exists)
// fallback function (if exists)
// external
// public
// internal
// private
// view & pure functions

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/*//////////////////////////////////////////////////////////////
                                IMPORTS
//////////////////////////////////////////////////////////////*/

contract Decide {
    /*//////////////////////////////////////////////////////////////
                                ERRORS
    //////////////////////////////////////////////////////////////*/
    error Decide__ContestNotOpen();
    error Decide_UserHasJoinedContest();
    error Decide__IncorrectEntryFee();
    error Decide__TransferFailed();
    error Decide__EntryTimePassed();
    error Decide__VotingClosed();
    error Decide__NotInVotingPhase();
    error Decide_UserHasVotedAlready();
    error Decide__InvalidContestId();
    error Decide__InvalidEntryId();
    error Decide__ContestNotYetEnded();
    error Decide__NoEntries();
    error Decide__InvalidStakeAmount();
    error Decide__StakingFailed();
    error Decide__NoStakedTokens();

    /*//////////////////////////////////////////////////////////////
                        TYPE DECLARATIONS
    //////////////////////////////////////////////////////////////*/
    enum ContestState {
        OPEN,
        VOTING,
        CLOSED
    }

    struct Contest {
        uint256 id;
        string name;
        string creator;
        string description;
        uint256 entryFee;
        uint256 entryTimeDeadline;
        uint256 voteTimeDeadline;
        Entry[] winners;
        uint256[] entryIds;
        ContestState contestState;
        uint256 stakerRewardPool;
    }

    struct Entry {
        uint256 id;
        string name;
        string proposer;
        address payable owner;
        uint256 votes;
        string metadataURI;
    }

    /*//////////////////////////////////////////////////////////////
                            STATE VARIABLES
    //////////////////////////////////////////////////////////////*/
    uint256 private nonce;
    uint256 private s_contestId;
    Contest[] private s_contests;
    address private immutable i_owner;
    uint256 private constant MIN_CONTEST_CREATION_STAKE_AMOUNT = 0.05 ether;
    uint256 private constant MIN_VOTING_STAKE_AMOUNT = 0.005 ether;
    mapping(uint256 => Contest) s_contest;
    mapping(uint256 => bool) public s_contestExists;
    mapping(uint256 => mapping(address => bool)) hasVoted;
    mapping(uint256 => mapping(address => bool)) s_hasJoinedContest;
    mapping(uint256 => mapping(uint256 => Entry)) s_entry;
    mapping(uint256 => mapping(address => uint256)) public s_stakedAmounts;
    mapping(uint256 => uint256) public s_totalStakedAmounts; 

    /*//////////////////////////////////////////////////////////////
                                EVENTS
    //////////////////////////////////////////////////////////////*/
    event ContestCreated(string indexed name);
    event ContestJoined(uint256 indexed contestId, address indexed user, string indexed name);
    event ContestStateUpdated(uint256 indexed contestId, ContestState indexed state);
    event WinnersSelected(uint256 indexed contestId, Entry[] winners);
    event PrizeDistributed(uint256 indexed contestId, address indexed winner, uint256 prize, uint256 place);
    event StakeWithdrawn(address indexed user, uint256 indexed contestId, uint256 amount, uint256 reward);

    /*//////////////////////////////////////////////////////////////
                            EXTERNAL FUNCTIONS
    //////////////////////////////////////////////////////////////*/
    function changeContestStateByTime(uint256 _contestId) external {
        Contest storage contest = s_contest[_contestId];
        if (block.timestamp >= contest.voteTimeDeadline) {
            contest.contestState = ContestState.CLOSED;
        } else if (block.timestamp >= contest.entryTimeDeadline) {
            contest.contestState = ContestState.VOTING;
        }
    }

    function changeContestStateManually(uint256 _contestId, uint256 stateType) external {
        Contest storage contest = s_contest[_contestId];
        if (stateType == 0) {
            contest.contestState = ContestState.CLOSED;
        } else if (stateType == 1) {
            contest.contestState = ContestState.VOTING;
        }
    }

    /*//////////////////////////////////////////////////////////////
                        PUBLIC FUNCTIONS
    //////////////////////////////////////////////////////////////*/
    /**
     * @notice Create a New Contest
     * @dev Allows the contract owner to create a new contest with the specified parameters.
     * The contest is initialized with a unique ID, name, creator, description, entry fee, entry time, vote time, and an OPEN state.
     * The entry time and vote time are calculated based on the current block timestamp.
     *
     * @param _name The name of the contest.
     * @param _creator The address or name of the contest creator.
     * @param _description A brief description of the contest.
     * @param _entryFee The entry fee required to join the contest (in EDU).
     * @param _entryTime The duration (in seconds) during which users can join the contest.
     * @param _voteTime The duration (in seconds) during which users can vote in the contest.
     *
     * @notice The contest is initialized with an empty list of winners and entries.
     *
     * @dev Emits a `ContestCreated` event with the contest details.
     *
     * @custom:emits ContestCreated Emitted when a new contest is created.
     * @custom:error Decide__ContestAlreadyExists If a contest with the same ID already exists.
     */
    function createContest(
        string memory _name,
        string memory _creator,
        string memory _description,
        uint256 _entryFee,
        uint256 _entryTime,
        uint256 _voteTime
    ) public payable {
        uint256 stakeAmount = msg.value;
        if (stakeAmount < MIN_CONTEST_CREATION_STAKE_AMOUNT) {
            revert Decide__InvalidStakeAmount();
        }
        // Generate a unique contest ID
        uint256 contestId = uint256(keccak256(abi.encodePacked(block.timestamp, _name, msg.sender, nonce)));
        nonce++;

        // Update staked amounts
        s_stakedAmounts[contestId][msg.sender] += stakeAmount;
        s_totalStakedAmounts[contestId] += stakeAmount;

        Contest memory newContest = Contest({
            id: contestId,
            name: _name,
            creator: _creator,
            description: _description,
            entryFee: _entryFee,
            entryTimeDeadline: block.timestamp + _entryTime,
            voteTimeDeadline: block.timestamp + _entryTime + _voteTime,
            winners: new Entry[](0),
            entryIds: new uint256[](0),
            contestState: ContestState.OPEN,
            stakerRewardPool: 0
        });

        s_contests.push(newContest);
        s_contest[contestId] = newContest;
        s_contestExists[contestId] = true;
        emit ContestCreated(_name);
    }

    /**
     * @notice Join a Contest
     * @dev Allows a user to join a specific contest by paying the entry fee in EDU Token (EDU).
     * The function handles the entry fee payment and creates a new entry for the user.
     * Several requirements must be met:
     * - The contest must be in OPEN state.
     * - The entry deadline must not have passed.
     * - The user must not have already joined.
     * - The exact entry fee must be sent with the transaction.
     *
     * @param _contestId The ID of the contest to join.
     * @param _name The name of the entry (e.g., the user's submission name).
     * @param _proposer The name of the proposer.
     * @param _metadataURI A URI pointing to metadata associated with the entry (e.g., IPFS link).
     *
     * @custom:security The function uses the checks-effects-interactions pattern to prevent reentrancy attacks.
     * @custom:emits ContestJoined Emitted when a user successfully joins a contest.
     * @custom:error Decide__EntryTimePassed If the entry deadline has passed.
     * @custom:error Decide__ContestNotOpen If the contest is not in the OPEN state.
     * @custom:error Decide_UserHasJoinedContest If the user has already joined the contest.
     * @custom:error Decide__IncorrectEntryFee If the sent ETH does not match the required entry fee.
     */
    function joinContest(uint256 _contestId, string memory _name, string memory _proposer, string memory _metadataURI)
        public
        payable
    {
        Contest storage contest = s_contest[_contestId];

        // Input validation
        if (block.timestamp >= contest.entryTimeDeadline) {
            revert Decide__EntryTimePassed();
        }
        if (contest.contestState != ContestState.OPEN) {
            revert Decide__ContestNotOpen();
        }
        if (s_hasJoinedContest[_contestId][msg.sender]) {
            revert Decide_UserHasJoinedContest();
        }
        if (msg.value != contest.entryFee) {
            revert Decide__IncorrectEntryFee();
        }

        // Generate a unique entry ID using block timestamp and nonce
        uint256 newEntryId = uint256(keccak256(abi.encodePacked(block.timestamp, _contestId, msg.sender, nonce)));
        nonce++;

        Entry memory newEntry = Entry({
            id: newEntryId,
            name: _name,
            proposer: _proposer,
            owner: payable(msg.sender),
            votes: 0,
            metadataURI: _metadataURI
        });

        // Update state
        contest.entryIds.push(newEntryId);
        s_entry[_contestId][newEntryId] = newEntry;
        s_hasJoinedContest[_contestId][msg.sender] = true;

        Entry storage entry = s_entry[_contestId][newEntryId];
        entry.votes++;

        hasVoted[_contestId][msg.sender] = true;

        emit ContestJoined(_contestId, msg.sender, _name);
    }

    /**
     * @notice Vote for a Specific Entry in a Contest
     * @dev Allows a user to vote for a specific entry in an ongoing contest.
     * Ensures that voting is only allowed during the VOTING phase and before the voting deadline.
     * Prevents users from voting more than once in the same contest.
     *
     * @param _contestId The ID of the contest in which the vote is being cast.
     * @param _entryId The ID of the entry that is receiving the vote.
     *
     * @custom:error Decide__InvalidContestId If the contest ID does not exist.
     * @custom:error Decide__InvalidEntryId If the entry ID does not exist.
     * @custom:error Decide__VotingClosed If the voting deadline has passed.
     * @custom:error Decide__NotInVotingPhase If the contest is not in the VOTING phase.
     * @custom:error Decide_UserHasVotedAlready If the voter has already voted in this contest.
     *
     * @dev Updates the vote count for the specified entry and marks the voter as having voted.
     */
    function voteForEntry(uint256 _contestId, uint256 _entryId) public payable {
        if (!s_contestExists[_contestId]) {
            revert Decide__InvalidContestId();
        }
        if (s_entry[_contestId][_entryId].owner == address(0)) {
            revert Decide__InvalidEntryId();
        }

        Contest storage contest = s_contest[_contestId];

        if (block.timestamp >= contest.voteTimeDeadline) {
            revert Decide__VotingClosed();
        }
        if (contest.contestState != ContestState.VOTING) {
            revert Decide__NotInVotingPhase();
        }

        if (hasVoted[_contestId][msg.sender] == true) {
            revert Decide_UserHasVotedAlready();
        }

        if (msg.value < MIN_VOTING_STAKE_AMOUNT) {
            revert Decide__InvalidStakeAmount();
        }

        // Update staked amounts
        s_stakedAmounts[_contestId][msg.sender] += msg.value;
        s_totalStakedAmounts[_contestId] += msg.value;

        Entry storage entry = s_entry[_contestId][_entryId];
        entry.votes++;

        hasVoted[_contestId][msg.sender] = true;
    }

    /**
     * @notice Checks if upkeep is needed for any contest.
     * @dev Iterates through all contests and checks if any contest's state needs to be updated
     * (e.g., from OPEN to VOTING or from VOTING to CLOSED) based on the current block timestamp.
     * The function uses gas optimization techniques like caching array length and unchecked blocks.
     *
     * @return upkeepNeeded True if upkeep is needed, false otherwise.
     * @return performData ABI-encoded data containing the contest IDs that require upkeep.
     *
     * @custom:effects None (read-only function).
     * @custom:security Uses unchecked blocks for counter increments to save gas.
     */
    function checkUpkeep() external view returns (bool upkeepNeeded, bytes memory performData) {
        // Instead of storing all contest IDs, we'll only store the ones that need updating
        uint256[] memory needsUpdateIds = new uint256[](s_contests.length);
        uint256 count;

        // Cache array length to avoid multiple storage reads
        uint256 contestLength = s_contests.length;

        // Using unchecked for counter increments since we know it won't overflow
        unchecked {
            for (uint256 i; i < contestLength; i++) {
                Contest storage contest = s_contests[i];

                // Combined condition check to reduce gas
                bool needsUpdate = (
                    contest.contestState == ContestState.OPEN && block.timestamp >= contest.entryTimeDeadline
                ) || (contest.contestState == ContestState.VOTING && block.timestamp >= contest.voteTimeDeadline);

                if (needsUpdate) {
                    needsUpdateIds[count] = s_contests[i].id;
                    count++;
                }
            }
        }

        if (count > 0) {
            uint256[] memory result = new uint256[](count);
            unchecked {
                for (uint256 i = 0; i < count; i++) {
                    result[i] = needsUpdateIds[i];
                }
            }
            return (true, abi.encode(result));
        }
        return (false, bytes(""));
    }

    /**
     * @notice Performs upkeep for contests based on the provided data.
     * @dev Updates the contest state (e.g., from OPEN to VOTING or from VOTING to CLOSED)
     * based on the current block timestamp and the contest IDs provided in `performData`.
     * If the contest transitions to CLOSED, it also determines the winners.
     *
     * @param performData ABI-encoded data containing the contest IDs for which upkeep is needed.
     *
     * @custom:effects Updates the contest state if the conditions are met.
     * @custom:effects Calls `determineWinners` if the contest transitions to CLOSED.
     * @custom:emits ContestStateUpdated Emitted when the contest state is updated.
     * @custom:security Ensures that only valid contest IDs are processed.
     */
    function performUpkeep(bytes calldata performData) external {
        uint256[] memory contestIds = abi.decode(performData, (uint256[]));

        uint256 contestIdsLength = contestIds.length;

        for (uint256 i = 0; i < contestIdsLength; i++) {
            uint256 contestId = contestIds[i];
            Contest storage contest = s_contest[contestId];

            if (contest.contestState == ContestState.OPEN && block.timestamp >= contest.entryTimeDeadline) {
                contest.contestState = ContestState.VOTING;
            } else if (contest.contestState == ContestState.VOTING && block.timestamp >= contest.voteTimeDeadline) {
                determineWinners(contestId);
                contest.contestState = ContestState.CLOSED;
            }

            emit ContestStateUpdated(contestId, contest.contestState);
        }
    }

    /**
     * @notice Determines the winners of a contest.
     * @dev Identifies the top 3 entries with the most votes and updates the contest's winners.
     * The contest must be in the VOTING state, and the voting period must have ended.
     * The function uses a manual sorting mechanism to identify the top 3 entries.
     *
     * @param _contestId The ID of the contest for which winners are being determined.
     *
     * @custom:reverts Decide__ContestNotYetEnded If the contest is not in the VOTING state or the voting period has not ended.
     * @custom:reverts Decide__NoEntries If there are no entries in the contest.
     *
     * @custom:effects Updates the contest's winners and state.
     * @custom:effects Calls `_distributePrizes` to distribute rewards to the winners.
     * @custom:emits WinnersSelected Emitted when the winners are selected.
     * @custom:security Ensures that only valid contests and entries are processed.
     */
    function determineWinners(uint256 _contestId) public {
        Contest storage contest = s_contest[_contestId];

        if (contest.contestState != ContestState.VOTING || block.timestamp < contest.voteTimeDeadline) {
            revert Decide__ContestNotYetEnded();
        }

        uint256 numEntries = contest.entryIds.length;
        if (numEntries == 0) {
            revert Decide__NoEntries();
        }

        Entry[3] memory topEntries;
        uint256[3] memory topVotes;

        for (uint256 i = 0; i < numEntries; i++) {
            uint256 entryId = contest.entryIds[i];
            Entry storage entry = s_entry[_contestId][entryId];
            uint256 votes = entry.votes;

            if (votes > topVotes[0]) {
                // Shift existing winners down
                topVotes[2] = topVotes[1];
                topEntries[2] = topEntries[1];

                topVotes[1] = topVotes[0];
                topEntries[1] = topEntries[0];

                // Assign new top winner
                topVotes[0] = votes;
                topEntries[0] = entry;
            } else if (votes > topVotes[1]) {
                // Shift existing second-place winner down
                topVotes[2] = topVotes[1];
                topEntries[2] = topEntries[1];

                // Assign new second-place winner
                topVotes[1] = votes;
                topEntries[1] = entry;
            } else if (votes > topVotes[2]) {
                // Assign new third-place winner
                topVotes[2] = votes;
                topEntries[2] = entry;
            }
        }

        // Store winners
        for (uint256 j = 0; j < 3; j++) {
            if (topEntries[j].owner != address(0)) {
                contest.winners.push(topEntries[j]);
            }
        }

        // Move to CLOSED state
        contest.contestState = ContestState.CLOSED;

        // Distribute rewards
        _distributePrizes(_contestId);

        emit WinnersSelected(_contestId, contest.winners);
    }

    /**
     * @notice Allows users to withdraw their staked native tokens and rewards after the contest ends.
     * @dev Calculates the user's share of the 5% staker reward pool based on their staked amount and the total staked amount.
     * Transfers the staked tokens and rewards to the user.
     * The contest must be in the CLOSED state for users to withdraw their stake.
     *
     * @param contestId The ID of the contest for which the user is withdrawing their stake.
     *
     * @custom:effects Transfers staked tokens and rewards to the user.
     * @custom:effects Resets the user's staked amount for the contest.
     * @custom:emits StakeWithdrawn Emitted when a user successfully withdraws their stake and rewards.
     * @custom:reverts Decide__ContestNotClosed If the contest is not in the CLOSED state.
     * @custom:reverts Decide__NoStakedTokens If the user has no staked tokens to withdraw.
     * @custom:reverts Decide__TransferFailed If the transfer of staked tokens and rewards fails.
     */
    function withdrawStake(uint256 contestId) public {
        Contest storage contest = s_contest[contestId];
        if (contest.contestState != ContestState.CLOSED) {
            revert Decide__ContestNotYetEnded();
        }

        uint256 stakedAmount = s_stakedAmounts[contestId][msg.sender];
        if (stakedAmount == 0) {
            revert Decide__NoStakedTokens();
        }

        // Calculate the user's share of the staker reward pool
        uint256 reward = (stakedAmount * contest.stakerRewardPool) / s_totalStakedAmounts[contestId];

        // Transfer staked tokens and rewards to the user
        (bool success,) = msg.sender.call{value: stakedAmount + reward}("");
        if (!success) {
            revert Decide__TransferFailed();
        }

        // Reset staked amounts
        s_stakedAmounts[contestId][msg.sender] = 0;
        s_totalStakedAmounts[contestId] -= stakedAmount;

        emit StakeWithdrawn(msg.sender, contestId, stakedAmount, reward);
    }

    /*//////////////////////////////////////////////////////////////
                        INTERNAL FUNCTIONS
    //////////////////////////////////////////////////////////////*/
    /**
     * @notice Distributes prizes to contest winners and saves rewards for stakers.
     * @dev Deducts a 5% platform fee and saves 5% for stakers from the prize pool.
     * The remaining 90% is distributed to the top 3 winners (50%, 30%, 20%).
     * The function implements secure native token transfer patterns and includes failure handling.
     * If a transfer fails, the transaction will revert to ensure no funds are lost.
     *
     * @param _contestId The ID of the contest for which prizes are being distributed.
     *
     * @custom:effects Deducts a 5% platform fee and saves 5% for stakers.
     * @custom:effects Distributes the remaining 90% to the top 3 winners.
     * @custom:emits PrizeDistributed Emitted when a prize is successfully sent to a winner.
     * @custom:reverts Decide__TransferFailed If a prize or platform fee transfer fails.
     */
    function _distributePrizes(uint256 _contestId) internal {
        Contest storage contest = s_contest[_contestId];

        // Calculate total prize pool (entry fees from all participants)
        uint256 totalPrize = contest.entryIds.length * contest.entryFee;

        // Deduct platform fee (5% of the prize pool)
        uint256 platformFee = (totalPrize * 5) / 100;

        // Save 5% for stakers
        uint256 stakerRewardPool = (totalPrize * 5) / 100;

        // Remaining prize pool for winners (90%)
        uint256 remainingPrize = totalPrize - platformFee - stakerRewardPool;

        // Distribute prizes to winners (50%, 30%, 20% of the remaining prize pool)
        uint256[3] memory prizes = [
            (remainingPrize * 50) / 100, // First prize
            (remainingPrize * 30) / 100, // Second prize
            (remainingPrize * 20) / 100 // Third prize
        ];

        // Transfer platform fee to the platform owner
        (bool platformFeeSuccess,) = i_owner.call{value: platformFee}("");
        if (!platformFeeSuccess) {
            revert Decide__TransferFailed();
        }

        // Save the staker reward pool in the contest storage
        contest.stakerRewardPool = stakerRewardPool;

        // Distribute prizes to winners
        for (uint256 i = 0; i < contest.winners.length && i < 3; i++) {
            address winner = contest.winners[i].owner;
            (bool success,) = winner.call{value: prizes[i]}("");
            if (!success) {
                revert Decide__TransferFailed();
            }
            emit PrizeDistributed(_contestId, winner, prizes[i], i + 1);
        }
    }

    /*//////////////////////////////////////////////////////////////
                        VIEW & PURE FUNCTIONS
    //////////////////////////////////////////////////////////////*/
    /**
     * @notice Retrieves details of a specific contest.
     * @dev Fetches the contest data from storage based on the provided contest ID.
     *
     * @param _contestId The ID of the contest to retrieve.
     * @return Contest A `Contest` struct containing the contest details.
     *
     * @custom:effects None (read-only function).
     */
    function getContest(uint256 _contestId) public view returns (Contest memory) {
        Contest storage contest = s_contest[_contestId];

        return contest;
    }

    /**
     * @notice Returns a batch of contests as an array of `Contest` structs.
     * @dev Fetches multiple contests in a single call, starting from a specified index.
     * The function ensures the batch range is valid and adjusts the end index if it exceeds the total number of contests.
     *
     * @param _start The starting index of the batch.
     * @param _count The number of contests to fetch.
     * @return Contest[] An array of `Contest` structs containing contest data.
     *
     * @custom:effects None (read-only function).
     * @custom:security Ensures the batch range is valid to avoid out-of-bounds errors.
     */
    function getContestsBatch(uint256 _start, uint256 _count) public view returns (Contest[] memory) {
        uint256 numContests = s_contests.length;

        // Ensure the batch range is valid
        if (_start >= numContests) {
            return new Contest[](0);
        }

        uint256 end = _start + _count;
        if (end > numContests) {
            end = numContests;
        }

        uint256 batchSize = end - _start;

        // Initialize an array to store Contest structs
        Contest[] memory contests = new Contest[](batchSize);

        // Fetch contests from the mapping
        for (uint256 i = _start; i < end; i++) {
            // Assuming contest IDs start from 1
            Contest storage contest = s_contest[s_contests[i].id];

            // Populate the Contest struct
            contests[i - _start] = Contest({
                id: contest.id,
                name: contest.name,
                creator: contest.creator,
                description: contest.description,
                entryFee: contest.entryFee,
                entryTimeDeadline: contest.entryTimeDeadline,
                voteTimeDeadline: contest.voteTimeDeadline,
                winners: contest.winners,
                entryIds: contest.entryIds,
                contestState: contest.contestState,
                stakerRewardPool: contest.stakerRewardPool
            });
        }

        return contests;
    }

    /**
     * @notice Retrieves details of a specific entry in a contest.
     * @dev Fetches the entry data from storage based on the provided contest ID and entry ID.
     * Reverts if the contest ID or entry ID is invalid.
     *
     * @param _contestId The ID of the contest containing the entry.
     * @param _entryId The ID of the entry to retrieve.
     * @return Entry An `Entry` struct containing the entry details.
     *
     * @custom:reverts Decide__InvalidContestId If the contest ID does not exist.
     * @custom:reverts Decide__InvalidEntryId If the entry ID does not exist.
     * @custom:effects None (read-only function).
     */
    function getEntry(uint256 _contestId, uint256 _entryId) public view returns (Entry memory) {
        if (!s_contestExists[_contestId]) {
            revert Decide__InvalidContestId();
        }
        if (s_entry[_contestId][_entryId].owner == address(0)) {
            revert Decide__InvalidEntryId();
        }

        return s_entry[_contestId][_entryId];
    }

    /**
     * @notice Retrieves all entries for a specific contest.
     * @dev Fetches all entries associated with the provided contest ID.
     * Reverts if the contest ID is invalid.
     *
     * @param _contestId The ID of the contest for which to retrieve entries.
     * @return Entry[] An array of `Entry` structs containing all entries in the contest.
     *
     * @custom:reverts Decide__InvalidContestId If the contest ID does not exist.
     * @custom:effects None (read-only function).
     */
    function getAllEntries(uint256 _contestId) public view returns (Entry[] memory) {
        if (s_contestExists[_contestId] == false) {
            revert Decide__InvalidContestId();
        }

        Contest storage contest = s_contest[_contestId];
        uint256 numEntries = contest.entryIds.length;
        Entry[] memory entries = new Entry[](numEntries);

        for (uint256 i = 0; i < numEntries; i++) {
            uint256 entryId = contest.entryIds[i];
            entries[i] = s_entry[_contestId][entryId];
        }

        return entries;
    }

    /**
     * @notice Retrieves the number of entries in a specific contest.
     * @dev Returns the length of the `entryIds` array for the provided contest ID.
     *
     * @param _contestId The ID of the contest for which to retrieve the entry count.
     * @return uint256 The number of entries in the contest.
     *
     * @custom:effects None (read-only function).
     */
    function getEntryLength(uint256 _contestId) public view returns (uint256) {
        return s_contest[_contestId].entryIds.length;
    }

    /**
     * @notice Checks if a user has joined a specific contest.
     * @dev Returns a boolean indicating whether the provided user address has joined the contest.
     *
     * @param _contestId The ID of the contest to check.
     * @param _user The address of the user to check.
     * @return bool True if the user has joined the contest, false otherwise.
     *
     * @custom:effects None (read-only function).
     */
    function getHasUserJoinedContest(uint256 _contestId, address _user) public view returns (bool) {
        return s_hasJoinedContest[_contestId][_user];
    }

    /**
     * @notice Checks if a user has voted in a specific contest.
     * @dev Returns a boolean indicating whether the provided voter identifier has voted in the contest.
     * The voter identifier is hashed to ensure privacy and consistency.
     *
     * @param _contestId The ID of the contest to check.
     * @return bool True if the voter has voted in the contest, false otherwise.
     *
     * @custom:effects None (read-only function).
     */
    function getHasUserVoted(uint256 _contestId, address _user) public view returns (bool) {
        return hasVoted[_contestId][_user];
    }

        /**
     * @notice Returns the amount a user has staked in a specific contest.
     * @param _user The address of the user.
     * @param _contestId The ID of the contest.
     * @return The amount of EDU tokens staked by the user.
     */
    function getUserStakedAmount(address _user, uint256 _contestId) public view returns (uint256) {
        return s_stakedAmounts[_contestId][_user];
    }

    /**
     * @notice Returns the total amount of EDU tokens staked in a contest.
     * @param _contestId The ID of the contest.
     * @return The total staked amount for the contest.
     */
    function getTotalContestStakedAmount(uint256 _contestId) public view returns (uint256) {
        return s_totalStakedAmounts[_contestId];
    }

    /**
     * @notice Returns the user's staked amount and calculated reward after the contest ends.
     * @dev The contest must be in the CLOSED state for rewards to be claimed.
     * @param _contestId The ID of the contest.
     * @param _user The address of the user.
     * @return stakedAmount The amount of EDU tokens staked by the user.
     * @return reward The reward amount calculated from the staker reward pool.
     * @dev Reverts if the contest is not yet closed or if the user has no staked tokens.
     */
    function getUserStakeAndReward(uint256 _contestId, address _user) public view returns (uint256, uint256) {
        Contest storage contest = s_contest[_contestId];
        if (contest.contestState != ContestState.CLOSED) {
            revert Decide__ContestNotYetEnded();
        }

        uint256 stakedAmount = s_stakedAmounts[_contestId][_user];
        if (stakedAmount == 0) {
            revert Decide__NoStakedTokens();
        }

        // Calculate the user's share of the staker reward pool
        uint256 reward = (stakedAmount * contest.stakerRewardPool) / s_totalStakedAmounts[_contestId];

        return (stakedAmount, reward);
    }

}
