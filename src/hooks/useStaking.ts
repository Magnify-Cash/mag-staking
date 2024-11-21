import { useReadContract, useWriteContract } from "wagmi";
import { parseEther, zeroAddress } from "viem";
import { magTieredStakingABI } from "../contracts/abis";

const STAKING_CONTRACT_ADDRESS = zeroAddress; // Replace with actual deployed contract address

/**
 * Custom hook for managing staking operations
 * @param address - User's wallet address
 * @returns Object containing staking operations and data
 */
export function useStaking(address?: string) {
  console.info("[useStaking] Initializing with address:", address);

  const { data: stakingTiers } = useReadContract({
    address: STAKING_CONTRACT_ADDRESS,
    abi: magTieredStakingABI,
    functionName: "getStakingTiers",
    onError: (error) => {
      console.error("[useStaking] Failed to fetch staking tiers:", error);
    },
  });

  const { data: rewards } = useReadContract({
    address: STAKING_CONTRACT_ADDRESS,
    abi: magTieredStakingABI,
    functionName: "calculateRewards",
    args: [address as `0x${string}`],
    enabled: !!address,
    onError: (error) => {
      console.error("[useStaking] Failed to calculate rewards:", error);
    },
  });

  /**
   * Handles the staking operation
   * @param amount - Amount to stake in string format
   * @param lockPeriod - Lock period in days
   */
  const { writeContractAsync: stake } = useWriteContract();
  const handleStake = async (amount: string, lockPeriod: number) => {
    console.info("[useStaking] Initiating stake:", { amount, lockPeriod });
    try {
      await stake({
        address: STAKING_CONTRACT_ADDRESS,
        abi: magTieredStakingABI,
        functionName: "stake",
        args: [parseEther(amount), BigInt(lockPeriod)],
      });
      console.info("[useStaking] Stake successful");
    } catch (error) {
      console.error("[useStaking] Stake failed:", error);
      throw error;
    }
  };

  /**
   * Handles the unstaking operation
   */
  const { writeContractAsync: unstake } = useWriteContract();
  const handleUnstake = async () => {
    console.info("[useStaking] Initiating unstake");

    try {
      await unstake({
        address: STAKING_CONTRACT_ADDRESS,
        abi: magTieredStakingABI,
        functionName: "unstake",
      });
      console.info("[useStaking] Unstake successful");
    } catch (error) {
      console.error("[useStaking] Unstake failed:", error);
      throw error;
    }
  };

  /**
   * Handles claiming rewards
   */
  const { writeContractAsync: claimRewards } = useWriteContract();
  const handleClaimRewards = async () => {
    console.info("[useStaking] Initiating claim rewards");

    try {
      await claimRewards({
        address: STAKING_CONTRACT_ADDRESS,
        abi: magTieredStakingABI,
        functionName: "claimRewards",
      });
      console.info("[useStaking] Claim rewards successful");
    } catch (error) {
      console.error("[useStaking] Claim rewards failed:", error);
      throw error;
    }
  };

  return {
    stakingTiers,
    rewards,
    handleStake,
    handleUnstake,
    handleClaimRewards,
    unstake,
    claimRewards,
  };
}
