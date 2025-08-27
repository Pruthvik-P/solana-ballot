
"use client";

import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useVoting } from "@/hooks/useVoting";
import { Settings, CheckCircle, Loader, AlertTriangle } from "lucide-react";

export default function InitializeProgram() {
  const { connected } = useWallet();
  const { initialize, checkInitialized, loading } = useVoting();
  const [isInitialized, setIsInitialized] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);

  // Check initialization status
  const handleCheckStatus = async () => {
    setIsChecking(true);
    try {
      const initialized = await checkInitialized();
      setIsInitialized(initialized);

      if (initialized) {
        alert("✅ Program is already initialized!");
      } else {
        alert("❌ Program needs initialization");
      }
    } catch (error) {
      console.error("Error checking status:", error);
      alert("❌ Could not check initialization status");
    } finally {
      setIsChecking(false);
    }
  };

  // Initialize the program
  const handleInitialize = async () => {
    if (!connected) {
      alert("❌ Please connect your wallet first");
      return;
    }

    setIsInitializing(true);
    try {
      const result = await initialize();

      if (result?.success) {
        setIsInitialized(true);
        alert("✅ Program initialized successfully! You can now create polls.");
      } else {
        alert(`❌ Initialization failed: ${result.error}`);
      }
    } catch (error) {
      console.error("Initialization error:", error);
      alert("❌ Failed to initialize program");
    } finally {
      setIsInitializing(false);
    }
  };

  if (!connected) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-center">
          <AlertTriangle className="h-5 w-5 text-yellow-600 mr-2" />
          <span className="text-yellow-800">
            Please connect your wallet to check program status
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold text-gray-900">Program Status</h3>
          <p className="text-gray-600 text-sm">
            The Solana program must be initialized before creating polls
          </p>
        </div>

        {isInitialized === true && (
          <CheckCircle className="h-8 w-8 text-green-600" />
        )}

        {isInitialized === false && (
          <AlertTriangle className="h-8 w-8 text-yellow-600" />
        )}
      </div>

      <div className="space-y-3">
        {/* Check Status Button */}
        <button
          onClick={handleCheckStatus}
          disabled={isChecking || loading}
          className="w-full bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg disabled:opacity-50 transition-colors flex items-center justify-center"
        >
          {isChecking ? (
            <>
              <Loader className="w-4 h-4 mr-2 animate-spin" />
              Checking...
            </>
          ) : (
            <>
              <Settings className="w-4 h-4 mr-2" />
              Check Program Status
            </>
          )}
        </button>

        {/* Status Display */}
        {isInitialized !== null && (
          <div className={`p-3 rounded-lg ${
            isInitialized 
              ? 'bg-green-50 border border-green-200' 
              : 'bg-red-50 border border-red-200'
          }`}>
            <div className="flex items-center">
              {isInitialized ? (
                <>
                  <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                  <span className="text-green-800 font-medium">
                    Program is initialized and ready!
                  </span>
                </>
              ) : (
                <>
                  <AlertTriangle className="h-4 w-4 text-red-600 mr-2" />
                  <span className="text-red-800 font-medium">
                    Program needs initialization
                  </span>
                </>
              )}
            </div>
          </div>
        )}

        {/* Initialize Button */}
        {(isInitialized === false || isInitialized === null) && (
          <button
            onClick={handleInitialize}
            disabled={isInitializing || loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg disabled:opacity-50 transition-colors flex items-center justify-center"
          >
            {isInitializing ? (
              <>
                <Loader className="w-4 h-4 mr-2 animate-spin" />
                Initializing...
              </>
            ) : (
              <>
                <Settings className="w-4 h-4 mr-2" />
                Initialize Program
              </>
            )}
          </button>
        )}

        {isInitialized === true && (
          <div className="text-center">
            <p className="text-green-600 font-medium">
              ✅ You can now create polls and vote!
            </p>
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="mt-4 text-xs text-gray-500">
        <p className="mb-1">💡 <strong>What initialization does:</strong></p>
        <ul className="list-disc list-inside space-y-0.5 ml-2">
          <li>Creates counter account for poll IDs</li>
          <li>Creates registrations account for candidates</li>
          <li>One-time setup per program deployment</li>
        </ul>
      </div>
    </div>
  );
}
