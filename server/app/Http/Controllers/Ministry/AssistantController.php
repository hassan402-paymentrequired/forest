<?php

namespace App\Http\Controllers\Ministry;

use App\Ai\Agents\MinistryAssistant;
use App\Ai\MinistryTopicGuard;
use App\Ai\Product\PageCatalog;
use App\Ai\Query\QueryScope;
use App\Http\Controllers\Concerns\HandlesAiConversations;
use App\Http\Controllers\Controller;
use App\Models\MinistryUser;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
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
            'pages' => app(PageCatalog::class)->links(QueryScope::ministry()),
        ]);
    }

    /**
     * Start a new, empty conversation.
     */
    public function store(Request $request): RedirectResponse
    {
        $conversation = $this->startConversationFor($this->ministryUser());

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
            'regenerate' => ['sometimes', 'boolean'],
        ]);

        $ministryUser = $this->ministryUser();

        // A regenerate re-asks what was already asked, so the stored message
        // is authoritative and the exchange it produced is rolled back first.
        $content = $request->boolean('regenerate')
            ? $this->rewindLastExchange($thread) ?? $validated['content']
            : $validated['content'];

        $lastMessage = $thread->messages()->orderByDesc('id')->first();

        if (! $topicGuard->allows(
            $content,
            isFollowUp: $lastMessage !== null,
            answersQuestion: $lastMessage !== null && $this->askedQuestion($lastMessage),
        )) {
            return $this->declineOffTopic($thread, $ministryUser, $content, MinistryAssistant::class, $topicGuard->refusal());
        }

        return (new MinistryAssistant)
            ->continue($thread->id, as: $ministryUser)
            ->stream($content)
            ->usingVercelDataProtocol()
            ->then(function () use ($thread, $content): void {
                if ($thread->title === 'New chat') {
                    $thread->update(['title' => str($content)->limit(60)->toString()]);
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
