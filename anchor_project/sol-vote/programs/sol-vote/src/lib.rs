#![allow(clippy::result_large_err)]
use anchor_lang::prelude::*;

pub mod mod_utils;
pub mod errors;
pub mod instructions;
pub mod states;

pub use instructions::*;

declare_id!("3pR1X3YKWYNEtniUAC9cDQMBmyxK9eEYmW36NQwZF25f");

#[program]
pub mod sol_vote {

    use crate::states::poll;

    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()>{
        instructions::initialize(ctx)
    } 
    
    pub fn create_poll(ctx: Context<CreatePoll>, description: String, start: u64, end: u64) -> Result<()>{
        instructions::create_poll(ctx, description, start, end)
    }

    pub fn register_candidate(
        ctx: Context<RegisterCandidate>,
        poll_id: u64,
        name: String
    ) -> Result<()>{

        instructions::register_candidate(ctx, poll_id, name)
    }

    pub fn vote(ctx: Context<VoteCandidate>, poll_id: u64, cid: u64) -> Result<()> {
        instructions::vote(ctx, poll_id, cid)
    }


}
