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
use Laravel\Ai\Responses\StreamableAgentResponse;

class AiChatController extends Controller
{
    /**
     * Tools whose calls are drawn in the chat rather than executed for data.
     *
     * @var list<string>
     */
    private const VISUAL_TOOLS = ['render_chart', 'render_table', 'render_list', 'ask_clarifying_question'];

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
                'visuals' => $this->visualsFor($message),
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
     * Persist the user's message and stream back the assistant's reply using
     * the Vercel AI SDK stream protocol, which the chat UI's `useChat` reads
     * natively — text deltas and the display tools' calls (charts, tables,
     * lists, questions) arrive as separate parts of the same message.
     */
    public function respond(Request $request, Conversation $thread): StreamableAgentResponse
    {
        $this->authorizeConversation($thread);

        $validated = $request->validate([
            'content' => ['required', 'string'],
        ]);

        $schoolUser = $this->schoolUser();

        $agent = (new SchoolAssistant(QueryScope::school($schoolUser->school_id)))
            ->continue($thread->id, as: $schoolUser);

        return $agent->stream($validated['content'])
            ->usingVercelDataProtocol()
            ->then(function () use ($thread, $validated): void {
                // Only replace the placeholder title — a title the user set
                // via rename() should never be overwritten by a later message.
                if ($thread->title === 'New chat') {
                    $thread->update(['title' => str($validated['content'])->limit(60)->toString()]);
                }
            });
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
