// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title OracleMarketFactory
 * @notice Registry for prediction markets on HyperEVM
 * @dev Maps ORACLE markets to HIP-4 outcome contracts on HyperCore
 */
contract OracleMarketFactory is Ownable, ReentrancyGuard {
    
    // ── Types ──
    
    enum MarketStatus { 
        Pending,
        Active,
        Paused,
        Resolving,
        Resolved,
        Cancelled
    }

    enum MarketCategory {
        Crypto,
        Macro,
        Sports,
        Tech,
        Politics,
        Custom
    }

    struct Market {
        bytes32 id;
        string question;
        string description;
        MarketCategory category;
        MarketStatus status;
        uint256 createdAt;
        uint256 expiresAt;
        uint256 resolvedAt;
        address creator;
        address oracleResolver;
        bytes32 outcomeAssetId;
        uint256 resolution;
        uint256 totalVolume;
        string resolutionSource;
        string[] tags;
    }

    struct MarketParams {
        string question;
        string description;
        MarketCategory category;
        uint256 expiresAt;
        address oracleResolver;
        bytes32 outcomeAssetId;
        string resolutionSource;
        string[] tags;
    }

    // ── State ──

    mapping(bytes32 => Market) public markets;
    bytes32[] public marketIds;
    mapping(address => bytes32[]) public creatorMarkets;
    mapping(address => bool) public authorizedCreators;
    bool public permissionlessMode = false;
    uint256 public disputeWindow = 0;
    uint256 public builderFeeBps = 50;
    address public feeRecipient;

    // ── Events ──

    event MarketCreated(
        bytes32 indexed marketId,
        string question,
        MarketCategory category,
        uint256 expiresAt,
        bytes32 outcomeAssetId,
        address indexed creator
    );

    event MarketActivated(bytes32 indexed marketId);
    event MarketPaused(bytes32 indexed marketId, string reason);
    event MarketResumed(bytes32 indexed marketId);
    
    event ResolutionInitiated(
        bytes32 indexed marketId,
        uint256 proposedOutcome,
        address indexed resolver
    );
    
    event MarketResolved(
        bytes32 indexed marketId,
        uint256 outcome,
        uint256 resolvedAt
    );
    
    event MarketCancelled(bytes32 indexed marketId, string reason);
    event CreatorAuthorized(address indexed creator);
    event CreatorRevoked(address indexed creator);
    event PermissionlessModeEnabled();

    // ── Modifiers ──

    modifier onlyAuthorizedCreator() {
        require(
            permissionlessMode || authorizedCreators[msg.sender] || msg.sender == owner(),
            "Not authorized to create markets"
        );
        _;
    }

    modifier marketExists(bytes32 _marketId) {
        require(markets[_marketId].createdAt != 0, "Market does not exist");
        _;
    }

    // ── Constructor ──

    constructor(address _feeRecipient) Ownable(msg.sender) {
        feeRecipient = _feeRecipient;
        authorizedCreators[msg.sender] = true;
    }

    function createMarket(
        MarketParams calldata params
    ) external onlyAuthorizedCreator nonReentrant returns (bytes32) {
        require(bytes(params.question).length >= 10, "Question too short");
        require(bytes(params.question).length <= 300, "Question too long");
        require(params.expiresAt > block.timestamp, "Expiry must be in future");
        require(params.expiresAt <= block.timestamp + 365 days, "Expiry too far");
        require(params.oracleResolver != address(0), "Invalid oracle address");

        bytes32 marketId = keccak256(
            abi.encodePacked(params.question, params.expiresAt, block.timestamp, msg.sender)
        );

        require(markets[marketId].createdAt == 0, "Market already exists");

        Market storage m = markets[marketId];
        m.id = marketId;
        m.question = params.question;
        m.description = params.description;
        m.category = params.category;
        m.status = MarketStatus.Active;
        m.createdAt = block.timestamp;
        m.expiresAt = params.expiresAt;
        m.creator = msg.sender;
        m.oracleResolver = params.oracleResolver;
        m.outcomeAssetId = params.outcomeAssetId;
        m.resolutionSource = params.resolutionSource;
        m.tags = params.tags;

        marketIds.push(marketId);
        creatorMarkets[msg.sender].push(marketId);

        emit MarketCreated(marketId, params.question, params.category, params.expiresAt, params.outcomeAssetId, msg.sender);

        return marketId;
    }

    function resolveMarket(bytes32 _marketId, uint256 _outcome) external marketExists(_marketId) nonReentrant {
        Market storage m = markets[_marketId];
        require(msg.sender == m.oracleResolver || msg.sender == owner(), "Only oracle resolver or owner");
        require(block.timestamp >= m.expiresAt, "Market has not expired");
        require(m.status == MarketStatus.Active || m.status == MarketStatus.Paused, "Market not resolvable");
        require(_outcome <= 1, "Outcome must be 0 or 1");

        if (disputeWindow > 0) {
            m.status = MarketStatus.Resolving;
            m.resolution = _outcome;
            emit ResolutionInitiated(_marketId, _outcome, msg.sender);
        } else {
            m.status = MarketStatus.Resolved;
            m.resolution = _outcome;
            m.resolvedAt = block.timestamp;
            emit MarketResolved(_marketId, _outcome, block.timestamp);
        }
    }

    function finalizeResolution(bytes32 _marketId) external marketExists(_marketId) {
        Market storage m = markets[_marketId];
        require(m.status == MarketStatus.Resolving, "Not in resolving state");
        require(block.timestamp >= m.expiresAt + disputeWindow, "Dispute window not elapsed");

        m.status = MarketStatus.Resolved;
        m.resolvedAt = block.timestamp;
        emit MarketResolved(_marketId, m.resolution, block.timestamp);
    }
}
