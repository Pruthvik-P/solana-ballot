use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    #[msg("Invalid dates provided for the poll.")]
    InvalidDates,
    #[msg("Poll does not exist.")]
    PollDoesNotExist,
    #[msg("Candidate has already registered.")]
    CandidateAlreadyRegistered,
    #[msg("Candidate has not registered for this poll.")]
    CandidateNotRegistered,
    #[msg("Voter has already voted in this poll.")]
    VoterAlreadyVoted,
    #[msg("Poll is not active or has ended.")]
    PollNotActive,
}