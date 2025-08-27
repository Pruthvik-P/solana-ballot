
"use client";

import { 
  AnchorProvider, 
  Program, 
  Idl, 
  BN,
  setProvider
} from "@coral-xyz/anchor";
import { 
  Connection, 
  PublicKey,
  SystemProgram
} from "@solana/web3.js";
import { 
  AnchorWallet,
  useAnchorWallet,
  useConnection,
  useWallet
} from "@solana/wallet-adapter-react";
import { useState, useEffect, useMemo } from "react";

// Import your IDL - make sure this path is correct
import votingIdl from "@/lib/idl.json";

// ✅ UPDATE THIS WITH YOUR ACTUAL PROGRAM ID
const PROGRAM_ID = new PublicKey(process.env.NEXT_PUBLIC_PROGRAM_ID!);

// ✅ STANDARD PDA FUNCTIONS
export const getCounterPDA = async (
  programId: PublicKey
): Promise<[PublicKey, number]> => {
  return await PublicKey.findProgramAddressSync(
    [Buffer.from("counter")],
    programId
  );
};

export const getRegistrationsPDA = async (
  programId: PublicKey
): Promise<[PublicKey, number]> => {
  return await PublicKey.findProgramAddressSync(
    [Buffer.from("registrations")],
    programId
  );
};

export const getPollPDA = async (
  pollId: BN,
  programId: PublicKey
): Promise<[PublicKey, number]> => {
  return await PublicKey.findProgramAddressSync(
    [
      Buffer.from("poll"),
      pollId.toArrayLike(Buffer, "le", 8)
    ],
    programId
  );
};

export const getVoterPDA = async (
  pollId: BN,
  userPublicKey: PublicKey,
  programId: PublicKey
): Promise<[PublicKey, number]> => {
  return await PublicKey.findProgramAddressSync(
    [
      Buffer.from("voter"),
      pollId.toArrayLike(Buffer, "le", 8),
      userPublicKey.toBuffer()
    ],
    programId
  );
};

// ✅ PLACEHOLDER getCandidatePDA (will be updated after we find the correct pattern)
export const getCandidatePDA = async (
  pollId: BN,
  candidateId: BN,
  programId: PublicKey,
  userPublicKey?: PublicKey
): Promise<[PublicKey, number]> => {
  // Default pattern - will be updated after detection
  return await PublicKey.findProgramAddressSync(
    [
      Buffer.from("candidate"),
      pollId.toArrayLike(Buffer, "le", 8),
      candidateId.toArrayLike(Buffer, "le", 8)
    ],
    programId
  );
};

