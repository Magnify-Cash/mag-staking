import { useState, useCallback, useEffect } from "react";
import { formatEther, parseEther } from "viem";
import { useReadContract } from "wagmi";
import { Coins, Lock, TrendingUp } from "lucide-react";
import { magTokenABI } from "../contracts/magToken";
import { useStaking, MAG_TOKEN_ADDRESS, STAKING_CONTRACT_ADDRESS } from "../hooks/useStaking";

interface StakingTier {
  lockPeriod: bigint;
  apy: bigint;
}

interface StakingPoolProps {
  isConnected: boolean;
  address?: string;
}

/**
 * StakingPool Component
 * Provides interface for users to stake MAG tokens with different lock periods and APY rates
 */
export default function StakingPool({ isConnected, address }: StakingPoolProps) {
  console.info("[StakingPool] Rendering with:", { isConnected, address });

  const {
    handleStake,
    handleUnstake,
    handleClaimRewards,
    rewards,
    formattedStakeBalance,
    stakingTiers,
    useAllowance,
    handleApprove,
  } = useStaking(address);
  const { allowance, error: allowanceError } = useAllowance(
    address as `0x${string}`,
    STAKING_CONTRACT_ADDRESS,
  );

  const [stakeAmount, setStakeAmount] = useState("");
  const [selectedTier, setSelectedTier] = useState<StakingTier | undefined>(undefined);
  useEffect(() => {
    if (stakingTiers !== undefined) {
      setSelectedTier(stakingTiers[0]);
    }
  }, [stakingTiers]);

  // Fetch user's MAG token balance
  const { data: balance } = useReadContract({
    address: MAG_TOKEN_ADDRESS,
    abi: magTokenABI,
    functionName: "balanceOf",
    args: [address],
    enabled: !!address,
    onError: (error) => {
      console.error("[StakingPool] Failed to fetch balance:", error);
    },
  });

  /**
   * Calculates estimated rewards based on stake amount and APY
   * @param amount - Amount to stake
   * @param apy - Annual Percentage Yield
   * @returns Calculated reward amount
   */
  const calculateReward = useCallback((amount: string, apy: bigint | undefined) => {
    if (apy === undefined) return "0"; // Handle the case where apy is undefined

    // Convert stake value to BigInt (representing the value in smallest units, e.g., wei)
    const stakeValue = BigInt(parseFloat(amount) * 1e18); // e.g., 1 MAG token -> 1 * 1e18 in smallest units

    // Ensure that APY is in the decimal form (e.g., 1500n should become 15n for 15%)
    const apyDecimal = apy / 100n; // Convert 1500n (1500%) to 15n (15%)

    // Calculate reward based on stake value and APY
    const reward = (stakeValue * apyDecimal) / BigInt(100); // Multiply stakeValue by APY (now in decimal), divide by 100 for percentage

    // Convert the reward back to human-readable format by dividing by 1e18 (to get MAG tokens)
    const rewardInTokens = Number(reward) / 1e18; // Convert BigInt to Number, and divide by 1e18 to get token value

    // Format the result to a maximum of 8 decimal places (optional: set your desired decimals)
    const rewardString = rewardInTokens.toFixed(8); // Format with 8 decimal places

    console.debug("[StakingPool] Calculated reward:", { amount, apy, reward, rewardString });

    return rewardString; // Return the formatted reward as a string
  }, []);

  /**
   * Handles the staking action
   */
  const onStake = async () => {
    if (!stakeAmount) return;
    if (!selectedTier) return;
    if (allowance == null || allowance == undefined) {
      console.error("[StakingPool] Allowance check failed:", allowanceError);
      return;
    }

    // Convert stakeAmount to BigInt in ether (we assume it's in ether)
    const stakeAmountBigInt = parseEther(stakeAmount); // Converts stakeAmount (ether) to BigInt in wei
    const allowanceBigInt = BigInt(allowance); // Ensure allowance is also BigInt (in wei)

    // Log the values to check
    console.log("Allowance:", allowanceBigInt);
    console.log("Stake Amount in BigInt (wei):", stakeAmountBigInt);
    console.log("Is stake amount > allowance?", stakeAmountBigInt > allowanceBigInt);

    if (stakeAmountBigInt > allowanceBigInt) {
      try {
        await handleApprove(stakeAmount);
        console.info("[StakingPool] Approval successful");
      } catch (error) {
        console.error("[StakingPool] Approval failed:", error);
      }
      return;
    }

    console.info("[StakingPool] Initiating stake:", {
      amount: stakeAmount,
      tier: selectedTier,
      address,
    });

    try {
      await handleStake(stakeAmount, selectedTier.lockPeriod);
      console.info("[StakingPool] Stake successful");
      setStakeAmount(""); // Reset input after successful stake
    } catch (error) {
      console.error("[StakingPool] Stake failed:", error);
    }
  };

  /**
   * Handles tier selection
   */
  const handleTierSelect = useCallback((tier: StakingTier) => {
    console.info("[StakingPool] Tier selected:", tier);
    setSelectedTier(tier);
  }, []);

  /**
   * Sets maximum available balance as stake amount
   */
  const handleMaxAmount = useCallback(() => {
    if (balance) {
      const maxAmount = formatEther(balance);
      console.info("[StakingPool] Setting max amount:", maxAmount);
      setStakeAmount(maxAmount);
    }
  }, [balance]);

  return (
    <div className="bg-white/30 backdrop-blur-lg rounded-2xl p-8 border border-[#FF7777]/20 transition-all duration-300 shadow-xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-2xl font-bold text-gray-800">MAG Staking Pool</h3>
          <p className="text-sm text-gray-600 mt-1">Stake MAG tokens to earn tiered rewards</p>
        </div>
        <Coins className="w-10 h-10 text-[#FF7777]" />
      </div>

      {/* Staking Tiers */}
      <div className="space-y-6 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {stakingTiers !== undefined && selectedTier !== undefined
            ? stakingTiers.map((tier) => (
                <button
                  key={tier.lockPeriod}
                  onClick={() => handleTierSelect(tier)}
                  className={`p-4 rounded-lg transition-all duration-300 ${
                    selectedTier.lockPeriod === tier.lockPeriod
                      ? "bg-[#FF7777] text-white shadow-lg scale-105"
                      : "bg-white/20 hover:bg-white/30"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <Lock className="w-5 h-5" />
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <div className="text-2xl font-bold mb-1">{(tier.apy / 100n).toString()}% APY</div>
                  <div className="text-sm opacity-80">{tier.lockPeriod.toString()} Days Lock</div>
                </button>
              ))
            : null}
        </div>
      </div>

      {/* Stake Amount and Tier Info */}
      {isConnected ? (
        <div className="space-y-6">
          <div className="space-y-2">
            <label htmlFor="stake-amount" className="block text-sm font-medium text-gray-700">
              Amount to Stake
            </label>
            <div className="relative">
              <input
                id="stake-amount"
                type="number"
                value={stakeAmount}
                onChange={(e) => setStakeAmount(e.target.value)}
                placeholder="Enter amount"
                className="w-full bg-white/50 border border-[#FF7777]/20 rounded-lg px-4 py-3 focus:outline-none focus:border-[#FF7777] text-gray-800"
              />
              <button
                onClick={handleMaxAmount}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-[#FF7777] hover:text-[#ff5555] font-medium"
              >
                MAX
              </button>
            </div>
          </div>

          {stakeAmount && (
            <div className="p-4 bg-white/20 rounded-lg space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Selected Tier</span>
                <span className="font-medium text-[#FF7777]">
                  {selectedTier ? (selectedTier.apy / 100n).toString() : ""}% APY
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Lock Period</span>
                <span className="font-medium text-gray-800">{selectedTier?.lockPeriod.toString()} Days</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Estimated Annual Reward</span>
                <span className="font-medium text-[#FF7777]">
                  {calculateReward(stakeAmount, selectedTier?.apy)} MAG
                </span>
              </div>
              <div className="pt-2 text-xs text-gray-500">
                * Rewards are calculated based on the selected lock period and APY tier
              </div>
            </div>
          )}

          {/* Stake Action */}
          <button
            onClick={onStake}
            disabled={!stakeAmount || parseFloat(stakeAmount) <= 0}
            className="w-full bg-[#FF7777] hover:bg-[#ff5555] disabled:opacity-50 disabled:cursor-not-allowed text-white py-4 rounded-lg transition-colors font-semibold"
          >
            {parseFloat(stakeAmount) <= 0
              ? "Enter an amount to stake"
              : BigInt(allowance || 0) < parseEther(stakeAmount)
                ? "Approve MAG"
                : "Stake MAG"}
          </button>
        </div>
      ) : (
        <div className="text-center text-gray-600 py-4 bg-white/20 rounded-lg">
          Connect wallet to stake MAG tokens
        </div>
      )}

      {/* Account Info and Rewards */}
      {isConnected && (
        <>
          <div className="space-y-4 mt-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Account Balance */}
              <div className="p-4 bg-white/20 rounded-lg">
                <div className="flex justify-between text-gray-600">
                  <span>Wallet Balance</span>
                </div>
                <div className="mt-2 text-gray-800 font-medium">
                  {balance ? formatEther(balance) : "0"} MAG
                </div>
              </div>

              {/* Staked Balance */}
              <div className="p-4 bg-white/20 rounded-lg">
                <div className="text-gray-600">
                  <span>Staked Balance</span>
                  <div className="font-medium text-gray-800 mt-2">
                    {formattedStakeBalance?.amount || "0"} MAG
                  </div>
                </div>

                {formattedStakeBalance?.amount && (
                  <div className="mt-2 text-gray-600">
                    <span>Lock Period Ends</span>
                    <div className="font-medium text-gray-800">
                      {formattedStakeBalance?.lockEndTime || "N/A"}
                    </div>
                  </div>
                )}

                {formattedStakeBalance?.apy ? (
                  <div className="mt-2 text-gray-600">
                    <span>Current APY</span>
                    <div className="font-medium text-gray-800">
                      {(formattedStakeBalance.apy / 100n).toString() || "0"}%
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            {/* Rewards Info */}
            <div className="p-4 bg-white/20 rounded-lg">
              <span className="text-gray-600">Available Rewards</span>
              <div className="mt-2 text-[#FF7777] font-medium">
                {rewards && rewards > 0n ? formatEther(rewards) : "0"} MAG
              </div>
            </div>

            {/* Unstake and Claim Rewards Actions */}
            <div className="flex gap-4 mt-6">
              <button
                onClick={handleUnstake}
                disabled={!formattedStakeBalance?.amount || formattedStakeBalance?.amount == 0}
                className="px-6 py-3 rounded-lg bg-[#FF7777] hover:bg-[#ff5555] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold transition-colors"
              >
                Unstake MAG
              </button>
              <button
                onClick={handleClaimRewards}
                disabled={!rewards || rewards === 0n}
                className="px-6 py-3 rounded-lg bg-[#FF7777] hover:bg-[#ff5555] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold transition-colors"
              >
                Claim Rewards
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
