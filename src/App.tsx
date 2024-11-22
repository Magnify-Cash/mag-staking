import { createConfig, WagmiProvider, useAccount, useDisconnect } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { mainnet } from "wagmi/chains";
import { Coins } from "lucide-react";
import StakingPool from "./components/StakingPool";
import { ConnectKitProvider, getDefaultConfig, ConnectKitButton } from "connectkit";

const config = createConfig(
  getDefaultConfig({
    // Your dApps chains
    chains: [mainnet],

    // Required API Keys
    walletConnectProjectId: "",

    // Required App Info
    appName: "Magnify.Cash",

    // Optional App Info
    appDescription: "Decentralized Credit Markets",
    appUrl: "https://magnify.cash",
    appIcon:
      "https://cdn.prod.website-files.com/6642383304e03808c6c1b5dd/664507a2a06009cee4e7ddcd_Square%20with%20Rounded%20Corners%20(Gradient)%20(3).svg",
  }),
);

const queryClient = new QueryClient();

const poolConfig = {
  totalPoolSize: 10_000_000,
  annualAPY: 30,
  rewardPeriod: 12,
  monthlyReward: 250_000,
  minimumStake: 100,
  lockPeriods: [30, 60, 90],
};

function StakingDapp() {
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#2DFFF9] via-[#DAEFFF] to-[#FF7777] text-gray-800">
      <nav className="p-6 flex justify-between items-center backdrop-blur-md bg-white/10">
        <div className="flex items-center space-x-2">
          <Coins className="w-8 h-8 text-[#FF7777]" />
          <h1 className="text-2xl font-bold">MAG Staking</h1>
        </div>
        {isConnected ? (
          <div className="flex items-center space-x-4">
            <span className="text-sm bg-white/20 px-3 py-1 rounded-lg">
              {address?.slice(0, 6)}...{address?.slice(-4)}
            </span>
            <button
              onClick={() => disconnect()}
              className="bg-[#FF7777] hover:bg-[#ff5555] text-white px-4 py-2 rounded-lg transition-colors"
            >
              Disconnect
            </button>
          </div>
        ) : (
          <ConnectKitButton.Custom>
            {({ show }) => {
              return (
                <button
                  onClick={show}
                  className="bg-[#FF7777] hover:bg-[#ff5555] text-white px-6 py-2 rounded-lg transition-colors font-semibold"
                >
                  Connect Wallet
                </button>
              );
            }}
          </ConnectKitButton.Custom>
        )}
      </nav>

      <main className="container mx-auto px-6 py-12">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4">MAG Token Staking Pool</h2>
          <p className="text-gray-700 max-w-2xl mx-auto">
            Stake your MAG tokens to earn rewards and participate in the ecosystem's growth. With a{" "}
            {poolConfig.annualAPY}% APY and flexible lock periods, maximize your token utility.
          </p>
        </div>

        <div className="max-w-2xl mx-auto">
          <StakingPool config={poolConfig} isConnected={isConnected} address={address} />
        </div>

        <div className="mt-16 bg-white/30 backdrop-blur-lg rounded-2xl p-8 border border-[#FF7777]/20 max-w-4xl mx-auto">
          <h3 className="text-2xl font-bold mb-6">Pool Statistics</h3>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="space-y-2">
              <p className="text-2xl font-bold text-[#FF7777]">{poolConfig.totalPoolSize.toLocaleString()}</p>
              <p className="text-sm text-gray-600">Total Pool Size (MAG)</p>
            </div>
            <div className="space-y-2">
              <p className="text-2xl font-bold text-[#FF7777]">{poolConfig.monthlyReward.toLocaleString()}</p>
              <p className="text-sm text-gray-600">Monthly Rewards (MAG)</p>
            </div>
            <div className="space-y-2">
              <p className="text-2xl font-bold text-[#FF7777]">{poolConfig.annualAPY}%</p>
              <p className="text-sm text-gray-600">Annual APY</p>
            </div>
          </div>
        </div>
      </main>

      <footer className="text-center py-6 text-gray-600 backdrop-blur-md bg-white/10">
        <p>© 2024 MAG Staking. All rights reserved.</p>
      </footer>
    </div>
  );
}

function App() {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <ConnectKitProvider>
          <StakingDapp />
        </ConnectKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

export default App;
