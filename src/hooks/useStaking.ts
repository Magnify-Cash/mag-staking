import { useReadContract, useWriteContract } from "wagmi";
import { parseEther, formatEther } from "viem";
import { magTieredStakingABI } from "../contracts/abis";
import { magTokenABI } from "../contracts/magToken";
import { STAKING_ADDRESS_MAP, TOKEN_ADDRESS_MAP } from "../constants";

/**
 * Custom hook for managing staking operations
 * @param address - User's wallet address
 * @returns Object containing staking operations and data
 */
export function useStaking(address: string, chainId: number) {
  console.info("[useStaking] Initializing with address:", address);

  const { data: stakingTiers } = useReadContract({
    address: STAKING_ADDRESS_MAP[chainId],
    abi: magTieredStakingABI,
    functionName: "getStakingTiers",
    onError: (error) => {
      console.error("[useStaking] Failed to fetch staking tiers:", error);
    },
  });

  const { data: rewards } = useReadContract({
    address: STAKING_ADDRESS_MAP[chainId],
    abi: magTieredStakingABI,
    functionName: "calculateRewards",
    args: [address as `0x${string}`],
    enabled: !!address,
    onError: (error) => {
      console.error("[useStaking] Failed to calculate rewards:", error);
    },
  });

  const { data: stakeBalance } = useReadContract({
    address: STAKING_ADDRESS_MAP[chainId],
    abi: magTieredStakingABI,
    functionName: "stakes",
    args: [address as `0x${string}`],
    enabled: !!address,
    onError: (error) => {
      console.error("[useStaking] Failed to fetch stake balance:", error);
    },
  });
  const formattedStakeBalance = stakeBalance
    ? {
        amount: stakeBalance.amount ? parseFloat(formatEther(stakeBalance.amount)) : 0,
        stakingStartTime: stakeBalance.stakingStartTime
          ? new Date(Number(stakeBalance.stakingStartTime) * 1000).toLocaleString()
          : "N/A",
        lockEndTime: stakeBalance.lockEndTime
          ? new Date(Number(stakeBalance.lockEndTime) * 1000).toLocaleString()
          : "N/A",
        apy: stakeBalance.apy || 0,
      }
    : null;

  // Define the handleAllowance function
  const useAllowance = (ownerAddress: `0x${string}`, spenderAddress: `0x${string}`) => {
    const { data: allowance, error } = useReadContract({
      address: TOKEN_ADDRESS_MAP[chainId],
      abi: magTokenABI,
      functionName: "allowance",
      args: [ownerAddress, spenderAddress],
      onError: (error) => {
        console.error("[useStaking] Failed to fetch allowance:", error);
      },
    });
    if (error) {
      console.error("Error fetching allowance:", error);
      return { allowance: null, error };
    }
    return { allowance, error };
  };
  const { writeContractAsync: approve } = useWriteContract();
  const handleApprove = async (amount: string) => {
    console.info("[useStaking] Initiating stake:", { amount });
    try {
      await approve({
        address: TOKEN_ADDRESS_MAP[chainId],
        abi: magTokenABI,
        functionName: "approve",
        args: [STAKING_ADDRESS_MAP[chainId], parseEther(amount)],
      });
      console.info("[useStaking] Approve successful");
    } catch (error) {
      window.alert(error);
      console.error("[useStaking] Approve failed:", error);
      throw error;
    }
  };
  /**
   * Handles the staking operation
   * @param amount - Amount to stake in string format
   * @param lockPeriod - Lock period in days
   */

  const { writeContractAsync: stake } = useWriteContract();
  const handleStake = async (amount: string, lockPeriod: bigint) => {
    console.info("[useStaking] Initiating stake:", { amount, lockPeriod });
    try {
      await stake({
        address: STAKING_ADDRESS_MAP[chainId],
        abi: magTieredStakingABI,
        functionName: "stake",
        args: [parseEther(amount), lockPeriod],
      });
      console.info("[useStaking] Stake successful");
    } catch (error) {
      window.alert(error);
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
        address: STAKING_ADDRESS_MAP[chainId],
        abi: magTieredStakingABI,
        functionName: "unstake",
      });
      console.info("[useStaking] Unstake successful");
    } catch (error) {
      window.alert(error);
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
        address: STAKING_ADDRESS_MAP[chainId],
        abi: magTieredStakingABI,
        functionName: "claimRewards",
      });
      console.info("[useStaking] Claim rewards successful");
    } catch (error) {
      window.alert(error);
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
    stakeBalance,
    formattedStakeBalance,
    handleApprove,
    useAllowance,
  };
}
