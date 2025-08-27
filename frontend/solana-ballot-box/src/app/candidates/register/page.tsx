
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useWallet } from "@solana/wallet-adapter-react";
import { useVoting } from "@/hooks/useVoting";
import { ArrowLeft, User, FileText, Clock, AlertCircle, CheckCircle, Vote, Users, Shield, RefreshCw, Bug } from "lucide-react";
import Link from "next/link";
import { PollCardData } from "@/types";

interface CandidateFormData {
  pollId: number;
  name: string;
  bio: string;
}

export default function CandidateRegisterPage() {
  const router = useRouter();
  const { connected, publicKey } = useWallet();

  const { getAllPolls, registerCandidate, loading, checkInitialized, program, programId } = useVoting();

  const [formData, setFormData] = useState<CandidateFormData>({
    pollId: 0,
    name: "",
    bio: "",
  });

  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [availablePolls, setAvailablePolls] = useState<PollCardData[]>([]);
  const [allPolls, setAllPolls] = useState<PollCardData[]>([]);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pollsLoading, setPollsLoading] = useState(true);
  const [pollsError, setPollsError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState<boolean | null>(null);

  // Helper function to check if poll is active for registration
  const isPollActiveForRegistration = (poll: PollCardData): boolean => {
    const now = new Date();
    const endTime = new Date(poll.endTime);

    // Add some buffer time (e.g., 1 hour) to account for timezone differences
    const bufferTime = 60 * 60 * 1000; // 1 hour in milliseconds
    const effectiveEndTime = new Date(endTime.getTime() + bufferTime);

    console.log(`Poll ${poll.id} time check:`, {
      now: now.toISOString(),
      endTime: endTime.toISOString(),
      effectiveEndTime: effectiveEndTime.toISOString(),
      isActive: now < effectiveEndTime,
      hoursRemaining: Math.round((effectiveEndTime.getTime() - now.getTime()) / (1000 * 60 * 60))
    });

    return now < effectiveEndTime;
  };

  // Fetch real polls from blockchain
  useEffect(() => {
    async function fetchPolls() {
      if (loading) {
        console.log("⏳ Hook is still loading, waiting...");
        return;
      }

      setPollsLoading(true);
      setPollsError(null);

      try {
        console.log("🔍 Checking if program is initialized...");
        const initialized = await checkInitialized();
        setIsInitialized(initialized);
        console.log("✅ Program initialized:", initialized);

        if (!initialized) {
          const errorMsg = "Program not initialized. Please initialize the program first.";
          console.log("❌", errorMsg);
          setPollsError(errorMsg);
          setAvailablePolls([]);
          setAllPolls([]);
          return;
        }

        console.log("📊 Fetching all polls from blockchain...");
        const polls = await getAllPolls();
        console.log("📊 Raw polls fetched:", polls.length, polls);
        setAllPolls(polls);

        if (polls.length === 0) {
          const errorMsg = "No polls found on blockchain. Create a poll first.";
          console.log("❌", errorMsg);
          setPollsError(errorMsg);
          setAvailablePolls([]);
          return;
        }

        console.log("🔍 Filtering polls for candidate registration...");
        console.log("Current time (IST):", new Date().toLocaleString('en-IN', {timeZone: 'Asia/Kolkata'}));
        console.log("Current time (UTC):", new Date().toISOString());

        // More lenient filtering - include polls with some buffer time
        const eligiblePolls = polls.filter((poll) => {
          const isActive = isPollActiveForRegistration(poll);

          console.log(`Poll ${poll.id} eligibility:`, {
            title: poll.title,
            endTime: new Date(poll.endTime).toLocaleString('en-IN', {timeZone: 'Asia/Kolkata'}),
            endTimeUTC: new Date(poll.endTime).toISOString(),
            status: poll.status,
            isActiveForRegistration: isActive
          });

          return isActive;
        });

        console.log("🎯 Eligible polls after filtering:", eligiblePolls.length, eligiblePolls);
        setAvailablePolls(eligiblePolls);

        if (eligiblePolls.length === 0) {
          if (polls.length > 0) {
            // Show more detailed error message
            const pollDetails = polls.map(poll => {
              const endTime = new Date(poll.endTime);
              const now = new Date();
              const isExpired = now >= endTime;
              const hoursRemaining = Math.round((endTime.getTime() - now.getTime()) / (1000 * 60 * 60));

              return `Poll #${poll.id}: ${poll.title} (Ends: ${endTime.toLocaleDateString('en-IN')} ${endTime.toLocaleTimeString('en-IN', {timeZone: 'Asia/Kolkata'})}, ${isExpired ? 'EXPIRED' : `${hoursRemaining}h remaining`})`;
            }).join(', ');

            setPollsError(`All ${polls.length} polls have ended or are about to end. ${pollDetails}`);
          } else {
            setPollsError("No polls available for candidate registration.");
          }
        } else {
          setPollsError(null);
        }

      } catch (error) {
        console.error("❌ Error fetching polls:", error);
        setPollsError(`Failed to load polls: ${error}`);
        setAvailablePolls([]);
        setAllPolls([]);
      } finally {
        setPollsLoading(false);
      }
    }

    fetchPolls();
  }, [loading, getAllPolls, checkInitialized]);

  const validateForm = () => {
    const newErrors: {[key: string]: string} = {};

    if (!formData.pollId) {
      newErrors.pollId = "Please select a poll";
    }

    if (!formData.name.trim()) {
      newErrors.name = "Candidate name is required";
    } else if (formData.name.length < 2) {
      newErrors.name = "Name must be at least 2 characters";
    } else if (formData.name.length > 50) {
      newErrors.name = "Name must be less than 50 characters";
    }

    if (!formData.bio.trim()) {
      newErrors.bio = "Bio is required";
    } else if (formData.bio.length < 10) {
      newErrors.bio = "Bio must be at least 10 characters";
    } else if (formData.bio.length > 200) {
      newErrors.bio = "Bio must be less than 200 characters";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!connected) {
      alert("Please connect your wallet first");
      return;
    }

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      console.log("🚀 Starting candidate registration...", {
        pollId: formData.pollId,
        name: formData.name,
        bio: formData.bio
      });

      const result = await registerCandidate(formData.pollId, formData.name);
      console.log("📋 Registration result:", result);

      if (result?.success) {
        console.log("✅ Registration successful!");
        setRegistrationSuccess(true);
        setTimeout(() => {
          router.push(`/polls/${formData.pollId}`);
        }, 3000);
      } else {
        console.error("❌ Registration failed:", result?.error);
        alert(`Registration failed: ${result?.error || "Unknown error occurred"}`);
      }
    } catch (error) {
      console.error("❌ Unexpected registration error:", error);
      alert(`An error occurred during registration: ${error}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ 
      ...prev, 
      [name]: name === 'pollId' ? parseInt(value) : value 
    }));

    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: "" }));
    }
  };

  const refreshPolls = async () => {
    setPollsLoading(true);
    try {
      const polls = await getAllPolls();
      console.log("🔄 Refreshed polls:", polls);
      setAllPolls(polls);

      const eligiblePolls = polls.filter(poll => isPollActiveForRegistration(poll));

      setAvailablePolls(eligiblePolls);
      setPollsError(eligiblePolls.length === 0 ? "No active polls available for registration" : null);
    } catch (error) {
      console.error("❌ Refresh error:", error);
      setPollsError(`Failed to refresh polls: ${error}`);
    } finally {
      setPollsLoading(false);
    }
  };

  if (!connected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 py-12">
        <div className="max-w-2xl mx-auto px-4">
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <AlertCircle className="mx-auto h-12 w-12 text-yellow-500 mb-4" />
            <h2 className="text-2xl font-bold text-slate-800 mb-4">Wallet Not Connected</h2>
            <p className="text-slate-600 mb-6">Please connect your wallet to register as a candidate.</p>
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

  if (registrationSuccess) {
    const selectedPoll = availablePolls.find(p => p.id === formData.pollId);

    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 py-12">
        <div className="max-w-2xl mx-auto px-4">
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <CheckCircle className="mx-auto h-16 w-16 text-green-500 mb-6" />
            <h2 className="text-2xl font-bold text-slate-800 mb-4">Registration Successful! 🎉</h2>
            <p className="text-slate-600 mb-6">
              You have successfully registered as a candidate for <strong>{selectedPoll?.title || `Poll #${formData.pollId}`}</strong>.
            </p>
            <div className="space-y-4">
              <Link
                href={`/polls/${formData.pollId}`}
                className="block bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg btn-animate"
              >
                View Poll & Candidates
              </Link>
              <Link
                href="/polls"
                className="block bg-gray-300 hover:bg-gray-400 text-slate-800 font-bold py-2 px-4 rounded-lg btn-animate"
              >
                Browse All Polls
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 py-12">
      <div className="max-w-2xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/polls"
            className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-4 btn-animate"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Polls
          </Link>
          <h1 className="text-3xl font-bold text-slate-800">Register as Candidate</h1>
          <p className="text-slate-600 mt-2">
            Join an election and let the community vote for you on the Solana blockchain
          </p>
        </div>

        {/* Program Status Alert */}
        {isInitialized === false && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
              <div>
                <p className="text-red-800 font-medium">Program Not Initialized</p>
                <p className="text-red-700 text-sm">
                  The voting program needs to be initialized before candidates can register.
                </p>
                <Link
                  href="/"
                  className="text-red-600 hover:text-red-700 underline text-sm mt-1 inline-block"
                >
                  Go to homepage to initialize →
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Debug Info for Date Issues */}
        {allPolls.length > 0 && availablePolls.length === 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex items-center mb-3">
              <Bug className="h-5 w-5 text-yellow-600 mr-2" />
              <h3 className="font-medium text-yellow-900">Debug: Date Filtering Issue</h3>
            </div>
            <div className="text-yellow-800 text-sm space-y-2">
              <p><strong>Current Time (IST):</strong> {new Date().toLocaleString('en-IN', {timeZone: 'Asia/Kolkata'})}</p>
              <p><strong>All Polls Found:</strong></p>
              <ul className="list-disc list-inside space-y-1">
                {allPolls.map(poll => {
                  const endTime = new Date(poll.endTime);
                  const now = new Date();
                  const hoursRemaining = Math.round((endTime.getTime() - now.getTime()) / (1000 * 60 * 60));
                  const isExpired = now >= endTime;

                  return (
                    <li key={poll.id}>
                      <strong>Poll #{poll.id}:</strong> {poll.title}<br/>
                      <span className="ml-4 text-xs">
                        Ends: {endTime.toLocaleDateString('en-IN')} at {endTime.toLocaleTimeString('en-IN', {timeZone: 'Asia/Kolkata', hour12: true})} IST<br/>
                        Status: {isExpired ? '❌ EXPIRED' : `✅ ${hoursRemaining}h remaining`}
                      </span>
                    </li>
                  );
                })}
              </ul>
              <p className="font-medium">
                💡 If your polls show as expired but should be active, there may be a timezone conversion issue.
              </p>
            </div>
          </div>
        )}

        {/* Main Form */}
        <div className="bg-white rounded-lg shadow-lg p-8">
          <form onSubmit={handleSubmit}>
            <div className="space-y-6">
              {/* Poll Selection */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label htmlFor="pollId" className="flex items-center text-sm font-medium text-slate-800">
                    <Vote className="w-4 h-4 mr-2" />
                    Select a Poll to Join *
                  </label>
                  <button
                    type="button"
                    onClick={refreshPolls}
                    disabled={pollsLoading}
                    className="text-blue-600 hover:text-blue-700 text-sm flex items-center"
                  >
                    <RefreshCw className={`w-3 h-3 mr-1 ${pollsLoading ? 'animate-spin' : ''}`} />
                    Refresh
                  </button>
                </div>

                {pollsLoading ? (
                  <div className="border border-gray-300 rounded-lg px-3 py-2 bg-gray-50 text-slate-600 text-center">
                    Loading available polls...
                  </div>
                ) : pollsError ? (
                  <div className="border border-red-300 rounded-lg px-3 py-2 bg-red-50">
                    <p className="text-red-700 text-sm font-medium">{pollsError}</p>
                  </div>
                ) : (
                  <>
                    <select
                      id="pollId"
                      name="pollId"
                      value={formData.pollId}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 ${
                        errors.pollId ? 'border-red-500' : 'border-gray-300'
                      }`}
                    >
                      <option value={0} className="text-slate-600">-- Select Poll --</option>
                      {availablePolls.map((poll) => {
                        const endTime = new Date(poll.endTime);
                        const now = new Date();
                        const hoursRemaining = Math.round((endTime.getTime() - now.getTime()) / (1000 * 60 * 60));
                        const timeRemaining = hoursRemaining > 24 
                          ? `${Math.ceil(hoursRemaining / 24)}d remaining`
                          : `${hoursRemaining}h remaining`;

                        return (
                          <option key={poll.id} value={poll.id} className="text-slate-800">
                            {poll.title} ({timeRemaining})
                          </option>
                        );
                      })}
                    </select>

                    {availablePolls.length === 0 && (
                      <p className="text-slate-600 text-sm mt-1">
                        No active polls available. <Link href="/polls/create" className="text-blue-600 hover:text-blue-700">Create a poll</Link> first.
                      </p>
                    )}
                  </>
                )}

                {errors.pollId && (
                  <p className="text-red-500 text-sm mt-1">{errors.pollId}</p>
                )}
              </div>

              {/* Selected Poll Info */}
              {formData.pollId > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  {(() => {
                    const selectedPoll = availablePolls.find(p => p.id === formData.pollId);
                    if (selectedPoll) {
                      const endTime = new Date(selectedPoll.endTime);
                      return (
                        <div>
                          <h4 className="font-medium text-blue-900 mb-2">Selected Poll:</h4>
                          <p className="text-blue-800 text-sm">
                            <strong>{selectedPoll.title}</strong><br/>
                            {selectedPoll.description}<br/>
                            <span className="text-blue-600">
                              Candidates: {selectedPoll.candidateCount} | 
                              Votes: {selectedPoll.totalVotes} | 
                              Ends: {endTime.toLocaleDateString('en-IN')} at {endTime.toLocaleTimeString('en-IN', {timeZone: 'Asia/Kolkata', hour12: true})} IST
                            </span>
                          </p>
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>
              )}

              {/* Show form fields only if we have polls */}
              {availablePolls.length > 0 && (
                <>
                  {/* Candidate Name */}
                  <div>
                    <label htmlFor="name" className="flex items-center text-sm font-medium text-slate-800 mb-2">
                      <User className="w-4 h-4 mr-2" />
                      Candidate Name *
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 placeholder:text-slate-600 ${
                        errors.name ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Enter your name as it will appear on the ballot"
                      maxLength={50}
                    />
                    <div className="flex justify-between mt-1">
                      <div>
                        {errors.name && (
                          <p className="text-red-500 text-sm">{errors.name}</p>
                        )}
                      </div>
                      <p className="text-sm text-slate-600">
                        {formData.name.length}/50
                      </p>
                    </div>
                  </div>

                  {/* Candidate Bio */}
                  <div>
                    <label htmlFor="bio" className="flex items-center text-sm font-medium text-slate-800 mb-2">
                      <FileText className="w-4 h-4 mr-2" />
                      Candidate Bio *
                    </label>
                    <textarea
                      id="bio"
                      name="bio"
                      rows={4}
                      value={formData.bio}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-slate-800 placeholder:text-slate-600 ${
                        errors.bio ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Tell voters about yourself, your experience, and why they should vote for you..."
                      maxLength={200}
                    />
                    <div className="flex justify-between mt-1">
                      <div>
                        {errors.bio && (
                          <p className="text-red-500 text-sm">{errors.bio}</p>
                        )}
                      </div>
                      <p className="text-sm text-slate-600">
                        {formData.bio.length}/200
                      </p>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={loading || isSubmitting || pollsLoading || isInitialized === false || availablePolls.length === 0}
                    className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors btn-animate"
                  >
                    {isSubmitting ? "Registering..." : "Register as Candidate"}
                  </button>
                </>
              )}

              {/* No polls available message */}
              {!pollsLoading && availablePolls.length === 0 && !pollsError && (
                <div className="text-center py-8">
                  <Vote className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-slate-800 mb-2">No Active Polls</h3>
                  <p className="text-slate-600 mb-4">
                    There are no active polls available for candidate registration.
                  </p>
                  <Link
                    href="/polls/create"
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg"
                  >
                    Create New Poll
                  </Link>
                </div>
              )}
            </div>
          </form>
        </div>

        {/* Connected Wallet Info */}
        <div className="mt-6 bg-white rounded-lg shadow p-4">
          <div className="flex items-center text-sm text-slate-600">
            <User className="w-4 h-4 mr-2" />
            <span>
              Registering as: {publicKey?.toString().substring(0, 8)}...
              {publicKey?.toString().substring(-8)}
            </span>
          </div>
        </div>

        {/* Info Box */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-medium text-blue-900 mb-2">👥 Registration Tips</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Choose your name carefully - it will appear on the ballot</li>
            <li>• Write a compelling bio to attract voters</li>
            <li>• Registration requires a small SOL transaction fee</li>
            <li>• You can register for multiple active polls</li>
            <li>• Be active in the community to gain support</li>
            <li>• Registration is permanent and cannot be undone</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
