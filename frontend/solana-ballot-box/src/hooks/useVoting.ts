"use client";

import { useState, useCallback } from "react";
import {
  useAnchorProgram,
  getCounterPDA,
  getRegistrationsPDA,
  getPollPDA,
  getCandidatePDA,
  getVoterPDA,
  handleTransactionError,
} from "../lib/anchor/program";
import { BN } from "@coral-xyz/anchor";
import { SystemProgram, Keypair, PublicKey } from "@solana/web3.js";
import { PollCardData, CandidateData } from "@/types";

const showToast = {
  success: (msg: string) => (
    alert(`✅ ${msg}`), console.log(`✅ SUCCESS: ${msg}`)
  ),
  error: (msg: string) => (
    alert(`❌ ${msg}`), console.error(`❌ ERROR: ${msg}`)
  ),
  info: (msg: string) => (alert(`ℹ️ ${msg}`), console.log(`ℹ️ INFO: ${msg}`)),
  warning: (msg: string) => (
    alert(`⚠️ ${msg}`), console.warn(`⚠️ WARNING: ${msg}`)
  ),
};

const bnToNumber = (bn: any, field = "unknown"): number => {
  try {
    if (bn == null) return 0;
    if (typeof bn === "number") return bn;
    if (typeof bn === "string") return parseInt(bn) || 0;
    if (typeof bn === "object" && typeof bn.toNumber === "function")
      return bn.toNumber();
    return parseInt(bn.toString()) || 0;
  } catch {
    console.error(`bnToNumber failed for ${field}`, bn);
    return 0;
  }
};

const bnToDate = (bn: any, field = "unknown"): Date => {
  const seconds = bnToNumber(bn, field);
  return new Date(seconds > 1e12 ? seconds : seconds * 1000);
};

