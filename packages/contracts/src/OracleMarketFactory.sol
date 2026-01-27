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
}
