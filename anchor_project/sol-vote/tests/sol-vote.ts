import * as anchor from "@coral-xyz/anchor";
import { PublicKey, SystemProgram } from "@solana/web3.js";

describe("sol-vote", () => {
  const provider = anchor.AnchorProvider.local();
  anchor.setProvider(provider);
  const program = anchor.workspace.sol_vote

  let PID: any, CID: any;
  it("Initialize and create a poll", async () => {
    const user = provider.wallet

    const [counterPda] = await PublicKey.findProgramAddressSync(
      [Buffer.from("counter")],
      program.programId
    );
    const [registrationsPda] = await PublicKey.findProgramAddressSync(
      [Buffer.from("registrations")],
      program.programId
    );

    let counter;
    try{
      counter = await program.account.counter.fetch(counterPda);
      console.log("Counter already initialized:", counter.count.toString());
    } catch (err){
      console.log("Counter not initialized, initializing now...");

      await program.rpc.initialize({
        accounts: {
          user: user.publicKey,
          counter: counterPda,
          registrations: registrationsPda,
          systemProgram: SystemProgram.programId,
        }
      });
      counter = await program.account.counter.fetch(counterPda);
      console.log("Counter initialized:", counter.count.toString());
    }

    PID = counter.count.add(new anchor.BN(1))
    const [pollPda] = await PublicKey.findProgramAddressSync(
      [PID.toArrayLike(Buffer, "le", 8)],
      program.programId
    )

    const description = `Poll #${PID}`
    const start = new anchor.BN(Date.now() / 1000);
    const end = new anchor.BN(Date.now() / 1000 + 86400);

    await program.rpc.createPoll(description, start, end, {
      accounts: {
        user: user.publicKey,
        poll: pollPda,
        counter: counterPda,
        systemProgram: SystemProgram.programId,
      }
    })

    const poll = await program.account.poll.fetch(pollPda);
    console.log("Poll created:", poll)
  });

  it("Register a candidate", async () => {
    const user = provider.wallet;

    const [pollPda] = await PublicKey.findProgramAddressSync(
      [PID.toArrayLike(Buffer, "le", 8)],
      program.programId
    );

    const [registrationsPda] = await PublicKey.findProgramAddressSync(
      [Buffer.from("registrations")],
      program.programId
    );  


    const regs = await program.account.registrations.fetch(registrationsPda);
    CID = regs.count.add(new anchor.BN(1));
    
    const candidateName = `Candidate #${CID}`;

    const [candidatePda] = await PublicKey.findProgramAddressSync(
      [
        PID.toArrayLike(Buffer, "le", 8),
        CID.toArrayLike(Buffer, "le", 8)
      ],
      program.programId
    )

    await program.rpc.registerCandidate(PID, candidateName, {
      accounts: {
        user: user.publicKey,
        poll: pollPda,
        registrations: registrationsPda,
        candidate: candidatePda,
        systemProgram: SystemProgram.programId,
      }
    });

    const candidate = await program.account.poll.fetch(pollPda);
    console.log("Candidate registered:", candidate);
  })

  it("Vote a Candidate", async () => {
    const user = provider.wallet;

    const [pollPda] = await PublicKey.findProgramAddressSync(
      [PID.toArrayLike(Buffer, "le", 8)],
      program.programId
    )

    const [candidatePda] = await PublicKey.findProgramAddressSync(
      [
        PID.toArrayLike(Buffer, "le", 8),
        CID.toArrayLike(Buffer, "le", 8)
      ],
      program.programId
    )

    const [voterPda] = await PublicKey.findProgramAddressSync(
      [
        Buffer.from("voter"), 
        PID.toArrayLike(Buffer, "le", 8), 
        user.publicKey.toBuffer(),
      ],
      program.programId
    )

    const [registrationsPda] = await PublicKey.findProgramAddressSync(
      [Buffer.from("registrations")],
      program.programId
    );

    await program.rpc.vote(PID, CID, {
      accounts: {
        user: user.publicKey,
        poll: pollPda,
        candidate: candidatePda,
        voter: voterPda,
        registrations: registrationsPda,
        systemProgram: SystemProgram.programId,
      }
    })

    const voter = await program.account.voter.fetch(voterPda);
    console.log("Voter:", voter);

    const candidate = await program.account.candidate.fetch(candidatePda);
    console.log("Candidate votes left after voting:", candidate.votes.toString());
  })
});