"use client";

import React, { FC, ReactNode, useMemo } from "react";
import {
  ConnectionProvider,
  WalletProvider,
} from "@solana/wallet-adapter-react";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
  TorusWalletAdapter,
} from "@solana/wallet-adapter-wallets";
import { BackpackWalletAdapter } from '@solana/wallet-adapter-backpack';

import { clusterApiUrl } from "@solana/web3.js";

import "@solana/wallet-adapter-react-ui/styles.css";

interface SolanaProviderProps {
  children: ReactNode;
}

export const SolanaProvider: FC<SolanaProviderProps> = ({ children }) => {
  // Enhanced network detection
  const network = useMemo(() => {
    const networkEnv = process.env.NEXT_PUBLIC_SOLANA_NETWORK;
    
    // Handle local development
    if (networkEnv === 'localhost' || networkEnv === 'localnet') {
      return 'localhost' as any; // Local validator
    }
    
    switch (networkEnv) {
      case 'mainnet-beta':
        return WalletAdapterNetwork.Mainnet;
      case 'testnet':
        return WalletAdapterNetwork.Testnet;
      case 'devnet':
      default:
        return WalletAdapterNetwork.Devnet;
    }
  }, []);

  // Enhanced endpoint configuration
  const endpoint = useMemo(() => {
    // Priority 1: Custom RPC host from environment
    if (process.env.NEXT_PUBLIC_SOLANA_RPC_HOST) {
      return process.env.NEXT_PUBLIC_SOLANA_RPC_HOST;
    }
    
    // Priority 2: Local validator detection
    if (network === 'localhost') {
      return 'http://127.0.0.1:8899';
    }
    
    // Priority 3: Default cluster URLs
    return clusterApiUrl(network);
  }, [network]);

  const wallets = useMemo(
    () => [
  new PhantomWalletAdapter(),
  new SolflareWalletAdapter({ network }),
  new TorusWalletAdapter(),
  new BackpackWalletAdapter(),
    ],
    [network]
  );

  // Enhanced connection config for local development
  const connectionConfig = useMemo(() => ({
    commitment: 'confirmed' as const,
    confirmTransactionInitialTimeout: 60000,
    // Additional config for local development
    ...(network === 'localhost' && {
      wsEndpoint: undefined, // Disable websocket for local
      httpHeaders: {
        'Cache-Control': 'no-cache',
      },
    }),
  }), [network]);

  return (
    <ConnectionProvider endpoint={endpoint} config={connectionConfig}>
      <WalletProvider 
        wallets={wallets} 
        autoConnect={false} // Set to false for local testing
        onError={(error) => {
          console.error('Wallet error:', error);
          if (network === 'localhost') {
            console.log('💡 Make sure your wallet is connected to localhost:8899');
          }
        }}
      >
        <WalletModalProvider>
          {children}
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};
