
"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useWallet } from "@solana/wallet-adapter-react";
import { useVoting } from "@/hooks/useVoting";
import { ArrowLeft, Vote as VoteIcon, Users, Clock, CheckCircle, AlertCircle, RefreshCw, User, Shield } from "lucide-react";
import Link from "next/link";
import { PollCardData, CandidateData } from "@/types";

export default function VotePage() {
  const params = useParams();
  const router = useRouter();
  const { connected, publicKey } = useWallet();
  const { getPoll, getPollCandidates, hasUserVoted, vote, loading } = useVoting();

  const pollId = parseInt(params.id as string);
  const [poll, setPoll] = useState<PollCardData | null>(null);
  const [candidates, setCandidates] = useState<CandidateData[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<number | null>(null);
  const [userHasVoted, setUserHasVoted] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState("");
  const [pollStatus, setPollStatus] = useState<'upcoming' | 'active' | 'ended'>('active');
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [voteSuccess, setVoteSuccess] = useState(false);

  // ✅ FIXED: Load real poll and candidate data from blockchain
  const loadPollData = async () => {
    if (!pollId || isNaN(pollId)) {
      setError("Invalid poll ID");
      setPageLoading(false);
      return;
    }

    setPageLoading(true);
    setError(null);

    try {
      console.log(`📊 Loading vote page for poll ${pollId} from blockchain...`);

      // ✅ FIXED: Fetch real poll data from blockchain
      const pollData = await getPoll(pollId);
      if (!pollData) {
        setError(`Poll #${pollId} does not exist on the blockchain`);
        setPageLoading(false);
        return;
      }

      console.log("📋 Real poll data from blockchain:", pollData);

      // ✅ FIXED: Convert blockchain timestamps to JavaScript dates
      let startTime: Date, endTime: Date;

      try {
        const startTimestamp = pollData.start && typeof pollData.start.toNumber === 'function' 
          ? pollData.start.toNumber() 
          : (typeof pollData.start === 'number' ? pollData.start : 0);

        const endTimestamp = pollData.end && typeof pollData.end.toNumber === 'function'
          ? pollData.end.toNumber()
          : (typeof pollData.end === 'number' ? pollData.end : 0);

        console.log("🕐 Timestamp conversion for voting:", {
          raw_start: pollData.start,
          raw_end: pollData.end,
          converted_start: startTimestamp,
          converted_end: endTimestamp
        });

        startTime = new Date(startTimestamp * 1000);
        endTime = new Date(endTimestamp * 1000);

        if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
          console.error("❌ Invalid date conversion for voting");
          startTime = new Date();
          endTime = new Date();
        }

      } catch (dateError) {
        console.error("❌ Error converting timestamps:", dateError);
        startTime = new Date();
        endTime = new Date();
      }

      const now = new Date();
      let status: 'upcoming' | 'active' | 'ended' = 'active';
      if (now < startTime) status = 'upcoming';
      else if (now > endTime) status = 'ended';

      const candidateCount = pollData.candidates && typeof pollData.candidates.toNumber === 'function'
        ? pollData.candidates.toNumber()
        : (typeof pollData.candidates === 'number' ? pollData.candidates : 0);

      const pollCardData: PollCardData = {
        id: pollId,
        title: `Poll #${pollId}`,
        description: pollData.description || `Poll ${pollId}`,
        startTime: startTime,
        endTime: endTime,
        candidateCount: candidateCount,
        totalVotes: 0,
        isActive: status === 'active',
        status: status === 'upcoming' ? 'draft' : status
      };

      setPoll(pollCardData);
      setPollStatus(status);

      // ✅ FIXED: Fetch real candidates from blockchain
      console.log(`👥 Loading real candidates for poll ${pollId}...`);
      const candidatesData = await getPollCandidates(pollId);
      console.log(`✅ Loaded ${candidatesData.length} real candidates:`, candidatesData);

      setCandidates(candidatesData);

      // Update total votes
      const totalVotes = candidatesData.reduce((sum, candidate) => sum + candidate.votes, 0);
      setPoll(prev => prev ? { ...prev, totalVotes } : null);

      // Check if user has voted
      if (connected && publicKey) {
        try {
          const voted = await hasUserVoted(pollId);
          setUserHasVoted(voted);
          console.log(`🗳️ User has voted: ${voted}`);
        } catch (voteError) {
          console.error("❌ Error checking vote status:", voteError);
          setUserHasVoted(false);
        }
      }

      console.log(`✅ Successfully loaded voting data for poll ${pollId}`);
    } catch (error) {
      console.error(`❌ Error loading poll ${pollId} for voting:`, error);
      setError(`Failed to load poll data: ${error}`);
    } finally {
      setPageLoading(false);
    }
  };

  useEffect(() => {
    loadPollData();
  }, [pollId, connected, publicKey]);

  // Update time remaining
  useEffect(() => {
    if (!poll) return;

    const updateTimer = () => {
      const now = new Date();
      const end = new Date(poll.endTime);

      if (now > end) {
        setTimeRemaining("Voting has ended");
        return;
      }

      const diff = end.getTime() - now.getTime();
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      if (days > 0) {
        setTimeRemaining(`${days}d ${hours}h ${minutes}m remaining`);
      } else if (hours > 0) {
        setTimeRemaining(`${hours}h ${minutes}m remaining`);
      } else {
        setTimeRemaining(`${minutes}m remaining`);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 60000);
    return () => clearInterval(interval);
  }, [poll]);

  const handleVote = async () => {
    if (!connected) {
      alert("Please connect your wallet to vote");
      return;
    }

    if (!selectedCandidate) {
      alert("Please select a candidate to vote for");
      return;
    }

    if (userHasVoted) {
      alert("You have already voted in this poll");
      return;
    }

    if (pollStatus !== 'active') {
      alert("Voting is not currently active for this poll");
      return;
    }

    setIsSubmitting(true);

    try {
      console.log(`🗳️ Submitting vote for candidate ${selectedCandidate} in poll ${pollId}`);

      const result = await vote(pollId, selectedCandidate);

      if (result?.success) {
        console.log("✅ Vote cast successfully:", result);
        setVoteSuccess(true);
        setUserHasVoted(true);

        // Refresh poll data to show updated vote counts
        setTimeout(() => {
          loadPollData();
        }, 2000);

        setTimeout(() => {
          router.push(`/polls/${pollId}`);
        }, 4000);
      } else {
        console.error("❌ Vote failed:", result?.error);
        alert(`Failed to cast vote: ${result?.error || "Unknown error occurred"}`);
      }
    } catch (error) {
      console.error("❌ Unexpected voting error:", error);
      alert(`An error occurred while voting: ${error}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalVotes = candidates.reduce((sum, candidate) => sum + candidate.votes, 0);

  if (!connected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 py-12">
        <div className="max-w-2xl mx-auto px-4">
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <AlertCircle className="mx-auto h-12 w-12 text-yellow-500 mb-4" />
            <h2 className="text-2xl font-bold text-slate-800 mb-4">Wallet Not Connected</h2>
            <p className="text-slate-600 mb-6">Please connect your wallet to participate in voting.</p>
            <Link
              href="/"
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg btn-animate"
            >
              Connect Wallet & Return Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (pageLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 py-12">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center">
            <RefreshCw className="mx-auto h-8 w-8 text-blue-600 animate-spin mb-4" />
            <p className="text-slate-600">Loading poll data from blockchain...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !poll) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 py-12">
        <div className="max-w-4xl mx-auto px-4">
          <Link
            href="/polls"
            className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to All Polls
          </Link>

          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Poll Not Found</h2>
            <p className="text-slate-600 mb-4">{error}</p>
            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={loadPollData}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg flex items-center justify-center"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </button>
              <Link
                href="/polls"
                className="flex-1 bg-gray-300 hover:bg-gray-400 text-slate-800 font-bold py-2 px-4 rounded-lg text-center"
              >
                Browse All Polls
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (voteSuccess) {
    const selectedCandidateData = candidates.find(c => c.id === selectedCandidate);

    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 py-12">
        <div className="max-w-2xl mx-auto px-4">
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <CheckCircle className="mx-auto h-16 w-16 text-green-500 mb-6" />
            <h2 className="text-2xl font-bold text-slate-800 mb-4">Vote Cast Successfully! 🎉</h2>
            <p className="text-slate-600 mb-6">
              Your vote for <strong>{selectedCandidateData?.name}</strong> has been recorded on the Solana blockchain.
            </p>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <div className="text-left">
                <p className="text-green-800 text-sm">
                  <strong>📊 Poll:</strong> {poll.title}<br/>
                  <strong>🗳️ Voted For:</strong> {selectedCandidateData?.name}<br/>
                  <strong>🔗 Voter:</strong> {publicKey?.toString().substring(0, 8)}...{publicKey?.toString().substring(-8)}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <Link
                href={`/polls/${pollId}`}
                className="block bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg btn-animate"
              >
                View Poll Results
              </Link>
              <Link
                href="/polls"
                className="block bg-gray-300 hover:bg-gray-400 text-slate-800 font-bold py-2 px-4 rounded-lg btn-animate"
              >
                Browse Other Polls
              </Link>
            </div>

            <p className="text-xs text-slate-500 mt-4">
              Redirecting to poll results in 4 seconds...
            </p>
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
            className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-4 btn-animate"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Poll Details
          </Link>

          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-3xl font-bold text-slate-800 mb-2">{poll.title}</h1>
                <p className="text-slate-600 text-lg">{poll.description}</p>
              </div>
              <div className="text-right">
                <div className="flex items-center text-slate-600 mb-2">
                  <VoteIcon className="w-5 h-5 mr-2" />
                  <span className="text-2xl font-bold text-slate-800">{totalVotes}</span>
                  <span className="text-sm ml-1">votes cast</span>
                </div>
                <div className="flex items-center text-slate-600 mb-2">
                  <Users className="w-4 h-4 mr-2" />
                  <span className="text-sm">{candidates.length} candidates</span>
                </div>
                <div className="flex items-center text-slate-600">
                  <Clock className="w-4 h-4 mr-2" />
                  <span className="text-sm">{timeRemaining}</span>
                </div>
              </div>
            </div>

            {/* Status Messages */}
            {userHasVoted && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                <div className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                  <span className="text-green-800 font-medium">
                    You have already voted in this poll. Thank you for participating!
                  </span>
                </div>
              </div>
            )}

            {pollStatus === 'ended' && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                <div className="flex items-center">
                  <Clock className="h-5 w-5 text-yellow-600 mr-2" />
                  <span className="text-yellow-800 font-medium">
                    This poll has ended. Voting is no longer available.
                  </span>
                </div>
              </div>
            )}

            {pollStatus === 'upcoming' && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <div className="flex items-center">
                  <Clock className="h-5 w-5 text-blue-600 mr-2" />
                  <span className="text-blue-800 font-medium">
                    Voting has not started yet. Please wait until the poll begins.
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Voting Instructions */}
        {!userHasVoted && pollStatus === 'active' && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
            <h3 className="text-lg font-bold text-blue-900 mb-4 flex items-center">
              <Shield className="w-5 h-5 mr-2" />
              Secure Blockchain Voting
            </h3>
            <ul className="text-blue-800 text-sm space-y-1">
              <li>• Select your preferred candidate below</li>
              <li>• Your vote will be recorded on the Solana blockchain</li>
              <li>• Each wallet can only vote once per poll</li>
              <li>• Voting is anonymous and tamper-proof</li>
            </ul>
          </div>
        )}

        {/* Candidates Section */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-bold text-slate-800 mb-6">
            {userHasVoted || pollStatus !== 'active' ? 'Current Results' : 'Select Your Candidate'}
          </h2>

          {candidates.length === 0 ? (
            <div className="text-center py-8">
              <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-slate-800 mb-2">No Candidates Available</h3>
              <p className="text-slate-600 mb-4">
                This poll doesn&apos;t have any candidates yet.
              </p>
              <Link
                href="/candidates/register"
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg"
              >
                Be the First Candidate
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {candidates.map((candidate) => {
                const percentage = totalVotes > 0 ? (candidate.votes / totalVotes) * 100 : 0;
                const isSelected = selectedCandidate === candidate.id;

                return (
                  <div 
                    key={candidate.id}
                    className={`border rounded-lg p-6 cursor-pointer transition-all ${
                      userHasVoted || pollStatus !== 'active'
                        ? 'border-gray-200 bg-gray-50'
                        : isSelected 
                        ? 'border-blue-500 bg-blue-50 shadow-md' 
                        : 'border-gray-200 hover:border-blue-300 hover:shadow-sm'
                    }`}
                    onClick={() => {
                      if (!userHasVoted && pollStatus === 'active') {
                        setSelectedCandidate(candidate.id);
                      }
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        {!userHasVoted && pollStatus === 'active' && (
                          <input
                            type="radio"
                            name="candidate"
                            checked={isSelected}
                            onChange={() => setSelectedCandidate(candidate.id)}
                            className="w-4 h-4 text-blue-600"
                          />
                        )}
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                          {candidate.id}
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-slate-800">{candidate.name}</h3>
                          <p className="text-slate-600 text-sm mt-1">
                            {candidate.bio || `Candidate for ${poll.title}`}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-3xl font-bold text-slate-800">{candidate.votes}</div>
                        <div className="text-sm text-slate-600">{percentage.toFixed(1)}%</div>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-4">
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div
                          className="bg-gradient-to-r from-blue-500 to-purple-600 h-3 rounded-full transition-all duration-500"
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Vote Button */}
        {!userHasVoted && pollStatus === 'active' && candidates.length > 0 && (
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h3 className="text-xl font-bold text-slate-800 mb-4">Ready to Vote?</h3>
            {selectedCandidate ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                <div className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                  <span className="text-green-800">
                    You selected: <strong>{candidates.find(c => c.id === selectedCandidate)?.name}</strong>
                  </span>
                </div>
              </div>
            ) : (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                <div className="flex items-center">
                  <AlertCircle className="h-5 w-5 text-yellow-600 mr-2" />
                  <span className="text-yellow-800">
                    Please select a candidate above to continue
                  </span>
                </div>
              </div>
            )}

            <button
              onClick={handleVote}
              disabled={!selectedCandidate || isSubmitting}
              className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 px-6 rounded-lg transition-colors flex items-center justify-center"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                  Casting Vote...
                </>
              ) : (
                <>
                  <VoteIcon className="w-5 h-5 mr-2" />
                  Cast My Vote
                </>
              )}
            </button>
          </div>
        )}

        {/* Connected Wallet Info */}
        <div className="mt-8 bg-white rounded-lg shadow p-4">
          <div className="flex items-center text-sm text-slate-600">
            <User className="w-4 h-4 mr-2" />
            <span>
              Voting as: {publicKey?.toString().substring(0, 8)}...
              {publicKey?.toString().substring(-8)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
