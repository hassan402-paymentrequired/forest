<?php

namespace App\Http\Controllers\Ministry;

use App\Ai\Agents\MinistryAssistant;
use App\Ai\MinistryTopicGuard;
use App\Http\Controllers\Concerns\HandlesAiConversations;
use App\Http\Controllers\Controller;
use App\Models\MinistryUser;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;
use Laravel\Ai\Models\Conversation;
use Laravel\Ai\Responses\StreamableAgentResponse;
use Symfony\Component\HttpFoundation\Response as HttpResponse;

class AssistantController extends Controller
{
    use HandlesAiConversations;

    /**
     * Display the ministry assistant: the current user's conversations, and
     * the active conversation's message history.
     */
    public function index(Request $request): Response
    {
        $conversations = $this->conversationsFor($this->ministryUser());

        $activeConversationId = $request->string('thread')->toString();
        $activeConversation = $activeConversationId !== ''
            ? $conversations->firstWhere('id', $activeConversationId)
            : $conversations->first();

        $draft = $request->string('draft')->toString();

        return Inertia::render('ministry/assistant', [
            'threads' => $conversations,
            'activeThreadId' => $activeConversation?->id,
            'draft' => $draft !== '' ? $draft : null,
            'messages' => $this->messagesPayload($activeConversation ? Conversation::find($activeConversation->id) : null),
        ]);
    }

    /**
     * Start a new, empty conversation.
     */
    public function store(Request $request): RedirectResponse
    {
        $conversation = Conversation::create([
            'id' => (string) Str::uuid7(),
            'participant_type' => Conversation::participantType($this->ministryUser()),
            'participant_id' => Conversation::participantKey($this->ministryUser()),
            'title' => 'New chat',
        ]);

        return to_route('ministry.assistant', array_filter([
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
     * Persist the user's message and stream back the assistant's reply.
     */
    public function respond(Request $request, Conversation $thread, MinistryTopicGuard $topicGuard): StreamableAgentResponse|HttpResponse
    {
        $this->authorizeConversation($thread);

        $validated = $request->validate([
            'content' => ['required', 'string'],
        ]);

        $ministryUser = $this->ministryUser();
        $lastMessage = $thread->messages()->orderByDesc('id')->first();

        if (! $topicGuard->allows(
            $validated['content'],
            isFollowUp: $lastMessage !== null,
            answersQuestion: $lastMessage !== null && $this->askedQuestion($lastMessage),
        )) {
            return $this->declineOffTopic($thread, $ministryUser, $validated['content'], MinistryAssistant::class, $topicGuard->refusal());
        }

        return (new MinistryAssistant)
            ->continue($thread->id, as: $ministryUser)
            ->stream($validated['content'])
            ->usingVercelDataProtocol()
            ->then(function () use ($thread, $validated): void {
                if ($thread->title === 'New chat') {
                    $thread->update(['title' => str($validated['content'])->limit(60)->toString()]);
                }
            });
    }

    /**
     * Resolve the authenticated ministry user, guaranteed present by the
     * `auth` middleware these routes run behind.
     */
    private function ministryUser(): MinistryUser
    {
        /** @var MinistryUser $ministryUser */
        $ministryUser = Auth::user();

        return $ministryUser;
    }

    /**
     * Guard against acting on another ministry user's conversation.
     */
    private function authorizeConversation(Conversation $thread): void
    {
        $this->authorizeConversationFor($thread, $this->ministryUser());
    }
}
