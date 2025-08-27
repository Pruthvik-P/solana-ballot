
"use client";

import { useState, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useVoting } from "@/hooks/useVoting";
import { Vote, Users, TrendingUp, Clock, BarChart3 } from "lucide-react";
import Link from "next/link";
import WalletButton from "@/components/ui/WalletButton";
import ClientOnly from "@/components/ui/ClientOnly";
import InitializeProgram from "@/components/ui/InitializeProgram";

export default function Home() {
  const { connected, publicKey } = useWallet();
  const { initialize, loading } = useVoting();
  const [stats, setStats] = useState({
    totalPolls: 0,
    activePolls: 0,
    totalVotes: 0,
    totalUsers: 0,
  });

  useEffect(() => {
    // Simulate loading stats - in real app, fetch from program
    setStats({
      totalPolls: 12,
      activePolls: 3,
      totalVotes: 1247,
      totalUsers: 892,
    });
  }, []);

  const handleInitialize = async () => {
    await initialize();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <Vote className="h-8 w-8 text-blue-600" />
              <h1 className="text-2xl font-bold text-gray-900">Solana Ballot Box</h1>
            </div>

            <nav className="hidden md:flex space-x-8">
              <Link href="/polls" className="text-gray-600 hover:text-blue-600 font-medium">
                All Polls
              </Link>
              <Link href="/polls/create" className="text-gray-600 hover:text-blue-600 font-medium">
                Create Poll
              </Link>
              <Link href="/candidates/register" className="text-gray-600 hover:text-blue-600 font-medium">
                Register
              </Link>
            </nav>

            {/* Wrap wallet button to prevent hydration mismatch */}
            <ClientOnly
              fallback={
                <button className="bg-blue-600 text-white font-bold py-2 px-4 rounded-lg opacity-50">
                  Loading...
                </button>
              }
            >
              <WalletButton className="!bg-blue-600 hover:!bg-blue-700 !rounded-lg" />
            </ClientOnly>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <ClientOnly
          fallback={
            <div className="text-center">
              <div className="animate-pulse">
                <div className="h-8 bg-gray-200 rounded w-3/4 mx-auto mb-4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto"></div>
              </div>
            </div>
          }
        >
          {!connected ? (
            <div className="text-center">
              <Vote className="mx-auto h-24 w-24 text-blue-600 mb-8" />
              <h2 className="text-4xl font-bold text-gray-900 mb-4">
                Welcome to Solana Ballot Box
              </h2>
              <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
                A decentralized voting platform built on Solana blockchain. Create polls, 
                register as candidates, and vote with transparency and security.
              </p>

              <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto mb-12">
                <div className="bg-white p-6 rounded-lg shadow-lg">
                  <Vote className="h-12 w-12 text-blue-600 mx-auto mb-4" />
                  <h3 className="text-xl font-bold mb-2">Secure Voting</h3>
                  <p className="text-gray-600">Vote securely using blockchain technology</p>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-lg">
                  <Users className="h-12 w-12 text-green-600 mx-auto mb-4" />
                  <h3 className="text-xl font-bold mb-2">Fair Elections</h3>
                  <p className="text-gray-600">Transparent and tamper-proof election process</p>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-lg">
                  <BarChart3 className="h-12 w-12 text-purple-600 mx-auto mb-4" />
                  <h3 className="text-xl font-bold mb-2">Real-time Results</h3>
                  <p className="text-gray-600">View live results as votes are cast</p>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-lg p-8 max-w-md mx-auto">
                <h3 className="text-lg font-semibold mb-4">Connect Your Wallet to Get Started</h3>
                <WalletButton className="!bg-blue-600 hover:!bg-blue-700 !w-full !rounded-lg" />
                <p className="text-sm text-gray-500 mt-4">
                  Supports Phantom, Solflare, and other Solana wallets
                </p>
              </div>
            </div>
          ) : (
            <div>
              {/* Welcome Section */}
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-gray-900 mb-4">
                  Welcome back!
                </h2>
                <p className="text-gray-600">
                  Connected as: {publicKey?.toString().substring(0, 8)}...
                  {publicKey?.toString().substring(36)}
                </p>
              </div>

              {/* Program Initialization Section - MOST IMPORTANT */}
              <div className="mb-12">
                <InitializeProgram />
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                <div className="bg-white rounded-lg shadow-lg p-6">
                  <div className="flex items-center">
                    <Vote className="h-8 w-8 text-blue-600 mr-3" />
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Polls</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.totalPolls}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-lg shadow-lg p-6">
                  <div className="flex items-center">
                    <Clock className="h-8 w-8 text-green-600 mr-3" />
                    <div>
                      <p className="text-sm font-medium text-gray-600">Active Polls</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.activePolls}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-lg shadow-lg p-6">
                  <div className="flex items-center">
                    <TrendingUp className="h-8 w-8 text-purple-600 mr-3" />
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Votes</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.totalVotes}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-lg shadow-lg p-6">
                  <div className="flex items-center">
                    <Users className="h-8 w-8 text-orange-600 mr-3" />
                    <div>
                      <p className="text-sm font-medium text-gray-600">Participants</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.totalUsers}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Link
                  href="/polls"
                  className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow group block"
                >
                  <Vote className="h-12 w-12 text-blue-600 mb-4 group-hover:scale-110 transition-transform" />
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Browse Polls</h3>
                  <p className="text-gray-600">View and participate in active polls</p>
                </Link>

                <Link
                  href="/polls/create"
                  className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow group block"
                >
                  <TrendingUp className="h-12 w-12 text-green-600 mb-4 group-hover:scale-110 transition-transform" />
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Create Poll</h3>
                  <p className="text-gray-600">Start a new poll for your community</p>
                </Link>

                <Link
                  href="/candidates/register"
                  className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow group block"
                >
                  <Users className="h-12 w-12 text-purple-600 mb-4 group-hover:scale-110 transition-transform" />
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Register as Candidate</h3>
                  <p className="text-gray-600">Run for election in existing polls</p>
                </Link>
              </div>
            </div>
          )}
        </ClientOnly>
      </main>
    </div>
  );
}
