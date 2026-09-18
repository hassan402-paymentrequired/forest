<?php

namespace App\Ai\Tools;

use Illuminate\Contracts\JsonSchema\JsonSchema;
use Illuminate\JsonSchema\Types\Type;
use Laravel\Ai\Contracts\Tool;
use Laravel\Ai\Tools\Request;
use Stringable;

class AskClarifyingQuestion implements Tool
{
    public function name(): string
    {
        return 'ask_clarifying_question';
    }

    public function description(): Stringable|string
    {
        return 'Ask the user a question when their request is ambiguous or missing something you need '
            .'(e.g. which term, which class). Use this instead of guessing. Do not query the database until they answer.';
    }

    public function handle(Request $request): Stringable|string
    {
        return 'The question is now shown to the user. Write nothing else; wait for their answer.';
    }

    /**
     * @return array<string, Type>
     */
    public function schema(JsonSchema $schema): array
    {
        return [
            'question' => $schema->string()->required(),
            'options' => $schema->array()->items($schema->string())
                ->description('Optional suggested answers the user can pick from.'),
        ];
    }
}
