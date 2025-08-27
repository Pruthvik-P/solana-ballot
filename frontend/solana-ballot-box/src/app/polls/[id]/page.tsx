
"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useWallet } from "@solana/wallet-adapter-react";
import { useVoting } from "@/hooks/useVoting";
import { ArrowLeft, Vote, Users, Clock, Calendar, User, TrendingUp, CheckCircle, AlertCircle, RefreshCw, Home } from "lucide-react";
import Link from "next/link";
import { PollCardData, CandidateData } from "@/types";

export default function PollDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { connected, publicKey } = useWallet();
  const { getPoll, getPollCandidates, hasUserVoted, loading, pollExists, getAllPolls } = useVoting();

  const pollId = parseInt(params.id as string);
  const [poll, setPoll] = useState<PollCardData | null>(null);
  const [candidates, setCandidates] = useState<CandidateData[]>([]);
  const [userHasVoted, setUserHasVoted] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState("");
  const [pollStatus, setPollStatus] = useState<'upcoming' | 'active' | 'ended'>('active');
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [availablePolls, setAvailablePolls] = useState<number[]>([]);

  // Load available polls for suggestions
  const loadAvailablePolls = async () => {
    try {
      const polls = await getAllPolls();
      const pollIds = polls.map(p => p.id).sort((a, b) => a - b);
      setAvailablePolls(pollIds);
    } catch (error) {
      console.error("Error loading available polls:", error);
    }
  };

  // ✅ ENHANCED: Load poll data with better error handling and candidate fetching
  const loadPollData = async () => {
    if (!pollId || isNaN(pollId)) {
      setError("Invalid poll ID");
      setPageLoading(false);
      return;
    }

    setPageLoading(true);
    setError(null);

    try {
      console.log(`📊 Loading poll ${pollId} from blockchain...`);

      // First check if poll exists
      const exists = await pollExists(pollId);
      if (!exists) {
        console.log(`❌ Poll ${pollId} does not exist`);
        setError(`Poll #${pollId} does not exist on the blockchain`);
        await loadAvailablePolls();
        setPageLoading(false);
        return;
      }

      // ✅ ENHANCED: Fetch poll data from blockchain with better error handling
      const pollData = await getPoll(pollId);
      if (!pollData) {
        setError(`Failed to load poll #${pollId} data`);
        setPageLoading(false);
        return;
      }

      console.log("📋 Raw poll data from blockchain:", pollData);

      // ✅ ENHANCED: Safer timestamp conversion with validation
      let startTime: Date, endTime: Date;

      try {
        const startTimestamp = pollData.start && typeof pollData.start.toNumber === 'function' 
          ? pollData.start.toNumber() 
          : (typeof pollData.start === 'number' ? pollData.start : 0);

        const endTimestamp = pollData.end && typeof pollData.end.toNumber === 'function'
          ? pollData.end.toNumber()
          : (typeof pollData.end === 'number' ? pollData.end : 0);

        console.log("🕐 Timestamp conversion:", {
          raw_start: pollData.start,
          raw_end: pollData.end,
          converted_start: startTimestamp,
          converted_end: endTimestamp,
          are_different: startTimestamp !== endTimestamp
        });

        // Convert Unix seconds to JavaScript Date objects
        startTime = new Date(startTimestamp * 1000);
        endTime = new Date(endTimestamp * 1000);

        console.log("📅 Converted to dates:", {
          startTime_iso: startTime.toISOString(),
          endTime_iso: endTime.toISOString(),
          startTime_ist: startTime.toLocaleString('en-IN', {timeZone: 'Asia/Kolkata'}),
          endTime_ist: endTime.toLocaleString('en-IN', {timeZone: 'Asia/Kolkata'}),
          times_are_different: startTime.getTime() !== endTime.getTime()
        });

        // ✅ CRITICAL CHECK: Validate converted times
        if (startTime.getTime() === endTime.getTime()) {
          console.error("🚨 CRITICAL: Start and end times are identical after conversion!");
          console.error("Raw timestamps:", { start: startTimestamp, end: endTimestamp });
        }

        if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
          console.error("❌ Invalid date conversion");
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
        totalVotes: 0, // Will be calculated from candidates
        isActive: status === 'active',
        status: status === 'upcoming' ? 'draft' : status
      };

      setPoll(pollCardData);
      setPollStatus(status);

      // ✅ ENHANCED: Fetch candidates with detailed logging
      console.log(`👥 Loading candidates for poll ${pollId}...`);
      console.log(`Expected candidate count: ${candidateCount}`);

      try {
        const candidatesData = await getPollCandidates(pollId);
        console.log(`✅ Loaded ${candidatesData.length} candidates:`, candidatesData);

        setCandidates(candidatesData);

        // Update total votes in poll data
        const totalVotes = candidatesData.reduce((sum, candidate) => sum + candidate.votes, 0);
        setPoll(prev => prev ? { ...prev, totalVotes } : null);

        if (candidatesData.length === 0) {
          console.log("ℹ️ No candidates found for this poll");
        }

      } catch (candidateError) {
        console.error("❌ Error loading candidates:", candidateError);
        setCandidates([]);
      }

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

      console.log(`✅ Successfully loaded poll ${pollId}`);
    } catch (error) {
      console.error(`❌ Error loading poll ${pollId}:`, error);
      setError(`Failed to load poll data: ${error}`);
      await loadAvailablePolls();
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
      const start = new Date(poll.startTime);
      const end = new Date(poll.endTime);

      if (now < start) {
        const diff = start.getTime() - now.getTime();
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        setTimeRemaining(`Starts in ${days}d ${hours}h`);
        return;
      }

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

  const totalVotes = candidates.reduce((sum, candidate) => sum + candidate.votes, 0);

  const getStatusIcon = () => {
    switch (pollStatus) {
      case 'upcoming': return Calendar;
      case 'active': return CheckCircle;
      case 'ended': return Clock;
    }
  };

  const getStatusColor = () => {
    switch (pollStatus) {
      case 'upcoming': return 'text-yellow-600 bg-yellow-50';
      case 'active': return 'text-green-600 bg-green-50';
      case 'ended': return 'text-gray-600 bg-gray-50';
    }
  };

  if (pageLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 py-12">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center">
            <RefreshCw className="mx-auto h-8 w-8 text-blue-600 animate-spin mb-4" />
            <p className="text-gray-600">Loading poll details from blockchain...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
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

          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="text-center mb-6">
              <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Poll Not Found</h2>
              <p className="text-gray-600 mb-4">{error}</p>
            </div>

            {availablePolls.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <h3 className="font-medium text-blue-900 mb-2">Available Polls:</h3>
                <div className="flex flex-wrap gap-2">
                  {availablePolls.map(id => (
                    <Link
                      key={id}
                      href={`/polls/${id}`}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm"
                    >
                      Poll #{id}
                    </Link>
                  ))}
                </div>
              </div>
            )}

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
                className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 font-bold py-2 px-4 rounded-lg text-center"
              >
                Browse All Polls
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!poll) {
    return null;
  }

  const StatusIcon = getStatusIcon();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/polls"
            className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-4 btn-animate"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to All Polls
          </Link>

          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between">
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-gray-900 mb-4">{poll.title}</h1>
                <p className="text-gray-600 text-lg mb-6">{poll.description}</p>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center text-gray-600 mb-2">
                      <Vote className="w-4 h-4 mr-2" />
                      <span className="text-sm font-medium">Total Votes</span>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{totalVotes}</p>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center text-gray-600 mb-2">
                      <Users className="w-4 h-4 mr-2" />
                      <span className="text-sm font-medium">Candidates</span>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{candidates.length}</p>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center text-gray-600 mb-2">
                      <Clock className="w-4 h-4 mr-2" />
                      <span className="text-sm font-medium">Time</span>
                    </div>
                    <p className="text-sm font-bold text-gray-900">{timeRemaining}</p>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center text-gray-600 mb-2">
                      <TrendingUp className="w-4 h-4 mr-2" />
                      <span className="text-sm font-medium">Status</span>
                    </div>
                    <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor()}`}>
                      <StatusIcon className="w-3 h-3 mr-1" />
                      {pollStatus}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 lg:mt-0 lg:ml-8">
                <button
                  onClick={loadPollData}
                  disabled={loading}
                  className="flex items-center text-sm text-gray-500 hover:text-gray-700"
                >
                  <RefreshCw className={`w-3 h-3 mr-1 ${loading ? 'animate-spin' : ''}`} />
                  Refresh Data
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Poll Status Messages */}
        {userHasVoted && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-8">
            <div className="flex items-center">
              <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
              <span className="text-green-800 font-medium">
                You have already voted in this poll. Thank you for participating!
              </span>
            </div>
          </div>
        )}

        {pollStatus === 'ended' && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-8">
            <div className="flex items-center">
              <Clock className="h-5 w-5 text-yellow-600 mr-2" />
              <span className="text-yellow-800 font-medium">
                This poll has ended. Voting is no longer available.
              </span>
            </div>
          </div>
        )}

        {!connected && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-blue-600 mr-2" />
              <span className="text-blue-800 font-medium">
                Connect your wallet to participate in this poll.
              </span>
            </div>
          </div>
        )}

        {/* ✅ ENHANCED: Candidates Section with Better Error Handling */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Candidates & Results</h2>
            <div className="text-sm text-gray-500">
              Expected: {poll.candidateCount} | Found: {candidates.length}
            </div>
          </div>

          {candidates.length === 0 ? (
            <div className="text-center py-8">
              <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {poll.candidateCount > 0 ? 'Loading Candidates...' : 'No Candidates Yet'}
              </h3>
              <p className="text-gray-600 mb-4">
                {poll.candidateCount > 0 
                  ? `This poll should have ${poll.candidateCount} candidates. They may still be loading.`
                  : 'Be the first to register as a candidate!'
                }
              </p>
              {poll.candidateCount === 0 && (
                <Link
                  href="/candidates/register"
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg"
                >
                  Register as Candidate
                </Link>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {candidates.map((candidate, index) => {
                const percentage = totalVotes > 0 ? (candidate.votes / totalVotes) * 100 : 0;

                return (
                  <div key={candidate.id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                          {index + 1}
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-gray-900">{candidate.name}</h3>
                          <p className="text-gray-600 text-sm mt-1">
                            {candidate.bio || `Candidate for ${poll.title}`}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-gray-900">{candidate.votes}</div>
                        <div className="text-sm text-gray-600">{percentage.toFixed(1)}% of votes</div>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
                      <div
                        className="bg-gradient-to-r from-blue-500 to-purple-600 h-3 rounded-full transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>

                    <div className="text-xs text-gray-500">
                      {candidate.votes} {candidate.votes === 1 ? 'vote' : 'votes'}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4">
          {connected && pollStatus === 'active' && !userHasVoted && candidates.length > 0 && (
            <Link
              href={`/polls/${pollId}/vote`}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white text-center py-3 px-6 rounded-lg font-bold transition-colors btn-animate"
            >
              Vote in This Poll
            </Link>
          )}

          <Link
            href="/candidates/register"
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-center py-3 px-6 rounded-lg font-bold transition-colors btn-animate"
          >
            Register as Candidate
          </Link>

          <Link
            href="/polls"
            className="flex-1 bg-gray-600 hover:bg-gray-700 text-white text-center py-3 px-6 rounded-lg font-bold transition-colors btn-animate"
          >
            Browse Other Polls
          </Link>
        </div>

        {/* Poll Details */}
        <div className="mt-8 bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Poll Information</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-gray-700 mb-2">Start Time</h4>
              <p className="text-gray-900">{poll.startTime.toLocaleString('en-IN', {timeZone: 'Asia/Kolkata'})}</p>
            </div>

            <div>
              <h4 className="font-medium text-gray-700 mb-2">End Time</h4>
              <p className="text-gray-900">{poll.endTime.toLocaleString('en-IN', {timeZone: 'Asia/Kolkata'})}</p>
            </div>

            <div>
              <h4 className="font-medium text-gray-700 mb-2">Poll ID</h4>
              <p className="text-gray-900 font-mono">#{poll.id}</p>
            </div>

            <div>
              <h4 className="font-medium text-gray-700 mb-2">Duration</h4>
              <p className="text-gray-900">
                {Math.round((poll.endTime.getTime() - poll.startTime.getTime()) / (1000 * 60 * 60))} hours
              </p>
            </div>
          </div>

          {/* ✅ DEBUG INFO: Show raw timestamps */}
          <div className="mt-4 p-3 bg-gray-100 rounded text-xs font-mono">
            <div><strong>Debug - Raw Times:</strong></div>
            <div>Start: {poll.startTime.toISOString()} ({poll.startTime.getTime()})</div>
            <div>End: {poll.endTime.toISOString()} ({poll.endTime.getTime()})</div>
            <div>Same: {poll.startTime.getTime() === poll.endTime.getTime() ? '❌ YES (BUG!)' : '✅ No'}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