// ✅ COMPREHENSIVE PDA PATTERN DETECTION
export const findExactPDAPattern = async (
  pollId: number,
  programId: PublicKey,
  connection: Connection,
  userPublicKey: PublicKey
) => {
  console.log("🔍 COMPREHENSIVE PDA PATTERN DETECTION");
  console.log(`Testing for poll ${pollId}, user: ${userPublicKey.toString().substring(0, 8)}...`);

  const pollIdBN = new BN(pollId);

  // Test ALL possible patterns exhaustively
  const allPatterns = [
    // User-based patterns (most common)
    {
      name: "User + Poll (candidate prefix)",
      seeds: [Buffer.from("candidate"), pollIdBN.toArrayLike(Buffer, "le", 8), userPublicKey.toBuffer()]
    },
    {
      name: "User + Poll (no prefix)",
      seeds: [pollIdBN.toArrayLike(Buffer, "le", 8), userPublicKey.toBuffer()]
    },
    {
      name: "Poll + User (candidate prefix)",
      seeds: [Buffer.from("candidate"), userPublicKey.toBuffer(), pollIdBN.toArrayLike(Buffer, "le", 8)]
    },
    {
      name: "User + Poll (candidates prefix)",
      seeds: [Buffer.from("candidates"), pollIdBN.toArrayLike(Buffer, "le", 8), userPublicKey.toBuffer()]
    },
    {
      name: "User only (candidate prefix)",
      seeds: [Buffer.from("candidate"), userPublicKey.toBuffer()]
    },
    {
      name: "User + Poll + counter",
      seeds: [Buffer.from("candidate"), userPublicKey.toBuffer(), pollIdBN.toArrayLike(Buffer, "le", 8), Buffer.from("1")]
    },

    // Candidate ID patterns
    {
      name: "Poll + CandidateID=1 (candidate prefix)",
      seeds: [Buffer.from("candidate"), pollIdBN.toArrayLike(Buffer, "le", 8), new BN(1).toArrayLike(Buffer, "le", 8)]
    },
    {
      name: "Poll + CandidateID=1 (no prefix)",
      seeds: [pollIdBN.toArrayLike(Buffer, "le", 8), new BN(1).toArrayLike(Buffer, "le", 8)]
    },
    {
      name: "CandidateID=1 + Poll",
      seeds: [Buffer.from("candidate"), new BN(1).toArrayLike(Buffer, "le", 8), pollIdBN.toArrayLike(Buffer, "le", 8)]
    },

    // String-based patterns
    {
      name: "String poll + user",
      seeds: [Buffer.from("candidate"), Buffer.from(pollId.toString()), userPublicKey.toBuffer()]
    },
    {
      name: "User + string poll",
      seeds: [Buffer.from("candidate"), userPublicKey.toBuffer(), Buffer.from(pollId.toString())]
    },

    // Big endian patterns
    {
      name: "User + Poll (big endian)",
      seeds: [Buffer.from("candidate"), pollIdBN.toArrayLike(Buffer, "be", 8), userPublicKey.toBuffer()]
    },

    // Registration-based patterns
    {
      name: "Registration + Poll + User",
      seeds: [Buffer.from("registration"), pollIdBN.toArrayLike(Buffer, "le", 8), userPublicKey.toBuffer()]
    },
    {
      name: "User registration",
      seeds: [Buffer.from("user_registration"), userPublicKey.toBuffer()]
    },
  ];

  // Add Poll PDA based patterns
  try {
    const [pollPda] = await getPollPDA(pollIdBN, programId);
    allPatterns.push(
      {
        name: "Poll PDA + User",
        seeds: [Buffer.from("candidate"), pollPda.toBuffer(), userPublicKey.toBuffer()]
      },
      {
        name: "Poll PDA + CandidateID=1",
        seeds: [Buffer.from("candidate"), pollPda.toBuffer(), new BN(1).toArrayLike(Buffer, "le", 8)]
      }
    );
  } catch (pollPdaError) {
    console.log("Could not get poll PDA for additional patterns");
  }

  console.log(`Testing ${allPatterns.length} different PDA patterns...`);

  for (let i = 0; i < allPatterns.length; i++) {
    try {
      const pattern = allPatterns[i];
      const [pda] = PublicKey.findProgramAddressSync(pattern.seeds, programId);
      const accountInfo = await connection.getAccountInfo(pda);

      console.log(`${i + 1}. ${pattern.name}`);
      console.log(`   PDA: ${pda.toString()}`);
      console.log(`   Exists: ${!!accountInfo}`);

      if (accountInfo) {
        console.log(`   ✅ FOUND EXISTING CANDIDATE ACCOUNT!`);
        console.log(`   Account size: ${accountInfo.data.length} bytes`);
        console.log(`   ✅ THIS IS THE CORRECT PATTERN: ${pattern.name}`);
        return {
          patternName: pattern.name,
          seeds: pattern.seeds,
          pda,
          patternIndex: i + 1
        };
      }

    } catch (error) {
      console.log(`${i + 1}. ${allPatterns[i].name}: ERROR - ${error}`);
    }
  }

  console.log("❌ No existing candidate accounts found with any pattern");
  console.log("This means either:");
  console.log("1. No candidates have been registered yet");
  console.log("2. The program uses a completely different pattern");

  return null;
};

