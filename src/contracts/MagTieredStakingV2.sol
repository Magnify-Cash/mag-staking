// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

interface IMAG is IERC20 {
    // No mint function needed anymore
}

contract MAGTieredStaking is ReentrancyGuard, Ownable, Pausable {
    // State variables
    IMAG public immutable magToken;

    uint256 public constant PERCENTAGE_DENOMINATOR = 10000; // For handling APY percentages (100% = 10000)
    uint256 public totalStaked;
    uint256 public rewardPoolBalance;

    // Staking tier configuration
    struct StakingTier {
        uint256 lockPeriod; // in days
        uint256 apy; // in basis points (15% = 1500)
    }

    StakingTier[] public stakingTiers;

    // Staking information per user
    struct StakeInfo {
        uint256 amount;
        uint256 stakingStartTime;
        uint256 lockEndTime;
        uint256 apy; // APY for this stake in basis points
        uint256 lastRewardClaimTime;
        bool initialized;
    }

    // User stakes mapping
    mapping(address => StakeInfo) public stakes;

    // Events
    event Staked(
        address indexed user,
        uint256 amount,
        uint256 lockPeriod,
        uint256 apy
    );
    event Unstaked(address indexed user, uint256 amount, uint256 rewards);
    event RewardsClaimed(address indexed user, uint256 amount);
    event StakingTierAdded(uint256 lockPeriod, uint256 apy);
    event StakingTierUpdated(uint256 lockPeriod, uint256 apy);
    event Funded(address indexed sender, uint256 amount);

    constructor(address _magToken, address _owner) Ownable(_owner) Pausable() {
        require(_magToken != address(0), "Invalid token address");
        magToken = IMAG(_magToken);

        // Initialize staking tiers
        stakingTiers.push(StakingTier(30, 1500)); // 15% APY
        stakingTiers.push(StakingTier(60, 2250)); // 22.5% APY
        stakingTiers.push(StakingTier(90, 3000)); // 30% APY
    }

    // View functions
    function getStakingTiers() external view returns (StakingTier[] memory) {
        return stakingTiers;
    }

    function getAPYForLockPeriod(
        uint256 lockPeriod
    ) public view returns (uint256) {
        for (uint256 i = 0; i < stakingTiers.length; i++) {
            if (stakingTiers[i].lockPeriod == lockPeriod) {
                return stakingTiers[i].apy;
            }
        }
        revert("Invalid lock period");
    }

    function calculateRewards(address user) public view returns (uint256) {
        StakeInfo storage stakeInfo = stakes[user];
        if (!stakeInfo.initialized || stakeInfo.amount == 0) return 0;

        uint256 timeElapsed = block.timestamp - stakeInfo.lastRewardClaimTime;

        // Calculate rewards: (amount * APY * timeElapsed) / (365 days * PERCENTAGE_DENOMINATOR)
        return
            (stakeInfo.amount * stakeInfo.apy * timeElapsed) /
            (365 days * PERCENTAGE_DENOMINATOR);
    }

    // Core functions
    function stake(
        uint256 amount,
        uint256 lockPeriodInDays
    ) external nonReentrant whenNotPaused {
        require(amount > 0, "Cannot stake 0 tokens");
        require(
            !stakes[msg.sender].initialized || stakes[msg.sender].amount == 0,
            "Existing stake found"
        );

        // Get APY for lock period
        uint256 apy = getAPYForLockPeriod(lockPeriodInDays);

        // Calculate lock end time
        uint256 lockEndTime = block.timestamp + (lockPeriodInDays * 1 days);

        // Transfer tokens from user to contract
        require(
            magToken.transferFrom(msg.sender, address(this), amount),
            "Transfer failed"
        );

        // Update stake info
        stakes[msg.sender] = StakeInfo({
            amount: amount,
            stakingStartTime: block.timestamp,
            lockEndTime: lockEndTime,
            apy: apy,
            lastRewardClaimTime: block.timestamp,
            initialized: true
        });

        totalStaked += amount;
        emit Staked(msg.sender, amount, lockPeriodInDays, apy);
    }

    function unstake() external nonReentrant {
        StakeInfo storage stakeInfo = stakes[msg.sender];
        require(
            stakeInfo.initialized && stakeInfo.amount > 0,
            "No stake found"
        );
        require(
            block.timestamp >= stakeInfo.lockEndTime,
            "Stake is still locked"
        );

        uint256 amount = stakeInfo.amount;
        uint256 rewards = calculateRewards(msg.sender);

        // Reset stake info
        delete stakes[msg.sender];
        totalStaked -= amount;

        // Transfer tokens and rewards from the contract's balance
        require(magToken.transfer(msg.sender, amount), "Transfer failed");
        if (rewards > 0) {
            require(
                magToken.transfer(msg.sender, rewards),
                "Rewards transfer failed"
            );
        }

        emit Unstaked(msg.sender, amount, rewards);
    }

    function claimRewards() external nonReentrant whenNotPaused {
        StakeInfo storage stakeInfo = stakes[msg.sender];
        require(
            stakeInfo.initialized && stakeInfo.amount > 0,
            "No stake found"
        );

        uint256 rewards = calculateRewards(msg.sender);
        require(rewards > 0, "No rewards to claim");

        // Update last claim time
        stakeInfo.lastRewardClaimTime = block.timestamp;

        // Transfer rewards from the contract's balance
        require(
            magToken.transfer(msg.sender, rewards),
            "Rewards transfer failed"
        );

        emit RewardsClaimed(msg.sender, rewards);
    }

    // Emergency functions
    function emergencyWithdraw() external nonReentrant {
        StakeInfo storage stakeInfo = stakes[msg.sender];
        require(
            stakeInfo.initialized && stakeInfo.amount > 0,
            "No stake found"
        );

        uint256 amount = stakeInfo.amount;

        // Reset stake info
        delete stakes[msg.sender];
        totalStaked -= amount;

        // Only return principal, no rewards
        require(magToken.transfer(msg.sender, amount), "Transfer failed");

        emit Unstaked(msg.sender, amount, 0);
    }

    // Admin functions
    function addStakingTier(
        uint256 lockPeriod,
        uint256 apy
    ) external onlyOwner {
        require(lockPeriod > 0, "Invalid lock period");
        require(apy > 0 && apy <= 3000, "Invalid APY"); // Max 30% APY

        for (uint256 i = 0; i < stakingTiers.length; i++) {
            require(
                stakingTiers[i].lockPeriod != lockPeriod,
                "Lock period already exists"
            );
        }

        stakingTiers.push(StakingTier(lockPeriod, apy));
        emit StakingTierAdded(lockPeriod, apy);
    }

    function updateStakingTier(uint256 index, uint256 apy) external onlyOwner {
        require(index < stakingTiers.length, "Invalid tier index");
        require(apy > 0 && apy <= 3000, "Invalid APY"); // Max 30% APY

        stakingTiers[index].apy = apy;
        emit StakingTierUpdated(stakingTiers[index].lockPeriod, apy);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    // Allow anyone to fund the contract
    function fundRewardPool(uint256 amount) external {
        require(amount > 0, "Amount must be greater than 0");
        rewardPoolBalance += amount;
        emit Funded(msg.sender, amount);

        // Transfer tokens into contract for rewards
        require(
            magToken.transferFrom(msg.sender, address(this), amount),
            "Transfer failed"
        );
    }

    // In case tokens get stuck
    function recoverERC20(
        address tokenAddress,
        uint256 tokenAmount
    ) external onlyOwner {
        require(
            tokenAddress != address(magToken),
            "Cannot recover staking token"
        );
        IERC20(tokenAddress).transfer(owner(), tokenAmount);
    }
}
