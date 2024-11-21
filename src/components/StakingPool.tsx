import { useState, useCallback } from "react";
import { formatEther } from "viem";
import { useReadContract } from "wagmi";
import { Coins, Lock, TrendingUp } from "lucide-react";
import { magTokenABI } from "../contracts/magToken";
import { useStaking } from "../hooks/useStaking";

const MAG_TOKEN_ADDRESS: `0x${string}` = "0x71da932ccda723ba3ab730c976bc66daaf9c598c";

interface StakingTier {
  lockPeriod: number;
  apy: number;
}

// Available staking tiers with their respective lock periods and APY rates
const stakingTiers: StakingTier[] = [
  { lockPeriod: 30, apy: 15 }, // 15% APY
  { lockPeriod: 60, apy: 22.5 }, // 22.5% APY
  { lockPeriod: 90, apy: 30 }, // 30% APY
];

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

  const [stakeAmount, setStakeAmount] = useState("");
  const [selectedTier, setSelectedTier] = useState<StakingTier>(stakingTiers[0]);

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

  const { handleStake, handleUnstake, handleClaimRewards, rewards, formattedStakeBalance } =
    useStaking(address);

  /**
   * Calculates estimated rewards based on stake amount and APY
   * @param amount - Amount to stake
   * @param apy - Annual Percentage Yield
   * @returns Calculated reward amount
   */
  const calculateReward = useCallback((amount: string, apy: number) => {
    const stakeValue = parseFloat(amount) || 0;
    const reward = (stakeValue * apy) / 100;
    console.debug("[StakingPool] Calculated reward:", { amount, apy, reward });
    return reward;
  }, []);

  /**
   * Handles the staking action
   */
  const onStake = async () => {
    if (!stakeAmount) return;

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

      <div className="space-y-6 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {stakingTiers.map((tier) => (
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
              <div className="text-2xl font-bold mb-1">{tier.apy}% APY</div>
              <div className="text-sm opacity-80">{tier.lockPeriod} Days Lock</div>
            </button>
          ))}
        </div>

        {isConnected && (
          <>
            <div className="flex items-center justify-between p-4 bg-white/20 rounded-lg">
              <span className="text-gray-700">Account Balance</span>
              <span className="font-medium text-gray-800">{balance ? formatEther(balance) : "0"} MAG</span>
            </div>
            <div className="flex items-center justify-between p-4 bg-white/20 rounded-lg">
              <span className="text-gray-700">Staked Balance</span>
              <span className="font-medium text-gray-800">{formattedStakeBalance?.amount || "0"} MAG</span>
            </div>
            <div className="flex items-center justify-between p-4 bg-white/20 rounded-lg">
              <span className="text-gray-700">Lock Period Ends</span>
              <span className="font-medium text-gray-800">{formattedStakeBalance?.lockEndTime || "N/A"}</span>
            </div>
            <div className="flex items-center justify-between p-4 bg-white/20 rounded-lg">
              <span className="text-gray-700">Current APY</span>
              <span className="font-medium text-gray-800">{formattedStakeBalance?.apy || 0}%</span>
            </div>
            <div className="flex items-center justify-between p-4 bg-white/20 rounded-lg">
              <span className="text-gray-700">Available Rewards</span>
              <span className="font-medium text-[#FF7777]">
                {rewards && rewards > 0n ? formatEther(rewards) : "0"} MAG
              </span>
            </div>
          </>
        )}
      </div>

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
            <div className="flex gap-4">
              <button
                onClick={handleUnstake}
                disabled={
                  !isConnected || !formattedStakeBalance?.amount || formattedStakeBalance?.amount == 0
                }
                className="px-6 py-3 rounded-lg bg-[#FF7777] hover:bg-[#ff5555] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold transition-colors"
              >
                Unstake MAG
              </button>
              <button
                onClick={handleClaimRewards}
                disabled={!isConnected || !rewards || rewards === 0n}
                className="px-6 py-3 rounded-lg bg-[#FF7777] hover:bg-[#ff5555] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold transition-colors"
              >
                Claim Rewards
              </button>
            </div>
          </div>

          {stakeAmount && (
            <div className="p-4 bg-white/20 rounded-lg space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Selected Tier</span>
                <span className="font-medium text-[#FF7777]">{selectedTier.apy}% APY</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Lock Period</span>
                <span className="font-medium text-gray-800">{selectedTier.lockPeriod} Days</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Estimated Annual Reward</span>
                <span className="font-medium text-[#FF7777]">
                  {calculateReward(stakeAmount, selectedTier.apy).toFixed(2)} MAG
                </span>
              </div>
              <div className="pt-2 text-xs text-gray-500">
                * Rewards are calculated based on the selected lock period and APY tier
              </div>
            </div>
          )}

          <button
            onClick={onStake}
            disabled={!stakeAmount || parseFloat(stakeAmount) <= 0}
            className="w-full bg-[#FF7777] hover:bg-[#ff5555] disabled:opacity-50 disabled:cursor-not-allowed text-white py-4 rounded-lg transition-colors font-semibold"
          >
            {parseFloat(stakeAmount) <= 0 ? "Enter an amount to stake" : "Stake MAG"}
          </button>
        </div>
      ) : (
        <div className="text-center text-gray-600 py-4 bg-white/20 rounded-lg">
          Connect wallet to stake MAG tokens
        </div>
      )}
    </div>
  );
}
