<?php

namespace App\Ai\Tools;

use App\Ai\Product\PageCatalog;
use App\Ai\Query\QueryScope;
use Illuminate\Contracts\JsonSchema\JsonSchema;
use Illuminate\JsonSchema\Types\Type;
use Laravel\Ai\Contracts\Tool;
use Laravel\Ai\Tools\Request;
use Stringable;

/**
 * A display tool like the chart and table ones: the chat draws a link to the
 * page from the arguments. The model picks from the pages the catalog lists
 * for its own portal, so it can never send someone to a page that does not
 * exist or belongs to the other portal.
 */
class NavigateToPage implements Tool
{
    public function __construct(private QueryScope $scope, private PageCatalog $pages) {}

    public function name(): string
    {
        return 'navigate_to_page';
    }

    public function description(): Stringable|string
    {
        return 'Show the user a link to a page in the application. Use it when they ask to go somewhere, '
            .'ask where something is done, or ask for something this assistant cannot do itself '
            .'(anything that changes a record). Pick the page name from the PAGES list in your instructions.';
    }

    public function handle(Request $request): Stringable|string
    {
        $page = (string) $request->string('page');

        if (! $this->pages->has($this->scope, $page)) {
            return 'Error: there is no page called "'.$page.'". Choose one of: '
                .implode(', ', $this->pages->names($this->scope)).'.';
        }

        return 'The link is now shown to the user. Add one short sentence saying what they will find there, and do not repeat the link.';
    }

    /**
     * @return array<string, Type>
     */
    public function schema(JsonSchema $schema): array
    {
        return [
            'page' => $schema->string()
                ->enum($this->pages->names($this->scope))
                ->description('The name of the page, exactly as the PAGES list writes it.')
                ->required(),
            'reason' => $schema->string()
                ->description('A few words on what the user will do there, e.g. "suspend a school".'),
        ];
    }
}
