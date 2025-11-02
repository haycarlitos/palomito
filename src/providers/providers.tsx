"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PrivyProvider } from "@privy-io/react-auth";
import { WagmiProvider } from "@privy-io/wagmi";
import { wagmiConfig } from "@/config/wagmi";
import { LanguageProvider } from "@/contexts/language-context";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const queryClient = new QueryClient();

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <LanguageProvider>
      <PrivyProvider
        appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID!}
        clientId={process.env.NEXT_PUBLIC_PRIVY_CLIENT_ID!}
        config={{
          embeddedWallets: {
            ethereum: {
              createOnLogin: "users-without-wallets",
            },
          },
          appearance: { 
            walletChainType: "ethereum-only",
          },
          loginMethods: ["email", "wallet"],
        }}
      >
        <QueryClientProvider client={queryClient}>
          <WagmiProvider config={wagmiConfig}>
            {children}
            <ToastContainer
              position="top-center"
              autoClose={5000}
              hideProgressBar
              newestOnTop={false}
              closeOnClick={false}
              rtl={false}
              pauseOnFocusLoss
              draggable={false}
              pauseOnHover
              theme="light"
              style={{ zIndex: 9999 }}
            />
          </WagmiProvider>
        </QueryClientProvider>
      </PrivyProvider>
    </LanguageProvider>
  );
}
