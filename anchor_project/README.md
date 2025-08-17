# Sol-Vote Anchor Program

This directory contains the Solana smart contract (program) for the Sol-Vote decentralized voting application, built using the [Anchor](https://book.anchor-lang.com/) framework.

## Directory Structure

- `programs/sol-vote/`  
  Rust source code for the Solana program.
- `tests/`  
  TypeScript tests for program instructions.
- `migrations/`  
  Deployment scripts.
- `.anchor/`  
  Anchor build artifacts and logs.
- `target/`  
  Build output.
- `test-ledger/`  
  Local test ledger files.

## Features

- Create and manage polls on Solana.
- Register candidates for polls.
- Vote for candidates in active polls.
- All state managed on-chain using PDAs for deterministic account addresses.

## Development

### Prerequisites

- [Anchor CLI](https://book.anchor-lang.com/chapter_1/installation.html)
- [Solana CLI](https://docs.solana.com/cli/install-solana-cli-tools)
- Node.js & Yarn

### Build & Test

```bash
yarn install
anchor build
anchor test
```

### Deploy

Update `Anchor.toml` with your wallet and cluster, then run:

```bash
anchor deploy
```

## Program Structure

### Instructions

- `initialize` – Initializes counter and registrations accounts.
- `create_poll` – Creates a new poll.
- `register_candidate` – Registers a candidate for a poll.
- `vote` – Casts a vote for a candidate.

### Accounts

- `Counter` – Tracks poll count.
- `Poll` – Stores poll details.
- `Candidate` – Stores candidate details.
- `Voter` – Tracks voting status.
- `Registrations` – Tracks candidate registrations.

See `programs/sol-vote/src` for Rust source code.

## License

ISC

---

For more details, see the [main README](../../README.md)