





             <form
                    onSubmit={(event) => {
                        event.preventDefault();
                        if (isSchoolUser) {
                            openAssistant();
                        }
                    }}
                    className="relative"
                >
                    <Input
                        placeholder="Ask me anything..."
                        disabled={!isSchoolUser}
                        value={draft}
                        onChange={(event) => setDraft(event.target.value)}
                        className="pr-9"
                    />
                    <Button
                        type="submit"
                        size="icon"
                        variant="ghost"
                        disabled={!isSchoolUser}
                        className="absolute top-1/2 right-1 size-7 -translate-y-1/2"
                    >
                        <Send className="size-4" />
                    </Button>
                </form>