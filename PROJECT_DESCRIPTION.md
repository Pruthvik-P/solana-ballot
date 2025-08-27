
# Project Description

**Deployed Frontend URL:** [Add your deployment URL here]
**Solana Program ID:** 3pR1X3YKWYNEtniUAC9cDQMBmyxK9eEYmW36NQwZF25f

## Project Overview

### Description

A comprehensive decentralized voting application built on Solana blockchain. Users can create time-based polls, register as candidates, and cast votes in a completely transparent and immutable way. The dApp leverages Solana's speed and low-cost transactions to enable real-time voting with instant result updates. Each poll has its own candidate ecosystem with automatic vote tallying and percentage calculations, making it perfect for community governance, elections, or any decision-making process requiring transparency.

### Key Features

- **Create Polls**: Set up time-based polls with custom descriptions and voting periods
- **Candidate Registration**: Anyone can register as a candidate for active polls
- **Secure Voting**: Cast votes with blockchain verification preventing double voting
- **Real-time Results**: View live vote counts and percentage distributions
- **Time Management**: Automatic poll status tracking (upcoming, active, ended)
- **Wallet Integration**: Seamless connection with Phantom, Solflare, and other Solana wallets
- **Transaction History**: Full transparency with on-chain transaction records

### How to Use the dApp

1. **Connect Wallet** - Connect your Solana wallet (Phantom, Solflare, etc.)
2. **Initialize Program** - First-time setup to initialize global program state
3. **Create Poll** - Set poll description, start time, and end time for your voting period
4. **Register as Candidate** - Submit your candidacy for any active poll
5. **Cast Votes** - Vote for your preferred candidate in active polls
6. **View Results** - Monitor real-time vote counts and poll outcomes
7. **Track History** - Review all past polls and voting patterns

## Program Architecture

The Voting dApp implements a multi-account architecture supporting multiple concurrent polls with independent candidate registration and voting systems. The program uses a combination of global state management and poll-specific accounts to ensure scalability and data integrity across unlimited polls and candidates.

### PDA Usage

The program strategically uses Program Derived Addresses to create deterministic, secure accounts for all voting components.

**PDAs Used:**
- **Counter PDA**: Derived from seeds `["counter"]` - maintains global poll count and program initialization state
- **Registrations PDA**: Derived from seeds `["registrations"]` - tracks total candidate registrations across all polls
- **Poll PDA**: Derived from seeds `[poll_id.to_le_bytes()]` - unique account for each poll containing metadata and timing
- **Candidate PDA**: Derived from seeds `["candidate", poll_id.to_le_bytes(), candidate_id.to_le_bytes()]` - individual candidate accounts with vote tallies
- **Voter PDA**: Derived from seeds `["voter", poll_id.to_le_bytes(), voter_pubkey]` - prevents double voting by tracking user participation per poll

### Program Instructions

**Instructions Implemented:**
- **Initialize**: Sets up global program state including counter and registrations tracking
- **Create Poll**: Creates a new poll with description, start time, end time, and initializes candidate counter
- **Register Candidate**: Allows users to register as candidates for active polls with name validation
- **Vote**: Enables users to cast votes for candidates in active polls with timing and duplicate validation
- **Helper Functions**: Various getter functions for retrieving poll data, candidate information, and voting status

### Account Structure

```rust
#[account]
pub struct Counter {
    pub count: u64,              // Total number of polls created
}

#[account]
pub struct Registrations {
    pub count: u64,              // Global candidate registration counter
}

#[account]
pub struct Poll {
    pub id: u64,                 // Unique poll identifier
    pub description: String,     // Poll description/question
    pub start: i64,              // Unix timestamp for voting start
    pub end: i64,                // Unix timestamp for voting end
    pub candidates: u64,         // Number of registered candidates
}

#[account]
pub struct Candidate {
    pub id: u64,                 // Candidate identifier within poll
    pub poll: u64,               // Associated poll ID
    pub name: String,            // Candidate name/description
    pub votes: u64,              // Current vote count
}

#[account]
pub struct Voter {
    pub poll: u64,               // Poll ID where vote was cast
    pub candidate: u64,          // Candidate ID voted for
    pub has_voted: bool,         // Voting status flag
}
```

## Testing

### Test Coverage

Comprehensive test suite covering all voting scenarios including edge cases, timing validations, and security constraints to ensure election integrity and prevent manipulation.

**Happy Path Tests:**
- **Initialize Program**: Successfully sets up global state with correct initial values
- **Create Poll**: Creates polls with valid timing and proper account initialization
- **Register Candidate**: Successfully registers candidates for active polls
- **Cast Vote**: Properly records votes and updates candidate tallies
- **Time-based Operations**: Validates correct behavior during different poll phases

**Unhappy Path Tests:**
- **Double Initialization**: Fails when trying to initialize already initialized program
- **Invalid Poll Timing**: Fails when start time is after end time or in the past
- **Unauthorized Registration**: Fails when registering for ended or non-existent polls
- **Double Voting**: Prevents users from voting multiple times in the same poll
- **Vote Timing Violations**: Blocks voting before start time or after end time
- **Invalid Candidates**: Fails when voting for non-existent candidates
- **Account Conflicts**: Proper error handling for PDA derivation conflicts

### Running Tests

```bash
# Install dependencies
yarn install

# Run comprehensive test suite
anchor test

# Run with verbose output
anchor test --skip-build

# Test specific instruction
anchor test --skip-build -- --grep "vote"
```

### Additional Notes for Evaluators

Building this voting dApp was an incredible journey into Solana's architecture! The most challenging aspects were managing the complex relationship between polls, candidates, and voters while ensuring data integrity across multiple concurrent voting sessions. 

**Key Learning Points:**
- **PDA Management**: Understanding how to derive deterministic addresses for different account types was crucial for the multi-poll architecture
- **Time Validation**: Implementing proper Unix timestamp handling for poll timing required careful consideration of timezone conversions and edge cases
- **Vote Integrity**: Designing the voter tracking system to prevent double voting while maintaining user privacy was particularly challenging
- **Frontend Integration**: Connecting the complex on-chain state to a user-friendly interface required extensive error handling and state management

**Technical Challenges Overcome:**
- **Candidate ID Assignment**: Developing a system to assign unique candidate IDs within each poll while maintaining global registration tracking
- **Real-time Updates**: Implementing frontend updates that reflect blockchain state changes immediately after transactions
- **Transaction Sequencing**: Handling the asynchronous nature of blockchain transactions for dependent operations like candidate registration after poll creation

The final result is a production-ready voting platform that could genuinely be used for community governance, organizational elections, or any scenario requiring transparent, tamper-proof voting mechanisms.
