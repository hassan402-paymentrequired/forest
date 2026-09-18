<?php

namespace App\Http\Controllers;

use App\Ai\Agents\SchoolAssistant;
use App\Ai\Query\QueryScope;
use App\Models\SchoolUser;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;
use Laravel\Ai\Models\Conversation;
use Laravel\Ai\Models\ConversationMessage;
use Laravel\Ai\Streaming\Events\TextDelta;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Throwable;

class AiChatController extends Controller
{
    /**
     * Reply used when the agent can't be reached — no provider configured
     * yet, a bad key, the provider is down, etc. Streamed instead of a 500
     * so the UI degrades gracefully either way.
     */
    private const FALLBACK_REPLY = "I couldn't reach the AI model just now — please try again in a moment.";

    /**
     * Display the assistant's chat page: the current user's conversations,
     * and the active conversation's message history.
     */
    public function index(Request $request): Response
    {
        $conversations = Conversation::query()
            ->where('participant_type', Conversation::participantType($this->schoolUser()))
            ->where('participant_id', Conversation::participantKey($this->schoolUser()))
            ->orderByDesc('updated_at')
            ->get(['id', 'title', 'updated_at']);

        $activeConversationId = $request->string('thread')->toString();
        $activeConversation = $activeConversationId !== ''
            ? $conversations->firstWhere('id', $activeConversationId)
            : $conversations->first();

        $messages = $activeConversation
            ? Conversation::find($activeConversation->id)?->messages
            : collect();

        $draft = $request->string('draft')->toString();

        return Inertia::render('ai/chat', [
            'threads' => $conversations,
            'activeThreadId' => $activeConversation?->id,
            'draft' => $draft !== '' ? $draft : null,
            'messages' => ($messages ?? collect())->map(fn (ConversationMessage $message) => [
                'id' => $message->id,
                'role' => $message->role,
                'content' => $message->content,
            ]),
        ]);
    }

    /**
     * Start a new, empty conversation. Carries a `draft` message forward
     * (e.g. from the docked assistant panel) so it lands pre-filled in the
     * new conversation's composer.
     */
    public function store(Request $request): RedirectResponse
    {
        $conversation = Conversation::create([
            'id' => (string) Str::uuid7(),
            'participant_type' => Conversation::participantType($this->schoolUser()),
            'participant_id' => Conversation::participantKey($this->schoolUser()),
            'title' => 'New chat',
        ]);

        return to_route('ai.chat', array_filter([
            'thread' => $conversation->id,
            'draft' => $request->string('draft')->toString() ?: null,
        ]));
    }

    /**
     * Rename a conversation.
     */
    public function update(Request $request, Conversation $thread): RedirectResponse
    {
        $this->authorizeConversation($thread);

        $validated = $request->validate([
            'title' => ['required', 'string', 'max:100'],
        ]);

        $thread->update(['title' => $validated['title']]);

        return back();
    }

    /**
     * Remove a conversation.
     */
    public function destroy(Conversation $thread): RedirectResponse
    {
        $this->authorizeConversation($thread);

        $thread->delete();

        return to_route('ai.chat');
    }

    /**
     * Persist the user's message and stream back the assistant's reply.
     */
    public function respond(Request $request, Conversation $thread): StreamedResponse
    {
        $this->authorizeConversation($thread);

        $validated = $request->validate([
            'content' => ['required', 'string'],
        ]);

        $schoolUser = $this->schoolUser();

        $agent = (new SchoolAssistant(QueryScope::school($schoolUser->school_id)))
            ->continue($thread->id, as: $schoolUser);

        return new StreamedResponse(function () use ($agent, $thread, $validated) {
            try {
                foreach ($agent->stream($validated['content']) as $event) {
                    if ($event instanceof TextDelta) {
                        echo $event->delta;

                        if (ob_get_level() > 0) {
                            ob_flush();
                        }
                        flush();
                    }
                }
            } catch (Throwable) {
                echo self::FALLBACK_REPLY;

                if (ob_get_level() > 0) {
                    ob_flush();
                }
                flush();
            }

            // Only replace the placeholder title — a title the user set via
            // rename() should never be overwritten by a later message.
            if ($thread->title === 'New chat') {
                $thread->update(['title' => str($validated['content'])->limit(60)->toString()]);
            }
        }, 200, [
            'Content-Type' => 'text/plain; charset=utf-8',
            'X-Accel-Buffering' => 'no',
            'Cache-Control' => 'no-cache',
        ]);
    }

    /**
     * Resolve the authenticated school user, guaranteed present by the
     * `auth:school` middleware these routes run behind.
     */
    private function schoolUser(): SchoolUser
    {
        /** @var SchoolUser $schoolUser */
        $schoolUser = Auth::guard('school')->user();

        return $schoolUser;
    }

    /**
     * Guard against acting on another school user's conversation.
     */
    private function authorizeConversation(Conversation $thread): void
    {
        $schoolUser = $this->schoolUser();

        if ($thread->participant_type !== Conversation::participantType($schoolUser)
            || $thread->participant_id !== Conversation::participantKey($schoolUser)) {
            abort(404);
        }
    }
}
