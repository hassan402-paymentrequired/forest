<?php

namespace App\Ai\Agents;

use Laravel\Ai\Concerns\RemembersConversations;
use Laravel\Ai\Contracts\Agent;
use Laravel\Ai\Contracts\Conversational;
use Laravel\Ai\Promptable;
use Stringable;

/**
 * The conversational assistant available to a school's users. Conversation
 * history is persisted automatically by `RemembersConversations` — the
 * caller just needs to call `continue($conversationId, as: $schoolUser)`
 * before prompting or streaming.
 *
 * No tools yet — answering from the school's live data (attendance, grades,
 * enrollment, etc.) is a later addition, not part of standing this up.
 */
class SchoolAssistant implements Agent, Conversational
{
    use Promptable, RemembersConversations;

    /**
     * Get the instructions that the agent should follow.
     */
    public function instructions(): Stringable|string
    {
        return 'You are the assistant for a school administrator using an education '
            .'management platform. Be helpful, concise, and professional.';
    }
}