export function useVoting() {
  const {
    program,
    connection,
    wallet,
    programId,
    hasIdl,
    idlError,
    isLoading: programLoading,
  } = useAnchorProgram();

  const [loading, setLoading] = useState(false);

  const checkInitialized = useCallback(async () => {
    if (!program) return false;
    try {
      const [counterPda] = await getCounterPDA(programId);
      await program.account.counter.fetch(counterPda);
      return true;
    } catch {
      return false;
    }
  }, [program, programId]);

  const pollExists = useCallback(
    async (pollId: number) => {
      if (!program) return false;
      try {
        const [pollPda] = await getPollPDA(new BN(pollId), programId);
        const acc = await connection.getAccountInfo(pollPda);
        return !!acc;
      } catch {
        return false;
      }
    },
    [program, connection, programId]
  );

  const initialize = useCallback(async () => {
    if (programLoading)
      return showToast.info("Program loading"), { success: false };
    if (idlError) return showToast.error(idlError), { success: false };
    if (!program || !wallet)
      return showToast.error("Wallet/program missing"), { success: false };

    setLoading(true);
    try {
      const [counterPda] = await getCounterPDA(programId);
      const [registrationsPda] = await getRegistrationsPDA(programId);

      if (await checkInitialized())
        return showToast.info("Already initialized"), { success: true };

      const sig = await program.methods
        .initialize()
        .accounts({
          user: wallet.publicKey,
          counter: counterPda,
          registrations: registrationsPda,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      showToast.success("Program initialized");
      return { success: true, signature: sig };
    } catch (err: any) {
      showToast.error(handleTransactionError(err));
      return { success: false };
    } finally {
      setLoading(false);
    }
  }, [program, wallet, programId, programLoading, idlError, checkInitialized]);

  const createPoll = useCallback(
  async (description: string, start: Date, end: Date) => {
    if (programLoading)
      return showToast.info("Program loading"), { success: false };
    if (!program || !wallet)
      return showToast.error("Wallet/program missing"), { success: false };
    if (!hasIdl) return showToast.error("IDL not loaded"), { success: false };

    if (start >= end)
      return showToast.error("End must be after start"), { success: false };
    if (Date.now() >= start.getTime())
      return showToast.error("Start must be in future"), { success: false };

    setLoading(true);
    try {
      if (!(await checkInitialized()))
        return (
          showToast.error("Initialize program first"), { success: false }
        );

      const [counterPda] = await getCounterPDA(programId);
      const counterAcct = await program.account.counter.fetch(counterPda);
      const nextPollId = bnToNumber(counterAcct.count) + 1;

      const startSec = Math.floor(start.getTime() / 1000);
      const endSec = Math.floor(end.getTime() / 1000);

      // Use the consistent getPollPDA function
      const [pollPda] = await getPollPDA(new BN(nextPollId), programId);

      const tx = await program.methods
        .createPoll(description, new BN(startSec), new BN(endSec))
        .accounts({
          user: wallet.publicKey,
          poll: pollPda,
          counter: counterPda,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
        
      showToast.success(`Poll #${nextPollId} created`);
      return {
        success: true,
        pollId: nextPollId,
        pollAddress: pollPda.toString(),
        signature: tx,
      };
    } catch (err: any) {
      console.error("Create poll error:", err);
      showToast.error(handleTransactionError(err));
      return { success: false };
    } finally {
      setLoading(false);
    }
  },
  [program, wallet, programId, programLoading, hasIdl, checkInitialized]
);


  const registerCandidate = useCallback(
  async (pollId: number, name: string) => {
    if (!name.trim())
      return showToast.error("Name required"), { success: false };
    if (programLoading)
      return showToast.info("Program loading"), { success: false };
    if (!program || !wallet)
      return showToast.error("Wallet/program"), { success: false };

    setLoading(true);
    try {
      if (!(await pollExists(pollId)))
        return showToast.error("Poll missing"), { success: false };

      const pollIdBN = new BN(pollId);
      const [pollPda] = await getPollPDA(pollIdBN, programId);
      const [registrationsPda] = await getRegistrationsPDA(programId);

      // Get the current registrations count to determine next candidate ID
      const registrations = await program.account.registrations.fetch(
        registrationsPda
      );
      const nextCandidateId = bnToNumber(registrations.count) + 1;
      
      // Use the correct PDA derivation: poll_id + candidate_id
      const [candidatePda] = await getCandidatePDA(
        pollIdBN,
        new BN(nextCandidateId),
        programId
      );

      const sig = await program.methods
        .registerCandidate(pollIdBN, name)
        .accounts({
          user: wallet.publicKey,
          poll: pollPda,
          candidate: candidatePda,
          registrations: registrationsPda,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      showToast.success(`Candidate #${nextCandidateId} registered`);
      return { success: true, candidateId: nextCandidateId, signature: sig };
    } catch (err: any) {
      console.error("Register candidate error:", err);
      showToast.error(handleTransactionError(err));
      return { success: false };
    } finally {
      setLoading(false);
    }
  },
  [program, wallet, programId, programLoading, pollExists]
);


  const vote = useCallback(
  async (pollId: number, cid: number) => {
    if (programLoading)
      return showToast.info("Program loading"), { success: false };
    if (!program || !wallet)
      return showToast.error("Wallet/program"), { success: false };

    setLoading(true);
    try {
      if (!(await pollExists(pollId)))
        return showToast.error("Poll missing"), { success: false };

      const pollIdBN = new BN(pollId);
      const cidBN = new BN(cid);
      const [pollPda] = await getPollPDA(pollIdBN, programId);
      const [candidatePda] = await getCandidatePDA(
        pollIdBN,
        cidBN,
        programId
      );
      const [voterPda] = await getVoterPDA(
        pollIdBN,
        wallet.publicKey,
        programId
      );
      const [registrationsPda] = await getRegistrationsPDA(programId);

      const sig = await program.methods
        .vote(pollIdBN, cidBN)
        .accounts({
          user: wallet.publicKey,
          poll: pollPda,
          candidate: candidatePda,
          voter: voterPda,
          registrations: registrationsPda,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      showToast.success("Vote cast successfully!");
      
      // ✅ ADD: Force refresh of candidate data
      // This will trigger a re-fetch of candidate data in components that use this hook
      return { success: true, signature: sig, shouldRefresh: true };
    } catch (err: any) {
      showToast.error(handleTransactionError(err));
      return { success: false };
    } finally {
      setLoading(false);
    }
  },
  [program, wallet, programId, programLoading, pollExists]
);


  const getPoll = useCallback(
    async (pollId: number) => {
      if (!program) return null;
      try {
        const [pollPda] = await getPollPDA(new BN(pollId), programId);
        return await program.account.poll.fetch(pollPda);
      } catch {
        return null;
      }
    },
    [program, programId]
  );

  const getCandidate = useCallback(
    async (pollId: number, cid: number) => {
      if (!program) return null;
      try {
        const [candPda] = await getCandidatePDA(
          new BN(pollId),
          new BN(cid),
          programId
        );
        return await program.account.candidate.fetch(candPda);
      } catch {
        return null;
      }
    },
    [program, programId]
  );

  const hasUserVoted = useCallback(
    async (pollId: number) => {
      if (!program || !wallet) return false;
      try {
        const [voterPda] = await getVoterPDA(
          new BN(pollId),
          wallet.publicKey,
          programId
        );
        const voter = await program.account.voter.fetch(voterPda);
        return voter.hasVoted;
      } catch {
        return false;
      }
    },
    [program, wallet, programId]
  );

  const getAllPolls = useCallback(async (): Promise<PollCardData[]> => {
    if (!program) return [];
    try {
      const [counterPda] = await getCounterPDA(programId);
      const counter = await program.account.counter.fetch(counterPda);
      const max = bnToNumber(counter.count);
      const list: PollCardData[] = [];

      for (let i = 1; i <= max; i++) {
        if (!(await pollExists(i))) continue;
        const p = await getPoll(i);
        if (!p) continue;
        list.push({
          id: i,
          title: `Poll #${i}`,
          description: p.description,
          startTime: bnToDate(p.start),
          endTime: bnToDate(p.end),
          candidateCount: bnToNumber(p.candidates),
          totalVotes: 0,
          isActive: Date.now() / 1000 < bnToNumber(p.end),
          status:
            Date.now() / 1000 < bnToNumber(p.start)
              ? "draft"
              : Date.now() / 1000 > bnToNumber(p.end)
              ? "ended"
              : "active",
        });
      }
      return list.sort((a, b) => b.id - a.id);
    } catch (err) {
      console.error("getAllPolls error:", err);
      return [];
    }
  }, [program, programId, pollExists, getPoll]);

  const getPollCandidates = useCallback(
  async (pollId: number): Promise<CandidateData[]> => {
    if (!program) {
      console.log("❌ Program not available");
      return [];
    }
    
    console.log("🔍 Fetching candidates for poll:", pollId);

    try {
      // Method 1: Get ALL candidate accounts first (no filtering)
      console.log("📊 Fetching all candidate accounts...");
      const allCandidates = await program.account.candidate.all();
      console.log("📊 Total candidate accounts found:", allCandidates.length);

      // Method 2: Filter client-side by poll_id
      const pollCandidates = allCandidates.filter((candidateAccount) => {
        const candidate = candidateAccount.account;
        const candidatePollId = bnToNumber(candidate.pollId);
        console.log(`🔍 Candidate ${bnToNumber(candidate.cid)}: poll_id=${candidatePollId}, target=${pollId}`);
        return candidatePollId === pollId;
      });

      console.log("📊 Candidates for this poll:", pollCandidates.length);

      const candidates: CandidateData[] = pollCandidates.map((candidateAccount) => {
        const candidate = candidateAccount.account;
        return {
          id: bnToNumber(candidate.cid),
          pollId: pollId,
          name: candidate.name,
          votes: bnToNumber(candidate.votes),
          bio: `Candidate for Poll #${pollId}`,
          percentage: 0,
        };
      });

      // Calculate percentages
      const totalVotes = candidates.reduce((sum, c) => sum + c.votes, 0);
      candidates.forEach((c) => {
        c.percentage = totalVotes > 0 ? (c.votes / totalVotes) * 100 : 0;
      });

      console.log("✅ Final candidates:", candidates);
      return candidates.sort((a, b) => a.id - b.id);

    } catch (error) {
      console.error("❌ Error fetching candidates:", error);
      return [];
    }
  },
  [program]
);



  return {
    initialize,
    createPoll,
    registerCandidate,
    vote,
    getPoll,
    getCandidate,
    getAllPolls,
    getPollCandidates,
    hasUserVoted,
    pollExists,
    checkInitialized,
    loading,
    programLoading,
    connected: !!wallet,
    idlError,
    hasIdl,
    program,
    wallet,
  };
}
