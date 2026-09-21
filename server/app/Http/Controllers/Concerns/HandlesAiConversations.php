<?php

namespace App\Http\Controllers\Concerns;

use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;
use Laravel\Ai\Models\Conversation;
use Laravel\Ai\Models\ConversationMessage;
use Symfony\Component\HttpFoundation\Response as HttpResponse;

/**
 * The parts of an AI chat page that don't depend on who is chatting: listing
 * a user's conversations, rebuilding a message's charts and tables from
 * history, and answering an out-of-scope message without calling the model.
 */
trait HandlesAiConversations
{
    /**
     * Tools whose calls are drawn in the chat rather than executed for data.
     *
     * @var list<string>
     */
    private const VISUAL_TOOLS = ['render_chart', 'render_table', 'render_list', 'ask_clarifying_question'];

    /**
     * The participant's conversations, most recently active first.
     *
     * @return Collection<int, Conversation>
     */
    private function conversationsFor(Model $participant): Collection
    {
        return Conversation::query()
            ->where('participant_type', Conversation::participantType($participant))
            ->where('participant_id', Conversation::participantKey($participant))
            ->orderByDesc('updated_at')
            ->get(['id', 'title', 'updated_at']);
    }

    /**
     * The messages of a conversation as the chat page renders them.
     *
     * @return \Illuminate\Support\Collection<int, array{id: string, role: string, content: string, visuals: list<array{id: string, name: string, input: array<string, mixed>}>}>
     */
    private function messagesPayload(?Conversation $conversation): \Illuminate\Support\Collection
    {
        if (! $conversation) {
            return collect();
        }

        return $conversation->messages()->orderBy('id')->get()->map(fn (ConversationMessage $message): array => [
            'id' => $message->id,
            'role' => $message->role,
            'content' => $message->content,
            'visuals' => $this->visualsFor($message),
        ]);
    }

    /**
     * Whether the assistant's message ended by asking the user something.
     */
    private function askedQuestion(ConversationMessage $message): bool
    {
        if ($message->role !== 'assistant') {
            return false;
        }

        return collect($message->tool_calls ?? [])->contains('name', 'ask_clarifying_question')
            || str_ends_with(trim((string) $message->content), '?');
    }

    /**
     * Record an out-of-scope message and its refusal as a normal exchange,
     * and stream the refusal back without involving the model.
     *
     * @param  class-string  $agent
     */
    private function declineOffTopic(Conversation $thread, Model $participant, string $content, string $agent, string $refusal): HttpResponse
    {
        $shared = [
            'participant_type' => Conversation::participantType($participant),
            'participant_id' => Conversation::participantKey($participant),
            'agent' => $agent,
            'attachments' => [],
            'tool_calls' => [],
            'tool_results' => [],
            'usage' => [],
            'meta' => [],
        ];

        $thread->messages()->create([...$shared, 'id' => (string) Str::uuid7(), 'role' => 'user', 'content' => $content]);
        $thread->messages()->create([...$shared, 'id' => (string) Str::uuid7(), 'role' => 'assistant', 'content' => $refusal]);

        if ($thread->title === 'New chat') {
            $thread->update(['title' => str($content)->limit(60)->toString()]);
        }

        $textId = (string) Str::uuid7();
        $events = [
            ['type' => 'start', 'messageId' => (string) Str::uuid7()],
            ['type' => 'start-step'],
            ['type' => 'text-start', 'id' => $textId],
            ['type' => 'text-delta', 'id' => $textId, 'delta' => $refusal],
            ['type' => 'text-end', 'id' => $textId],
            ['type' => 'finish-step'],
            ['type' => 'finish', 'finishReason' => 'stop'],
        ];

        return response()->stream(function () use ($events) {
            foreach ($events as $event) {
                yield 'data: '.json_encode($event)."\n\n";
            }

            yield "data: [DONE]\n\n";
        }, headers: [
            'Cache-Control' => 'no-cache, no-transform',
            'Content-Type' => 'text/event-stream',
            'x-vercel-ai-ui-message-stream' => 'v1',
        ]);
    }

    /**
     * The display-tool calls (chart, table, list, question) the assistant
     * made in a message, so the UI can redraw them when history is reloaded.
     *
     * @return list<array{id: string, name: string, input: array<string, mixed>}>
     */
    private function visualsFor(ConversationMessage $message): array
    {
        if ($message->role !== 'assistant') {
            return [];
        }

        return collect($message->tool_calls ?? [])
            ->filter(fn (array $call): bool => in_array($call['name'] ?? null, self::VISUAL_TOOLS, true))
            ->map(fn (array $call): array => [
                'id' => (string) $call['id'],
                'name' => $call['name'],
                'input' => $call['arguments'] ?? [],
            ])
            ->values()
            ->all();
    }

    /**
     * Guard against acting on another user's conversation.
     */
    private function authorizeConversationFor(Conversation $thread, Model $participant): void
    {
        if ($thread->participant_type !== Conversation::participantType($participant)
            || $thread->participant_id !== Conversation::participantKey($participant)) {
            abort(404);
        }
    }
}
