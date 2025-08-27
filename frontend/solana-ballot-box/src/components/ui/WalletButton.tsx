
"use client";

import dynamic from 'next/dynamic';
import { ComponentProps } from 'react';

// Dynamically import WalletMultiButton with no SSR
const WalletMultiButtonDynamic = dynamic(
  () => import('@solana/wallet-adapter-react-ui').then((mod) => mod.WalletMultiButton),
  {
    ssr: false,
    loading: () => (
      <button className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg">
        Loading Wallet...
      </button>
    ),
  }
);

interface WalletButtonProps extends ComponentProps<typeof WalletMultiButtonDynamic> {
  className?: string;
}

export default function WalletButton({ className, ...props }: WalletButtonProps) {
  return <WalletMultiButtonDynamic className={className} {...props} />;
}
