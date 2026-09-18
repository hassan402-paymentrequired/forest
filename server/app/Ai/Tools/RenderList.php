<?php

namespace App\Ai\Tools;

use Illuminate\Contracts\JsonSchema\JsonSchema;
use Illuminate\JsonSchema\Types\Type;
use Laravel\Ai\Contracts\Tool;
use Laravel\Ai\Tools\Request;
use Stringable;

class RenderList implements Tool
{
    public function name(): string
    {
        return 'render_list';
    }

    public function description(): Stringable|string
    {
        return 'Show the user a simple bulleted list. Use it for a short set of names or single values, e.g. teachers on leave.';
    }

    public function handle(Request $request): Stringable|string
    {
        return 'The list is now displayed to the user. Do not repeat its items; add one short sentence if useful.';
    }

    /**
     * @return array<string, Type>
     */
    public function schema(JsonSchema $schema): array
    {
        return [
            'title' => $schema->string()->required(),
            'items' => $schema->array()->items($schema->string())->required(),
        ];
    }
}
