<?php

namespace App\Http\Controllers;

use App\Enums\ChatRole;
use App\Models\ChatMessage;
use App\Models\ChatThread;
use App\Models\SchoolUser;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class AiChatController extends Controller
{
    /**
     * Placeholder reply used until a real AI model is wired up.
     */
    private const PLACEHOLDER_REPLY = "I'm not connected to an AI model yet — check back soon!";

    /**
     * Display the assistant's chat page: the current user's threads, and
     * the active thread's message history.
     */
    public function index(Request $request): Response
    {
        $threads = ChatThread::query()
            ->where('school_user_id', $this->schoolUser()->id)
            ->latest('updated_at')
            ->get(['id', 'title', 'updated_at']);

        $activeThreadId = $request->string('thread')->toString();
        $activeThread = $activeThreadId !== ''
            ? $threads->firstWhere('id', $activeThreadId)
            : $threads->first();

        $messages = $activeThread
            ? ChatThread::query()->find($activeThread->id)?->messages
            : collect();

        $draft = $request->string('draft')->toString();

        return Inertia::render('ai/chat', [
            'threads' => $threads,
            'activeThreadId' => $activeThread?->id,
            'draft' => $draft !== '' ? $draft : null,
            'messages' => ($messages ?? collect())->map(fn (ChatMessage $message) => [
                'id' => $message->id,
                'role' => $message->role->value,
                'content' => $message->content,
            ]),
        ]);
    }

    /**
     * Start a new, empty chat thread. Carries a `draft` message forward
     * (e.g. from the docked assistant panel) so it lands pre-filled in the
     * new thread's composer.
     */
    public function store(Request $request): RedirectResponse
    {
        $thread = ChatThread::create(['school_user_id' => $this->schoolUser()->id]);

        return to_route('ai.chat', array_filter([
            'thread' => $thread->id,
            'draft' => $request->string('draft')->toString() ?: null,
        ]));
    }

    /**
     * Remove a chat thread.
     */
    public function destroy(ChatThread $thread): RedirectResponse
    {
        $this->authorizeThread($thread);

        $thread->delete();

        return to_route('ai.chat');
    }

    /**
     * Persist the user's message and stream back a reply.
     *
     * The reply is a static placeholder for now — this endpoint's streaming
     * shape (persist user message, stream deltas, persist the full reply
     * once the stream ends) is what a real model call will slot into later
     * without changing the frontend.
     */
    public function respond(Request $request, ChatThread $thread): StreamedResponse
    {
        $this->authorizeThread($thread);

        $validated = $request->validate([
            'content' => ['required', 'string'],
        ]);

        $thread->messages()->create([
            'role' => ChatRole::User,
            'content' => $validated['content'],
        ]);

        if ($thread->title === null) {
            $thread->update(['title' => str($validated['content'])->limit(60)->toString()]);
        }

        return new StreamedResponse(function () use ($thread) {
            $reply = self::PLACEHOLDER_REPLY;

            foreach (mb_str_split($reply, 3) as $chunk) {
                echo $chunk;

                if (ob_get_level() > 0) {
                    ob_flush();
                }
                flush();

                usleep(20_000);
            }

            $thread->messages()->create([
                'role' => ChatRole::Assistant,
                'content' => $reply,
            ]);

            $thread->touch();
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
     * Guard against acting on another school user's thread.
     */
    private function authorizeThread(ChatThread $thread): void
    {
        if ($thread->school_user_id !== $this->schoolUser()->id) {
            abort(404);
        }
    }
}
