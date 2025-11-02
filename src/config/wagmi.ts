import { createConfig } from "@privy-io/wagmi";
import { base, arbitrum, scroll } from "viem/chains";
import { http } from "wagmi";

export const wagmiConfig = createConfig({
  chains: [scroll, base, arbitrum], // Scroll is first, making it the default chain
  transports: {
    [scroll.id]: http(),
    [base.id]: http(),
    [arbitrum.id]: http(),
  },
});

