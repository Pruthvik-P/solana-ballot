
"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useWallet } from "@solana/wallet-adapter-react";
import { useVoting, } from "../../hooks/useVoting";
import { ArrowLeft, User, Vote, CheckCircle, Clock, AlertCircle } from "lucide-react";
import Link from "next/link";

interface Candidate {
  id: number;
  name: string;
  votes: number;
  bio?: string;
}

interface VotingInterfaceProps {
  pollId: string;
}

export default function VotingInterface({ pollId }: VotingInterfaceProps) {
  const router = useRouter();
  const { connected, publicKey } = useWallet();
  const { vote, loading, getPollCandidates } = useVoting();

  const [poll, setPoll] = useState<any>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<number | null>(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [pollEnded, setPollEnded] = useState(false);

  // Mock poll data - in real app, fetch from Solana program
  useEffect(() => {
    const mockPoll = {
      id: parseInt(pollId),
      description: "Best Programming Language 2024",
      startTime: new Date(Date.now() - 24 * 60 * 60 * 1000),
      endTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      isActive: true,
      totalVotes: 150,
    };

    const mockCandidates: Candidate[] = [
      { id: 1, name: "JavaScript", votes: 65, bio: "The versatile language of the web" },
      { id: 2, name: "Python", votes: 50, bio: "Simple, readable, and powerful" },
      { id: 3, name: "Rust", votes: 35, bio: "Memory safe systems programming" },
    ];

    setPoll(mockPoll);
    setCandidates(mockCandidates);
    setPollEnded(new Date() > mockPoll.endTime);

    // Mock check if user has already voted
    setHasVoted(false);
  }, [pollId]);

  const refreshCandidates = useCallback(async () => {
  if (pollId) {
    const updatedCandidates = await getPollCandidates(pollId);
    setCandidates(updatedCandidates);
  }
}, [pollId, getPollCandidates]);

  const handleVote = async (candidateId: number) => {
    if (!selectedCandidate || !connected) return;

    setIsConfirming(true);
    try {
      const result = await vote(pollId, candidateId);
      if (result.success) {
        setHasVoted(true);
        await refreshCandidates()
        setCandidates(prev => 
          prev.map(c => 
            c.id === selectedCandidate 
              ? { ...c, votes: c.votes + 1 }
              : c
          )
        );
        // Update total votes
        setPoll((prev: any) => ({ ...prev, totalVotes: prev.totalVotes + 1 }));
      }
    } catch (error) {
      console.error("Voting error:", error);
    } finally {
      setIsConfirming(false);
    }
  };

  const totalVotes = candidates.reduce((sum, candidate) => sum + candidate.votes, 0);

  if (!connected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 py-12">
        <div className="max-w-2xl mx-auto px-4">
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <AlertCircle className="mx-auto h-12 w-12 text-yellow-500 mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Wallet Not Connected</h2>
            <p className="text-gray-600 mb-6">Please connect your wallet to vote.</p>
            <Link
              href="/"
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
            >
              Go Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!poll) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 py-12">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading poll...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <Link
            href={`/polls/${pollId}`}
            className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Poll Details
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{poll.description}</h1>
          <div className="flex items-center space-x-6 text-gray-600">
            <span className="flex items-center">
              <Vote className="w-4 h-4 mr-2" />
              {totalVotes} votes cast
            </span>
            <span className="flex items-center">
              <Clock className="w-4 h-4 mr-2" />
              {pollEnded ? "Poll ended" : "Active poll"}
            </span>
          </div>
        </div>

        {/* Voting Status */}
        {hasVoted && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-8">
            <div className="flex items-center">
              <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
              <span className="text-green-800 font-medium">
                Your vote has been successfully recorded!
              </span>
            </div>
          </div>
        )}

        {pollEnded && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-8">
            <div className="flex items-center">
              <Clock className="h-5 w-5 text-yellow-600 mr-2" />
              <span className="text-yellow-800 font-medium">
                This poll has ended. Voting is no longer available.
              </span>
            </div>
          </div>
        )}

        {/* Candidates */}
        <div className="space-y-4 mb-8">
          {candidates.map((candidate) => {
            const percentage = totalVotes > 0 ? (candidate.votes / totalVotes) * 100 : 0;
            const isSelected = selectedCandidate === candidate.id;

            return (
              <div
                key={candidate.id}
                className={`bg-white rounded-lg shadow-lg p-6 border-2 transition-all cursor-pointer ${
                  isSelected 
                    ? 'border-blue-500 ring-2 ring-blue-200' 
                    : 'border-gray-200 hover:border-gray-300'
                } ${hasVoted || pollEnded ? 'cursor-default' : 'cursor-pointer'}`}
                onClick={() => {
                  if (!hasVoted && !pollEnded) {
                    setSelectedCandidate(candidate.id);
                  }
                }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${
                      isSelected ? 'bg-blue-500 border-blue-500' : 'border-gray-300'
                    }`}>
                      {isSelected && <div className="w-2 h-2 bg-white rounded-full m-0.5"></div>}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">{candidate.name}</h3>
                      {candidate.bio && (
                        <p className="text-gray-600 text-sm">{candidate.bio}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-gray-900">{candidate.votes}</div>
                    <div className="text-sm text-gray-600">votes ({percentage.toFixed(1)}%)</div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${percentage}%` }}
                  ></div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Vote Button */}
        {!hasVoted && !pollEnded && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">Cast Your Vote</h3>
                <p className="text-gray-600">
                  {selectedCandidate 
                    ? `You selected: ${candidates.find(c => c.id === selectedCandidate)?.name}`
                    : "Select a candidate above to vote"
                  }
                </p>
              </div>
              <button
                onClick={handleVote}
                disabled={!selectedCandidate || loading || isConfirming}
                className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
              >
                <Vote className="w-4 h-4" />
                <span>
                  {isConfirming ? "Confirming..." : loading ? "Processing..." : "Cast Vote"}
                </span>
              </button>
            </div>
          </div>
        )}

        {/* Connected Wallet Info */}
        <div className="mt-6 bg-white rounded-lg shadow p-4">
          <div className="flex items-center text-sm text-gray-600">
            <User className="w-4 h-4 mr-2" />
            <span>
              Voting as: {publicKey?.toString().substring(0, 8)}...
              {publicKey?.toString().substring(36)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
