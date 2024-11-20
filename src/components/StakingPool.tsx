import React, { useState } from 'react';
import { parseEther, formatEther } from 'viem';
import { useContractRead, useContractWrite } from 'wagmi';
import { Coins, Lock, Timer } from 'lucide-react';
import { magTokenABI } from '../contracts/magToken';

const MAG_TOKEN_ADDRESS = '0x71da932ccda723ba3ab730c976bc66daaf9c598c';

interface PoolConfig {
  totalPoolSize: number;
  annualAPY: number;
  rewardPeriod: number;
  monthlyReward: number;
  minimumStake: number;
  lockPeriods: number[];
}

interface StakingPoolProps {
  config: PoolConfig;
  isConnected: boolean;
  address?: string;
}

export default function StakingPool({ config, isConnected, address }: StakingPoolProps) {
  const [stakeAmount, setStakeAmount] = useState('');
  const [selectedLockPeriod, setSelectedLockPeriod] = useState(config.lockPeriods[0]);

  const { data: balance } = useContractRead({
    address: MAG_TOKEN_ADDRESS,
    abi: magTokenABI,
    functionName: 'balanceOf',
    args: [address],
    enabled: !!address,
  });

  const { write: stake } = useContractWrite({
    address: MAG_TOKEN_ADDRESS,
    abi: magTokenABI,
    functionName: 'approve',
  });

  const calculateReward = (amount: string, period: number) => {
    const stakeValue = parseFloat(amount) || 0;
    const periodInYears = period / 365;
    return (stakeValue * config.annualAPY * periodInYears) / 100;
  };

  const handleStake = async () => {
    if (!stakeAmount) return;
    
    try {
      await stake({
        args: [MAG_TOKEN_ADDRESS, parseEther(stakeAmount)],
      });
    } catch (error) {
      console.error('Staking failed:', error);
    }
  };

  return (
    <div className="bg-white/30 backdrop-blur-lg rounded-2xl p-8 border border-[#FF7777]/20 transition-all duration-300 shadow-xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-2xl font-bold text-gray-800">MAG Staking Pool</h3>
          <p className="text-sm text-gray-600 mt-1">Stake MAG tokens to earn rewards</p>
        </div>
        <Coins className="w-10 h-10 text-[#FF7777]" />
      </div>

      <div className="space-y-6 mb-8">
        <div className="flex items-center justify-between p-4 bg-white/20 rounded-lg">
          <div className="flex items-center gap-3">
            <Lock className="w-5 h-5 text-[#FF7777]" />
            <span className="text-gray-700">Minimum Stake</span>
          </div>
          <span className="font-medium text-gray-800">{config.minimumStake} MAG</span>
        </div>

        <div className="flex items-center justify-between p-4 bg-white/20 rounded-lg">
          <div className="flex items-center gap-3">
            <Timer className="w-5 h-5 text-[#FF7777]" />
            <span className="text-gray-700">Lock Period</span>
          </div>
          <div className="flex gap-2">
            {config.lockPeriods.map((period) => (
              <button
                key={period}
                onClick={() => setSelectedLockPeriod(period)}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                  selectedLockPeriod === period
                    ? 'bg-[#FF7777] text-white'
                    : 'bg-white/50 text-gray-700 hover:bg-[#FF7777]/10'
                }`}
              >
                {period} Days
              </button>
            ))}
          </div>
        </div>

        {isConnected && (
          <div className="flex items-center justify-between p-4 bg-white/20 rounded-lg">
            <span className="text-gray-700">Your Balance</span>
            <span className="font-medium text-gray-800">
              {balance ? formatEther(balance) : '0'} MAG
            </span>
          </div>
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
                onClick={() => balance && setStakeAmount(formatEther(balance))}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-[#FF7777] hover:text-[#ff5555] font-medium"
              >
                MAX
              </button>
            </div>
          </div>

          {stakeAmount && (
            <div className="p-4 bg-white/20 rounded-lg">
              <div className="flex justify-between mb-2">
                <span className="text-gray-600">Estimated Reward</span>
                <span className="font-medium text-[#FF7777]">
                  {calculateReward(stakeAmount, selectedLockPeriod).toFixed(2)} MAG
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Lock Period</span>
                <span className="font-medium text-gray-800">{selectedLockPeriod} Days</span>
              </div>
            </div>
          )}

          <button
            onClick={handleStake}
            disabled={!stakeAmount || parseFloat(stakeAmount) < config.minimumStake}
            className="w-full bg-[#FF7777] hover:bg-[#ff5555] disabled:opacity-50 disabled:cursor-not-allowed text-white py-4 rounded-lg transition-colors font-semibold"
          >
            {parseFloat(stakeAmount) < config.minimumStake
              ? `Minimum stake is ${config.minimumStake} MAG`
              : 'Stake MAG'}
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