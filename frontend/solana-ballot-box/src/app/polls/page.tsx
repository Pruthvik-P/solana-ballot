
"use client";

import { useState, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useVoting } from "@/hooks/useVoting";
import { Search, Plus, Vote, Clock, Users, Filter, RefreshCw } from "lucide-react";
import Link from "next/link";
import { PollCardData } from "@/types";

export default function PollsPage() {
  const { connected } = useWallet();
  const { getAllPolls, checkInitialized } = useVoting();

  const [polls, setPolls] = useState<PollCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'ended'>('all');
  const [isInitialized, setIsInitialized] = useState<boolean | null>(null);

  // Load polls from blockchain
  const loadPolls = async () => {
    setLoading(true);
    setError(null);

    try {
      // First check if program is initialized
      const initialized = await checkInitialized();
      setIsInitialized(initialized);

      if (!initialized) {
        setPolls([]);
        setError("Program not initialized. Please initialize the program first.");
        return;
      }

      // Fetch real polls from blockchain
      const fetchedPolls = await getAllPolls();
      console.log("📊 Loaded polls:", fetchedPolls);

      setPolls(fetchedPolls);

      if (fetchedPolls.length === 0) {
        setError("No polls found. Create the first poll!");
      }

    } catch (err) {
      console.error("Error loading polls:", err);
      setError("Failed to load polls. Please check your connection.");
      setPolls([]);
    } finally {
      setLoading(false);
    }
  };

  // Load polls on component mount
  useEffect(() => {
    loadPolls();
  }, [checkInitialized, getAllPolls]);

  // Filter polls based on search and status
  const filteredPolls = polls.filter(poll => {
    const matchesSearch = poll.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         poll.title.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || 
                         (statusFilter === 'active' && poll.status === 'active') ||
                         (statusFilter === 'ended' && poll.status === 'ended');

    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'ended': return 'bg-gray-100 text-gray-800';
      case 'draft': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatTimeRemaining = (endTime: Date) => {
    const now = new Date();
    const diff = endTime.getTime() - now.getTime();

    if (diff <= 0) return "Ended";

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (days > 0) return `${days}d ${hours}h left`;
    if (hours > 0) return `${hours}h left`;
    return "Less than 1h left";
  };

  if (!connected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 py-12">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <Vote className="mx-auto h-16 w-16 text-blue-600 mb-6" />
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Connect Your Wallet</h2>
            <p className="text-gray-600 mb-6">
              Please connect your wallet to view and participate in polls.
            </p>
            <Link
              href="/"
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg"
            >
              Go Home to Connect
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 py-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">All Polls</h1>
            <p className="text-gray-600">
              {loading ? "Loading..." : `${filteredPolls.length} poll${filteredPolls.length !== 1 ? 's' : ''} found`}
            </p>
          </div>
          <div className="mt-4 sm:mt-0 flex space-x-3">
            <button
              onClick={loadPolls}
              disabled={loading}
              className="flex items-center px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-lg disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <Link
              href="/polls/create"
              className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Poll
            </Link>
          </div>
        </div>

        {/* Program Status Alert */}
        {isInitialized === false && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <Vote className="h-5 w-5 text-red-600 mr-2" />
              <div>
                <p className="text-red-800 font-medium">Program Not Initialized</p>
                <p className="text-red-700 text-sm">
                  The voting program needs to be initialized before polls can be created or viewed.
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

        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center space-y-4 sm:space-y-0 sm:space-x-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search polls..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Status Filter */}
            <div className="flex items-center space-x-2">
              <Filter className="text-gray-400 w-5 h-5" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="ended">Ended</option>
              </select>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <RefreshCw className="mx-auto h-8 w-8 text-blue-600 animate-spin mb-4" />
            <p className="text-gray-600">Loading polls from blockchain...</p>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
            <Vote className="mx-auto h-12 w-12 text-yellow-500 mb-4" />
            <h3 className="text-lg font-medium text-yellow-900 mb-2">No Polls Available</h3>
            <p className="text-yellow-800 mb-4">{error}</p>
            {isInitialized === false ? (
              <Link
                href="/"
                className="bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-2 px-4 rounded-lg"
              >
                Initialize Program
              </Link>
            ) : (
              <Link
                href="/polls/create"
                className="bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-2 px-4 rounded-lg"
              >
                Create First Poll
              </Link>
            )}
          </div>
        )}

        {/* Polls Grid */}
        {!loading && !error && filteredPolls.length > 0 && (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredPolls.map((poll) => (
              <div
                key={poll.id}
                className="bg-white rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-300 overflow-hidden"
              >
                <div className="p-6">
                  {/* Poll Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-900 mb-2">
                        {poll.title}
                      </h3>
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(poll.status)}`}>
                        {poll.status}
                      </span>
                    </div>
                  </div>

                  {/* Poll Description */}
                  <p className="text-gray-600 mb-4 line-clamp-2">
                    {poll.description}
                  </p>

                  {/* Poll Stats */}
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="text-center">
                      <div className="flex items-center justify-center text-blue-600 mb-1">
                        <Users className="w-4 h-4 mr-1" />
                      </div>
                      <div className="text-lg font-bold text-gray-900">{poll.candidateCount}</div>
                      <div className="text-xs text-gray-500">Candidates</div>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center text-green-600 mb-1">
                        <Vote className="w-4 h-4 mr-1" />
                      </div>
                      <div className="text-lg font-bold text-gray-900">{poll.totalVotes}</div>
                      <div className="text-xs text-gray-500">Votes</div>
                    </div>
                  </div>

                  {/* Time Info */}
                  <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                    <div className="flex items-center">
                      <Clock className="w-4 h-4 mr-1" />
                      {formatTimeRemaining(poll.endTime)}
                    </div>
                    <div>
                      ID: #{poll.id}
                    </div>
                  </div>

                  {/* Action Button */}
                  <Link
                    href={`/polls/${poll.id}`}
                    className="block w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg text-center transition-colors"
                  >
                    View Details
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty State (when no polls match filter) */}
        {!loading && !error && filteredPolls.length === 0 && polls.length > 0 && (
          <div className="text-center py-12">
            <Search className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No polls match your search</h3>
            <p className="text-gray-500">Try adjusting your search terms or filters.</p>
            <button
              onClick={() => {
                setSearchTerm("");
                setStatusFilter('all');
              }}
              className="mt-4 text-blue-600 hover:text-blue-700 underline"
            >
              Clear filters
            </button>
          </div>
        )}

        {/* Stats Summary */}
        {!loading && polls.length > 0 && (
          <div className="mt-8 bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Platform Stats</h3>
            <div className="grid grid-cols-3 gap-6 text-center">
              <div>
                <div className="text-2xl font-bold text-blue-600">{polls.length}</div>
                <div className="text-sm text-gray-500">Total Polls</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">
                  {polls.filter(p => p.status === 'active').length}
                </div>
                <div className="text-sm text-gray-500">Active Polls</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-purple-600">
                  {polls.reduce((sum, p) => sum + p.totalVotes, 0)}
                </div>
                <div className="text-sm text-gray-500">Total Votes</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
