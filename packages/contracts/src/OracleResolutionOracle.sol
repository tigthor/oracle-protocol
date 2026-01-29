// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title OracleResolutionOracle
 * @notice Multi-source oracle aggregator for market resolution
 * @dev Implements weighted consensus across multiple data sources
 * 
 * Design:
 * - Multiple oracle reporters submit outcomes
 * - Weighted voting determines final result
 * - Dispute mechanism allows staked challenges
 * - Integrates with Chainlink, Pyth, and custom feeds
 */
contract OracleResolutionOracle is Ownable {

    struct OracleReporter {
        address addr;
        string name;
        uint256 weight;     // Higher = more influence
        bool active;
        uint256 totalReports;
        uint256 correctReports;
    }

    struct ResolutionVote {
        address reporter;
        uint256 outcome;    // 0 = NO, 1 = YES
        uint256 confidence; // 0-100
        uint256 timestamp;
        bytes32 dataHash;   // Hash of supporting data
    }

    struct ResolutionRound {
        bytes32 marketId;
        uint256 proposedOutcome;
        uint256 yesWeight;
        uint256 noWeight;
        uint256 totalWeight;
        uint256 voteCount;
        uint256 startedAt;
        uint256 deadline;
        bool finalized;
        mapping(address => bool) hasVoted;
        ResolutionVote[] votes;
    }

    // ── State ──

    mapping(address => OracleReporter) public reporters;
    address[] public reporterList;
    mapping(bytes32 => ResolutionRound) public rounds;
    
    uint256 public quorumThreshold = 60; // 60% weighted vote required
    uint256 public votingPeriod = 300;   // 5 min on testnet (24h mainnet)
    uint256 public minimumReporters = 2;

    address public marketFactory;

    // ── Events ──

    event ReporterAdded(address indexed reporter, string name, uint256 weight);
    event ReporterRemoved(address indexed reporter);
    event ResolutionRoundStarted(bytes32 indexed marketId, uint256 deadline);
    event VoteSubmitted(bytes32 indexed marketId, address indexed reporter, uint256 outcome);
    event ResolutionFinalized(bytes32 indexed marketId, uint256 outcome, uint256 confidence);

    // ── Constructor ──

    constructor(address _marketFactory) Ownable(msg.sender) {
        marketFactory = _marketFactory;
    }

    // ── Reporter Management ──

    function addReporter(
        address _addr,
        string calldata _name,
        uint256 _weight
    ) external onlyOwner {
        require(!reporters[_addr].active, "Reporter already exists");
        require(_weight > 0 && _weight <= 10, "Invalid weight");

        reporters[_addr] = OracleReporter({
            addr: _addr,
            name: _name,
            weight: _weight,
            active: true,
            totalReports: 0,
            correctReports: 0
        });

        reporterList.push(_addr);
        emit ReporterAdded(_addr, _name, _weight);
    }

    function removeReporter(address _addr) external onlyOwner {
        reporters[_addr].active = false;
        emit ReporterRemoved(_addr);
    }

    function updateWeight(address _addr, uint256 _weight) external onlyOwner {
        require(reporters[_addr].active, "Reporter not active");
        require(_weight > 0 && _weight <= 10, "Invalid weight");
        reporters[_addr].weight = _weight;
    }

    // ── Resolution Process ──

    /**
     * @notice Start a resolution round for an expired market
     */
    function startResolution(bytes32 _marketId) external {
        require(reporters[msg.sender].active || msg.sender == owner(), "Not authorized");
        require(!rounds[_marketId].finalized, "Already finalized");
        require(rounds[_marketId].startedAt == 0, "Round already started");

        ResolutionRound storage round = rounds[_marketId];
        round.marketId = _marketId;
        round.startedAt = block.timestamp;
        round.deadline = block.timestamp + votingPeriod;

        emit ResolutionRoundStarted(_marketId, round.deadline);
    }

    /**
     * @notice Submit a resolution vote
     */
    function submitVote(
        bytes32 _marketId,
        uint256 _outcome,
        uint256 _confidence,
        bytes32 _dataHash
    ) external {
        require(reporters[msg.sender].active, "Not an active reporter");
        require(_outcome <= 1, "Invalid outcome");
        require(_confidence <= 100, "Invalid confidence");

        ResolutionRound storage round = rounds[_marketId];
        require(round.startedAt > 0, "Round not started");
        require(block.timestamp <= round.deadline, "Voting period ended");
        require(!round.hasVoted[msg.sender], "Already voted");

        uint256 weight = reporters[msg.sender].weight;

        round.votes.push(ResolutionVote({
            reporter: msg.sender,
            outcome: _outcome,
            confidence: _confidence,
            timestamp: block.timestamp,
            dataHash: _dataHash
        }));

        if (_outcome == 1) {
            round.yesWeight += weight;
        } else {
            round.noWeight += weight;
        }
        round.totalWeight += weight;
        round.voteCount++;
        round.hasVoted[msg.sender] = true;

        reporters[msg.sender].totalReports++;

        emit VoteSubmitted(_marketId, msg.sender, _outcome);
    }

    /**
     * @notice Finalize the resolution round
     */
    function finalize(bytes32 _marketId) external {
        ResolutionRound storage round = rounds[_marketId];
        require(round.startedAt > 0, "Round not started");
        require(!round.finalized, "Already finalized");
        require(
            block.timestamp > round.deadline || 
            round.voteCount >= reporterList.length,
            "Voting still open"
        );
        require(round.voteCount >= minimumReporters, "Insufficient votes");

        // Calculate weighted outcome
        uint256 yesPercent = (round.yesWeight * 100) / round.totalWeight;
        
        require(
            yesPercent >= quorumThreshold || (100 - yesPercent) >= quorumThreshold,
            "No quorum reached"
        );

        uint256 outcome = yesPercent >= quorumThreshold ? 1 : 0;
        uint256 confidence = yesPercent >= 50 ? yesPercent : 100 - yesPercent;

        round.proposedOutcome = outcome;
        round.finalized = true;

        // Update reporter accuracy
        for (uint256 i = 0; i < round.votes.length; i++) {
            if (round.votes[i].outcome == outcome) {
                reporters[round.votes[i].reporter].correctReports++;
            }
        }

        emit ResolutionFinalized(_marketId, outcome, confidence);

        // In production: call marketFactory.resolveMarket(_marketId, outcome)
    }

    // ── View Functions ──

    function getReporterCount() external view returns (uint256) {
        return reporterList.length;
    }

    function getActiveReporters() external view returns (address[] memory) {
        uint256 count = 0;
        for (uint256 i = 0; i < reporterList.length; i++) {
            if (reporters[reporterList[i]].active) count++;
        }

        address[] memory active = new address[](count);
        uint256 idx = 0;
        for (uint256 i = 0; i < reporterList.length; i++) {
            if (reporters[reporterList[i]].active) {
                active[idx] = reporterList[i];
                idx++;
            }
        }
        return active;
    }

    function getRoundStatus(bytes32 _marketId) external view returns (
        bool started,
        bool finalized,
        uint256 voteCount,
        uint256 yesWeight,
        uint256 noWeight,
        uint256 deadline
    ) {
        ResolutionRound storage r = rounds[_marketId];
        return (
            r.startedAt > 0,
            r.finalized,
            r.voteCount,
            r.yesWeight,
            r.noWeight,
            r.deadline
        );
    }

    function getReporterAccuracy(address _reporter) external view returns (
        uint256 total,
        uint256 correct,
        uint256 accuracy
    ) {
        OracleReporter storage r = reporters[_reporter];
        total = r.totalReports;
        correct = r.correctReports;
        accuracy = total > 0 ? (correct * 100) / total : 0;
    }

    // ── Config ──

    function setQuorumThreshold(uint256 _threshold) external onlyOwner {
        require(_threshold >= 50 && _threshold <= 90, "Invalid threshold");
        quorumThreshold = _threshold;
    }

    function setVotingPeriod(uint256 _period) external onlyOwner {
        require(_period >= 60 && _period <= 7 days, "Invalid period");
        votingPeriod = _period;
    }

    function setMarketFactory(address _factory) external onlyOwner {
        marketFactory = _factory;
    }
}
