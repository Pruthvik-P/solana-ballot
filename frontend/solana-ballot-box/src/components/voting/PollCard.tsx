
"use client";

import React,{ useState } from "react";
import Link from "next/link";
import { Clock, Users, Vote, CheckCircle } from "lucide-react";

interface PollCardProps {
  poll: {
    id: number;
    description: string;
    startTime: Date;
    endTime: Date;
    candidateCount: number;
    totalVotes: number;
    isActive: boolean;
  };
}

export default function PollCard({ poll }: PollCardProps) {
  const [timeRemaining, setTimeRemaining] = useState("");

  // Calculate time remaining
  React.useEffect(() => {
    const calculateTimeRemaining = () => {
      const now = new Date();
      const end = new Date(poll.endTime);
      const diff = end.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeRemaining("Ended");
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      if (days > 0) {
        setTimeRemaining(`${days}d ${hours}h remaining`);
      } else if (hours > 0) {
        setTimeRemaining(`${hours}h ${minutes}m remaining`);
      } else {
        setTimeRemaining(`${minutes}m remaining`);
      }
    };

    calculateTimeRemaining();
    const interval = setInterval(calculateTimeRemaining, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [poll.endTime]);

  const statusColor = poll.isActive ? "text-green-600" : "text-gray-600";
  const statusIcon = poll.isActive ? CheckCircle : Clock;

  return (
    <div className="bg-white rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-300 p-6 border border-gray-200">
      <div className="flex items-start justify-between mb-4">
        <h3 className="text-xl font-bold text-gray-900 line-clamp-2">
          {poll.description}
        </h3>
        <span className={`flex items-center ${statusColor} text-sm font-medium`}>
          {React.createElement(statusIcon, { className: "w-4 h-4 mr-1" })}
          {poll.isActive ? "Active" : "Ended"}
        </span>
      </div>

      <div className="space-y-3 mb-6">
        <div className="flex items-center text-gray-600">
          <Clock className="w-4 h-4 mr-2" />
          <span className="text-sm">{timeRemaining}</span>
        </div>

        <div className="flex items-center text-gray-600">
          <Users className="w-4 h-4 mr-2" />
          <span className="text-sm">{poll.candidateCount} candidates</span>
        </div>

        <div className="flex items-center text-gray-600">
          <Vote className="w-4 h-4 mr-2" />
          <span className="text-sm">{poll.totalVotes} votes cast</span>
        </div>
      </div>

      <div className="flex space-x-3">
        <Link
          href={`/polls/${poll.id}`}
          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-center py-2 px-4 rounded-md font-medium transition-colors"
        >
          View Details
        </Link>

        {poll.isActive && (
          <Link
            href={`/polls/${poll.id}/vote`}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white text-center py-2 px-4 rounded-md font-medium transition-colors"
          >
            Vote Now
          </Link>
        )}
      </div>
    </div>
  );
}
