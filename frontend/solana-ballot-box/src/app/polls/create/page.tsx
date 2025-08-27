
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useWallet } from "@solana/wallet-adapter-react";
import { useVoting } from "@/hooks/useVoting";
import { ArrowLeft, Calendar, Clock, FileText, AlertCircle, CheckCircle, Vote, Shield, Info, Bug } from "lucide-react";
import Link from "next/link";

interface PollFormData {
  description: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
}

export default function CreatePollPage() {
  const router = useRouter();
  const { connected, publicKey } = useWallet();
  const { createPoll, loading, checkInitialized } = useVoting();

  const [formData, setFormData] = useState<PollFormData>({
    description: "",
    startDate: "",
    startTime: "",
    endDate: "",
    endTime: "",
  });

  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pollCreated, setPollCreated] = useState(false);
  const [createdPollId, setCreatedPollId] = useState<number | null>(null);
  const [isInitialized, setIsInitialized] = useState<boolean | null>(null);

  // Set default dates/times on component mount
  useEffect(() => {
    // Get current time in IST
    const now = new Date();

    console.log("🕐 Current time setup:", {
      now: now.toISOString(),
      nowIST: now.toLocaleString('en-IN', {timeZone: 'Asia/Kolkata'}),
      nowTimestamp: now.getTime()
    });

    // Start time: 10 minutes from now 
    const startDateTime = new Date(now.getTime() + (10 * 60 * 1000));

    // End time: Start time + 2 hours
    const endDateTime = new Date(startDateTime.getTime() + (2 * 60 * 60 * 1000));

    // FIXED: Format dates for form inputs in local timezone (IST)
    const formatDateForInput = (date: Date) => {
      // Get date components in IST
      const year = date.toLocaleDateString('en-CA', {timeZone: 'Asia/Kolkata'}).split('-')[0];
      const month = date.toLocaleDateString('en-CA', {timeZone: 'Asia/Kolkata'}).split('-')[1];
      const day = date.toLocaleDateString('en-CA', {timeZone: 'Asia/Kolkata'}).split('-')[2];
      return `${year}-${month}-${day}`;
    };

    const formatTimeForInput = (date: Date) => {
      // Get time in IST as HH:MM format
      return date.toLocaleTimeString('en-GB', { 
        timeZone: 'Asia/Kolkata',
        hour12: false, 
        hour: '2-digit', 
        minute: '2-digit'
      });
    };

    const startDate = formatDateForInput(startDateTime);
    const startTime = formatTimeForInput(startDateTime);
    const endDate = formatDateForInput(endDateTime);
    const endTime = formatTimeForInput(endDateTime);

    console.log("📅 Default form values:", {
      startDateTime: startDateTime.toLocaleString('en-IN', {timeZone: 'Asia/Kolkata'}),
      endDateTime: endDateTime.toLocaleString('en-IN', {timeZone: 'Asia/Kolkata'}),
      formValues: { startDate, startTime, endDate, endTime }
    });

    setFormData({
      description: "",
      startDate,
      startTime,
      endDate,
      endTime,
    });
  }, []);

  // Check if program is initialized
  useEffect(() => {
    async function checkInit() {
      if (loading) return;

      try {
        const initialized = await checkInitialized();
        setIsInitialized(initialized);
      } catch (error) {
        console.error("Error checking initialization:", error);
        setIsInitialized(false);
      }
    }

    checkInit();
  }, [loading, checkInitialized]);

  // FIXED: Better date combination function that properly handles IST
  const combineDateAndTime = (dateStr: string, timeStr: string, label: string): Date => {
    console.log(`🔧 Combining ${label}:`, { dateStr, timeStr });

    // Create a date-time string in local format
    const dateTimeStr = `${dateStr}T${timeStr}:00`;
    console.log(`📅 DateTime string for ${label}:`, dateTimeStr);

    // Create Date object - this will interpret as local time
    const localDate = new Date(dateTimeStr);
    console.log(`⏰ Local date for ${label}:`, {
      iso: localDate.toISOString(),
      ist: localDate.toLocaleString('en-IN', {timeZone: 'Asia/Kolkata'}),
      timestamp: localDate.getTime()
    });

    // Since we want IST times, and the form inputs are meant to be IST,
    // we need to adjust for the fact that new Date() interprets as local timezone
    const istOffset = 5.5 * 60 * 60 * 1000; // IST is UTC+5:30
    const systemOffset = new Date().getTimezoneOffset() * 60 * 1000; // System timezone offset

    // If system is not IST, we need to adjust
    const adjustedDate = new Date(localDate.getTime() - systemOffset + istOffset);

    console.log(`✅ Final ${label} date:`, {
      utc: adjustedDate.toISOString(),
      ist: adjustedDate.toLocaleString('en-IN', {timeZone: 'Asia/Kolkata'}),
      timestamp: adjustedDate.getTime()
    });

    return adjustedDate;
  };

  // FIXED: Simpler and more reliable date combination for IST
  const combineDateAndTimeSimple = (dateStr: string, timeStr: string, label: string): Date => {
    console.log(`🔧 Simple combining ${label}:`, { dateStr, timeStr });

    // Parse date and time components
    const [year, month, day] = dateStr.split('-').map(Number);
    const [hour, minute] = timeStr.split(':').map(Number);

    // Create date directly with components (this creates in local timezone)
    const date = new Date(year, month - 1, day, hour, minute, 0, 0);

    console.log(`✅ Simple combined ${label}:`, {
      input: `${dateStr} ${timeStr}`,
      created: date.toLocaleString('en-IN', {timeZone: 'Asia/Kolkata'}),
      iso: date.toISOString(),
      timestamp: date.getTime()
    });

    return date;
  };

  const validateForm = () => {
    const newErrors: {[key: string]: string} = {};

    // Description validation
    if (!formData.description.trim()) {
      newErrors.description = "Poll description is required";
    } else if (formData.description.length < 5) {
      newErrors.description = "Description must be at least 5 characters";
    } else if (formData.description.length > 200) {
      newErrors.description = "Description must be less than 200 characters";
    }

    // Date and time validation
    if (!formData.startDate) {
      newErrors.startDate = "Start date is required";
    }
    if (!formData.startTime) {
      newErrors.startTime = "Start time is required";
    }
    if (!formData.endDate) {
      newErrors.endDate = "End date is required";
    }
    if (!formData.endTime) {
      newErrors.endTime = "End time is required";
    }

    // If all date/time fields are present, validate the logic
    if (formData.startDate && formData.startTime && formData.endDate && formData.endTime) {
      try {
        const startDateTime = combineDateAndTimeSimple(formData.startDate, formData.startTime, "validation-start");
        const endDateTime = combineDateAndTimeSimple(formData.endDate, formData.endTime, "validation-end");
        const now = new Date();

        console.log("🔍 Validation check:", {
          now: now.toLocaleString('en-IN', {timeZone: 'Asia/Kolkata'}),
          startDateTime: startDateTime.toLocaleString('en-IN', {timeZone: 'Asia/Kolkata'}),
          endDateTime: endDateTime.toLocaleString('en-IN', {timeZone: 'Asia/Kolkata'}),
          nowTimestamp: now.getTime(),
          startTimestamp: startDateTime.getTime(),
          endTimestamp: endDateTime.getTime(),
          startInFuture: startDateTime.getTime() > now.getTime(),
          endAfterStart: endDateTime.getTime() > startDateTime.getTime()
        });

        // Check if start time is in the future (with 2 minute buffer)
        const buffer = 2 * 60 * 1000; // 2 minutes
        const minStartTime = now.getTime() + buffer;

        if (startDateTime.getTime() <= minStartTime) {
          const minutesFromNow = Math.ceil((startDateTime.getTime() - now.getTime()) / (60 * 1000));
          newErrors.startTime = `Start time must be at least 2 minutes in the future (currently ${minutesFromNow} minutes from now)`;
        }

        // Check if end time is after start time
        if (endDateTime.getTime() <= startDateTime.getTime()) {
          newErrors.endTime = "End time must be after start time";
        }

        // Check minimum poll duration (15 minutes for testing)
        const minDuration = 15 * 60 * 1000; // 15 minutes
        if (endDateTime.getTime() - startDateTime.getTime() < minDuration) {
          newErrors.endTime = "Poll must run for at least 15 minutes";
        }

        // Check maximum poll duration (30 days)
        const maxDuration = 30 * 24 * 60 * 60 * 1000; // 30 days
        if (endDateTime.getTime() - startDateTime.getTime() > maxDuration) {
          newErrors.endTime = "Poll cannot run for more than 30 days";
        }
      } catch (error) {
        console.error("❌ Date validation error:", error);
        newErrors.endTime = "Invalid date/time combination";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: "" }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!connected) {
      alert("Please connect your wallet first");
      return;
    }

    if (!validateForm()) {
      console.log("❌ Form validation failed");
      return;
    }

    setIsSubmitting(true);

    try {
      console.log("🚀 STARTING POLL CREATION PROCESS");
      console.log("📝 Form data:", formData);

      // Use the simple date combination for final submission
      const startDateTime = combineDateAndTimeSimple(formData.startDate, formData.startTime, "FINAL-START");
      const endDateTime = combineDateAndTimeSimple(formData.endDate, formData.endTime, "FINAL-END");

      // Additional validation
      if (endDateTime <= startDateTime) {
        alert("Error: End time must be after start time");
        setIsSubmitting(false);
        return;
      }

      console.log("📊 FINAL POLL PARAMETERS:", {
        description: formData.description,
        startDateTime: {
          utc: startDateTime.toISOString(),
          ist: startDateTime.toLocaleString('en-IN', {timeZone: 'Asia/Kolkata'}),
          timestamp: startDateTime.getTime()
        },
        endDateTime: {
          utc: endDateTime.toISOString(),
          ist: endDateTime.toLocaleString('en-IN', {timeZone: 'Asia/Kolkata'}),
          timestamp: endDateTime.getTime()
        },
        duration: {
          milliseconds: endDateTime.getTime() - startDateTime.getTime(),
          hours: (endDateTime.getTime() - startDateTime.getTime()) / (1000 * 60 * 60)
        }
      });

      console.log("🔗 Calling createPoll function...");
      const result = await createPoll(formData.description, startDateTime, endDateTime);
      console.log("📋 CreatePoll result:", result);

      if (result?.success) {
        console.log("✅ Poll created successfully:", result);
        setCreatedPollId(result.pollId);
        setPollCreated(true);

        setTimeout(() => {
          router.push(`/polls/${result.pollId}`);
        }, 3000);
      } else {
        console.error("❌ Poll creation failed:", result?.error);
        alert(`Failed to create poll: ${result?.error || "Unknown error occurred"}`);

        if (result?.needsInitialization) {
          alert("Program needs initialization. Please go to the homepage and initialize the program first.");
        }
      }
    } catch (error) {
      console.error("❌ Unexpected poll creation error:", error);
      alert(`An error occurred while creating the poll: ${error}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!connected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 py-12">
        <div className="max-w-2xl mx-auto px-4">
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <AlertCircle className="mx-auto h-12 w-12 text-yellow-500 mb-4" />
            <h2 className="text-2xl font-bold text-slate-800 mb-4">Wallet Not Connected</h2>
            <p className="text-slate-600 mb-6">Please connect your wallet to create a poll.</p>
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

  if (pollCreated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 py-12">
        <div className="max-w-2xl mx-auto px-4">
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <CheckCircle className="mx-auto h-16 w-16 text-green-500 mb-6" />
            <h2 className="text-2xl font-bold text-slate-800 mb-4">Poll Created Successfully! 🎉</h2>
            <p className="text-slate-600 mb-6">
              Your poll has been created on the Solana blockchain and is ready for candidate registration and voting.
            </p>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <div className="text-left">
                <p className="text-green-800 text-sm">
                  <strong>📊 Poll:</strong> {formData.description}<br/>
                  <strong>🗳️ Poll ID:</strong> #{createdPollId}<br/>
                  <strong>⏰ Starts:</strong> {formData.startDate} at {formData.startTime} IST<br/>
                  <strong>⏱️ Ends:</strong> {formData.endDate} at {formData.endTime} IST<br/>
                  <strong>🔗 Created by:</strong> {publicKey?.toString().substring(0, 8)}...{publicKey?.toString().substring(-8)}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <Link
                href={`/polls/${createdPollId}`}
                className="block bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg btn-animate"
              >
                View Your Poll
              </Link>
              <Link
                href="/polls"
                className="block bg-gray-300 hover:bg-gray-400 text-slate-800 font-bold py-2 px-4 rounded-lg btn-animate"
              >
                Browse All Polls
              </Link>
            </div>

            <p className="text-xs text-slate-500 mt-4">
              Redirecting to your poll in 3 seconds...
            </p>
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
          <h1 className="text-3xl font-bold text-slate-800">Create New Poll</h1>
          <p className="text-slate-600 mt-2">
            Create a democratic election on the Solana blockchain
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
                  The voting program needs to be initialized before polls can be created.
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

        {/* Timezone Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-center mb-2">
            <Info className="h-5 w-5 text-blue-600 mr-2" />
            <h3 className="font-medium text-blue-900">Timezone Information</h3>
          </div>
          <p className="text-blue-800 text-sm">
            All times are in <strong>IST (India Standard Time)</strong>. 
            Current time: <strong>{new Date().toLocaleString('en-IN', {timeZone: 'Asia/Kolkata'})}</strong>
          </p>
        </div>

        {/* Main Form */}
        <div className="bg-white rounded-lg shadow-lg p-8">
          <form onSubmit={handleSubmit}>
            <div className="space-y-6">
              {/* Poll Description */}
              <div>
                <label htmlFor="description" className="flex items-center text-sm font-medium text-slate-800 mb-2">
                  <FileText className="w-4 h-4 mr-2" />
                  Poll Description *
                </label>
                <textarea
                  id="description"
                  name="description"
                  rows={3}
                  value={formData.description}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-slate-800 placeholder:text-slate-600 ${
                    errors.description ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Enter the poll question or description (e.g., 'Who should be the next president?')"
                  maxLength={200}
                />
                <div className="flex justify-between mt-1">
                  <div>
                    {errors.description && (
                      <p className="text-red-500 text-sm">{errors.description}</p>
                    )}
                  </div>
                  <p className="text-sm text-slate-600">
                    {formData.description.length}/200
                  </p>
                </div>
              </div>

              {/* Start Date and Time */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="startDate" className="flex items-center text-sm font-medium text-slate-800 mb-2">
                    <Calendar className="w-4 h-4 mr-2" />
                    Start Date *
                  </label>
                  <input
                    type="date"
                    id="startDate"
                    name="startDate"
                    value={formData.startDate}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 ${
                      errors.startDate ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.startDate && (
                    <p className="text-red-500 text-sm mt-1">{errors.startDate}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="startTime" className="flex items-center text-sm font-medium text-slate-800 mb-2">
                    <Clock className="w-4 h-4 mr-2" />
                    Start Time (IST) *
                  </label>
                  <input
                    type="time"
                    id="startTime"
                    name="startTime"
                    value={formData.startTime}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 ${
                      errors.startTime ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.startTime && (
                    <p className="text-red-500 text-sm mt-1">{errors.startTime}</p>
                  )}
                </div>
              </div>

              {/* End Date and Time */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="endDate" className="flex items-center text-sm font-medium text-slate-800 mb-2">
                    <Calendar className="w-4 h-4 mr-2" />
                    End Date *
                  </label>
                  <input
                    type="date"
                    id="endDate"
                    name="endDate"
                    value={formData.endDate}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 ${
                      errors.endDate ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.endDate && (
                    <p className="text-red-500 text-sm mt-1">{errors.endDate}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="endTime" className="flex items-center text-sm font-medium text-slate-800 mb-2">
                    <Clock className="w-4 h-4 mr-2" />
                    End Time (IST) *
                  </label>
                  <input
                    type="time"
                    id="endTime"
                    name="endTime"
                    value={formData.endTime}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 ${
                      errors.endTime ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.endTime && (
                    <p className="text-red-500 text-sm mt-1">{errors.endTime}</p>
                  )}
                </div>
              </div>

              {/* FIXED: Preview Poll Schedule */}
              {formData.startDate && formData.startTime && formData.endDate && formData.endTime && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <h4 className="font-medium text-slate-800 mb-2">📅 Poll Schedule Preview (IST)</h4>
                  <div className="text-slate-600 text-sm space-y-1">
                    {(() => {
                      try {
                        const startDateTime = combineDateAndTimeSimple(formData.startDate, formData.startTime, "preview-start");
                        const endDateTime = combineDateAndTimeSimple(formData.endDate, formData.endTime, "preview-end");
                        const now = new Date();

                        const duration = endDateTime.getTime() - startDateTime.getTime();
                        const durationMinutes = Math.round(duration / (1000 * 60));
                        const durationHours = Math.floor(durationMinutes / 60);
                        const remainingMinutes = durationMinutes % 60;

                        const startInFuture = startDateTime.getTime() > now.getTime();
                        const endAfterStart = endDateTime.getTime() > startDateTime.getTime();

                        return (
                          <>
                            <p><strong>Starts:</strong> {startDateTime.toLocaleDateString('en-IN', {weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'})} at {startDateTime.toLocaleTimeString('en-IN', {hour: '2-digit', minute: '2-digit', hour12: true})}</p>
                            <p><strong>Ends:</strong> {endDateTime.toLocaleDateString('en-IN', {weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'})} at {endDateTime.toLocaleTimeString('en-IN', {hour: '2-digit', minute: '2-digit', hour12: true})}</p>
                            <p><strong>Duration:</strong> {durationHours > 0 ? `${durationHours}h ` : ''}{remainingMinutes}m</p>
                            <p className={`font-medium ${startInFuture ? 'text-green-600' : 'text-red-600'}`}>
                              <strong>Status:</strong> {startInFuture ? '✅ Starts in future' : '❌ Starts in past'}
                            </p>
                            {!endAfterStart && (
                              <p className="text-red-600 font-medium">
                                <strong>⚠️ Issue:</strong> End time is not after start time
                              </p>
                            )}
                          </>
                        );
                      } catch (error) {
                        return <p className="text-red-500">Error in preview: {error}</p>;
                      }
                    })()}
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading || isSubmitting || isInitialized === false}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors btn-animate"
              >
                {isSubmitting ? "Creating Poll..." : "Create Poll on Blockchain"}
              </button>
            </div>
          </form>
        </div>

        {/* Connected Wallet Info */}
        <div className="mt-6 bg-white rounded-lg shadow p-4">
          <div className="flex items-center text-sm text-slate-600">
            <Shield className="w-4 h-4 mr-2" />
            <span>
              Creating as: {publicKey?.toString().substring(0, 8)}...
              {publicKey?.toString().substring(-8)}
            </span>
          </div>
        </div>

        {/* Info Box */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-medium text-blue-900 mb-2">📊 Poll Creation Tips</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Poll description should be clear and specific</li>
            <li>• Start time must be at least 2 minutes in the future</li>
            <li>• Minimum poll duration is 15 minutes (for testing)</li>
            <li>• Maximum poll duration is 30 days</li>
            <li>• All times are in IST (India Standard Time)</li>
            <li>• Poll creation requires a small SOL transaction fee</li>
            <li>• Once created, poll details cannot be changed</li>
            <li>• Check the preview section to verify times are correct</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
