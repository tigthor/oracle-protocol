// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title OracleMarketFactory
 * @notice Registry for prediction markets on HyperEVM
 * @dev Maps ORACLE markets to HIP-4 outcome contracts on HyperCore
 * 
 * Architecture:
 * - This contract lives on HyperEVM (the EVM layer of Hyperliquid)
 * - HIP-4 outcome contracts live on HyperCore (the native CLOB layer)
 * - This factory serves as the canonical registry linking the two
 * - Resolution triggers HyperCore settlement automatically
 */
contract OracleMarketFactory is Ownable, ReentrancyGuard {
    
    // ── Types ──
    
    enum MarketStatus { 
        Pending,    // Created but not yet active
        Active,     // Trading is live
        Paused,     // Temporarily halted
        Resolving,  // In dispute window
        Resolved,   // Final outcome determined
        Cancelled   // Market voided, positions refunded
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
        address oracleResolver;    // Address authorized to resolve
        bytes32 outcomeAssetId;    // HIP-4 asset ID on HyperCore
        uint256 resolution;        // 0 = NO, 1 = YES
        uint256 totalVolume;
        string resolutionSource;   // e.g., "chainlink:btc/usd"
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
    
    // Authorized market creators (Phase 1: curated, Phase 2: permissionless)
    mapping(address => bool) public authorizedCreators;
    bool public permissionlessMode = false;
    
    // Resolution dispute window (24h on mainnet, 0 on testnet)
    uint256 public disputeWindow = 0;
    
    // Builder code fee (basis points, e.g., 50 = 0.5%)
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
    
    event MarketCancelled(
        bytes32 indexed marketId,
        string reason
    );

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

    // ── Market Creation ──

    /**
     * @notice Create a new prediction market
     * @param params Market creation parameters
     * @return marketId The unique identifier for the new market
     */
    function createMarket(
        MarketParams calldata params
    ) external onlyAuthorizedCreator nonReentrant returns (bytes32) {
        require(bytes(params.question).length >= 10, "Question too short");
        require(bytes(params.question).length <= 300, "Question too long");
        // Validate expiry: must be in future, max 1 year
        require(params.expiresAt > block.timestamp, "Expiry must be in future");
        require(params.expiresAt <= block.timestamp + 365 days, "Expiry too far");
        require(params.oracleResolver != address(0), "Invalid oracle address");

        bytes32 marketId = keccak256(
            abi.encodePacked(
                params.question,
                params.expiresAt,
                block.timestamp,
                msg.sender
            )
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

        // Emit after all state changes to follow CEI pattern
        emit MarketCreated(
            marketId,
            params.question,
            params.category,
            params.expiresAt,
            params.outcomeAssetId,
            msg.sender
        );

        return marketId;
    }

    // ── Resolution ──

    /**
     * @notice Resolve a market with the final outcome
     * @param _marketId The market to resolve
     * @param _outcome 0 for NO, 1 for YES
     */
    function resolveMarket(
        bytes32 _marketId,
        uint256 _outcome
    ) external marketExists(_marketId) nonReentrant {
        Market storage m = markets[_marketId];
        
        require(
            msg.sender == m.oracleResolver || msg.sender == owner(),
            "Only oracle resolver or owner"
        );
        require(
            block.timestamp >= m.expiresAt,
            "Market has not expired"
        );
        require(
            m.status == MarketStatus.Active || m.status == MarketStatus.Paused,
            "Market not resolvable"
        );
        require(_outcome <= 1, "Outcome must be 0 or 1");

        if (disputeWindow > 0) {
            m.status = MarketStatus.Resolving;
            m.resolution = _outcome;
            emit ResolutionInitiated(_marketId, _outcome, msg.sender);
        } else {
            // Instant resolution (testnet mode)
            m.status = MarketStatus.Resolved;
            m.resolution = _outcome;
            m.resolvedAt = block.timestamp;
            emit MarketResolved(_marketId, _outcome, block.timestamp);
        }
        
        // NOTE: HyperCore auto-settles all HIP-4 positions when
        // the outcome contract is resolved. This contract just
        // triggers the resolution — settlement is native.
    }

    /**
     * @notice Finalize resolution after dispute window
     */
    function finalizeResolution(
        bytes32 _marketId
    ) external marketExists(_marketId) {
        Market storage m = markets[_marketId];
        require(m.status == MarketStatus.Resolving, "Not in resolving state");
        require(
            block.timestamp >= m.expiresAt + disputeWindow,
            "Dispute window not elapsed"
        );

        m.status = MarketStatus.Resolved;
        m.resolvedAt = block.timestamp;
        emit MarketResolved(_marketId, m.resolution, block.timestamp);
    }

    /**
     * @notice Cancel a market (emergency only)
     */
    function cancelMarket(
        bytes32 _marketId,
        string calldata reason
    ) external onlyOwner marketExists(_marketId) {
        Market storage m = markets[_marketId];
        require(
            m.status == MarketStatus.Active || 
            m.status == MarketStatus.Paused ||
            m.status == MarketStatus.Pending,
            "Cannot cancel resolved market"
        );

        m.status = MarketStatus.Cancelled;
        emit MarketCancelled(_marketId, reason);
    }

    // ── Market Management ──

    function pauseMarket(bytes32 _marketId, string calldata reason) 
        external onlyOwner marketExists(_marketId) 
    {
        markets[_marketId].status = MarketStatus.Paused;
        emit MarketPaused(_marketId, reason);
    }

    function resumeMarket(bytes32 _marketId) 
        external onlyOwner marketExists(_marketId) 
    {
        require(markets[_marketId].status == MarketStatus.Paused, "Not paused");
        markets[_marketId].status = MarketStatus.Active;
        emit MarketResumed(_marketId);
    }

    // ── Access Control ──

    function authorizeCreator(address _creator) external onlyOwner {
        authorizedCreators[_creator] = true;
        emit CreatorAuthorized(_creator);
    }

    function revokeCreator(address _creator) external onlyOwner {
        authorizedCreators[_creator] = false;
        emit CreatorRevoked(_creator);
    }

    function enablePermissionlessMode() external onlyOwner {
        permissionlessMode = true;
        emit PermissionlessModeEnabled();
    }

    // ── Configuration ──

    function setDisputeWindow(uint256 _window) external onlyOwner {
        require(_window <= 7 days, "Dispute window too long");
        disputeWindow = _window;
    }

    function setBuilderFee(uint256 _feeBps) external onlyOwner {
        require(_feeBps <= 500, "Fee too high"); // Max 5%
        builderFeeBps = _feeBps;
    }

    function setFeeRecipient(address _recipient) external onlyOwner {
        require(_recipient != address(0), "Invalid address");
        feeRecipient = _recipient;
    }

    // ── View Functions ──

    function getMarket(bytes32 _marketId) external view returns (Market memory) {
        return markets[_marketId];
    }

    function getMarketCount() external view returns (uint256) {
        return marketIds.length;
    }

    function getMarketsByCreator(address _creator) external view returns (bytes32[] memory) {
        return creatorMarkets[_creator];
    }

    function getActiveMarkets(uint256 offset, uint256 limit) 
        external view returns (bytes32[] memory) 
    {
        uint256 count = 0;
        bytes32[] memory temp = new bytes32[](marketIds.length);
        
        for (uint256 i = 0; i < marketIds.length; i++) {
            if (markets[marketIds[i]].status == MarketStatus.Active) {
                temp[count] = marketIds[i];
                count++;
            }
        }

        uint256 start = offset < count ? offset : count;
        uint256 end = start + limit < count ? start + limit : count;
        bytes32[] memory result = new bytes32[](end - start);
        
        for (uint256 i = start; i < end; i++) {
            result[i - start] = temp[i];
        }
        
        return result;
    }

    function isMarketResolved(bytes32 _marketId) external view returns (bool) {
        return markets[_marketId].status == MarketStatus.Resolved;
    }

    function getResolution(bytes32 _marketId) external view returns (uint256) {
        require(
            markets[_marketId].status == MarketStatus.Resolved,
            "Market not resolved"
        );
        return markets[_marketId].resolution;
    }
}