// ✅ AUTO-REGISTERING FUNCTION THAT TRIES ALL PATTERNS
export const registerCandidateAllPatterns = async (
  program: any,
  wallet: any,
  pollId: number,
  candidateName: string,
  programId: PublicKey
) => {
  console.log("🚀 TRYING ALL PATTERNS FOR REGISTRATION");

  const pollIdBN = new BN(pollId);
  const [pollPda] = await getPollPDA(pollIdBN, programId);
  const [registrationsPda] = await getRegistrationsPDA(programId);

  // All possible candidate PDA patterns to try
  const registrationPatterns = [
    // Pattern 1: User-based (most common in voting)
    {
      name: "User + Poll",
      getPDA: () => PublicKey.findProgramAddressSync([
        Buffer.from("candidate"),
        pollIdBN.toArrayLike(Buffer, "le", 8),
        wallet.publicKey.toBuffer()
      ], programId)
    },

    // Pattern 2: Poll + User
    {
      name: "Poll + User", 
      getPDA: () => PublicKey.findProgramAddressSync([
        Buffer.from("candidate"),
        wallet.publicKey.toBuffer(),
        pollIdBN.toArrayLike(Buffer, "le", 8)
      ], programId)
    },

    // Pattern 3: No prefix
    {
      name: "No prefix",
      getPDA: () => PublicKey.findProgramAddressSync([
        pollIdBN.toArrayLike(Buffer, "le", 8),
        wallet.publicKey.toBuffer()
      ], programId)
    },

    // Pattern 4: Candidate ID based (get current count first)
    {
      name: "Candidate ID based",
      getPDA: async () => {
        const poll = await program.account.poll.fetch(pollPda);
        const candidateCount = poll.candidates?.toNumber ? poll.candidates.toNumber() : poll.candidates;
        const candidateId = new BN(candidateCount + 1);
        return PublicKey.findProgramAddressSync([
          Buffer.from("candidate"),
          pollIdBN.toArrayLike(Buffer, "le", 8),
          candidateId.toArrayLike(Buffer, "le", 8)
        ], programId);
      }
    },

    // Pattern 5: User only
    {
      name: "User only",
      getPDA: () => PublicKey.findProgramAddressSync([
        Buffer.from("candidate"),
        wallet.publicKey.toBuffer()
      ], programId)
    },

    // Pattern 6: Different prefix
    {
      name: "Different prefix (candidates)",
      getPDA: () => PublicKey.findProgramAddressSync([
        Buffer.from("candidates"),
        pollIdBN.toArrayLike(Buffer, "le", 8),
        wallet.publicKey.toBuffer()
      ], programId)
    },

    // Pattern 7: Registration prefix
    {
      name: "Registration prefix",
      getPDA: () => PublicKey.findProgramAddressSync([
        Buffer.from("registration"),
        pollIdBN.toArrayLike(Buffer, "le", 8),
        wallet.publicKey.toBuffer()
      ], programId)
    },

    // Pattern 8: Poll PDA based
    {
      name: "Poll PDA based",
      getPDA: () => PublicKey.findProgramAddressSync([
        Buffer.from("candidate"),
        pollPda.toBuffer(),
        wallet.publicKey.toBuffer()
      ], programId)
    },

    // Pattern 9: No prefix, just user and poll
    {
      name: "Just user and poll",
      getPDA: () => PublicKey.findProgramAddressSync([
        wallet.publicKey.toBuffer(),
        pollIdBN.toArrayLike(Buffer, "le", 8)
      ], programId)
    },

    // Pattern 10: String-based
    {
      name: "String-based",
      getPDA: () => PublicKey.findProgramAddressSync([
        Buffer.from("candidate"),
        Buffer.from(pollId.toString()),
        wallet.publicKey.toBuffer()
      ], programId)
    }
  ];

  for (let i = 0; i < registrationPatterns.length; i++) {
    try {
      const pattern = registrationPatterns[i];
      console.log(`Trying pattern ${i + 1}: ${pattern.name}`);

      const pdaResult = await pattern.getPDA();
      const candidatePda = Array.isArray(pdaResult) ? pdaResult[0] : pdaResult;

      console.log(`Generated PDA: ${candidatePda.toString()}`);

      // Try the transaction
      const tx = await program.methods
        .registerCandidate(pollIdBN, candidateName)
        .accounts({
          user: wallet.publicKey,
          poll: pollPda,
          registrations: registrationsPda,
          candidate: candidatePda,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      console.log(`✅ SUCCESS! Pattern ${i + 1} (${pattern.name}) worked!`);
      console.log(`Transaction: ${tx}`);
      console.log(`Working PDA: ${candidatePda.toString()}`);

      return {
        success: true,
        pattern: pattern.name,
        pda: candidatePda.toString(),
        signature: tx,
        patternIndex: i + 1
      };

    } catch (error: any) {
      console.log(`Pattern ${i + 1} failed:`, error.message || error);
      continue;
    }
  }

  console.log("❌ All patterns failed");
  return { success: false, error: "No valid PDA pattern found" };
};

// Error handling function
export const handleTransactionError = (error: any): string => {
  if (error.message) {
    return error.message;
  }

  if (error.toString) {
    return error.toString();
  }

  return "Unknown error occurred";
};

// Anchor program hook
export function useAnchorProgram() {
  const { connection } = useConnection();
  const wallet = useAnchorWallet();
  const { connected } = useWallet();

  const [hasIdl, setHasIdl] = useState(false);
  const [idlError, setIdlError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const program = useMemo(() => {
    if (!wallet || !connected) {
      setIsLoading(false);
      return null;
    }

    try {
      const provider = new AnchorProvider(connection, wallet, {
        commitment: "confirmed",
      });

      setProvider(provider);

      const program = new Program(votingIdl as Idl, provider);
      setHasIdl(true);
      setIdlError(null);
      setIsLoading(false);

      return program;
    } catch (error: any) {
      setIdlError(error.message || "Failed to load program");
      setHasIdl(false);
      setIsLoading(false);
      return null;
    }
  }, [connection, wallet, connected]);

  return {
    program,
    connection,
    wallet,
    programId: PROGRAM_ID,
    hasIdl,
    idlError,
    isLoading,
  };
}
