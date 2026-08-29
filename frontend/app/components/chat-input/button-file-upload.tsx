import {
  FileUpload,
  FileUploadContent,
  FileUploadTrigger,
} from "@/components/prompt-kit/file-upload"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { FileArrowUp, Paperclip } from "@phosphor-icons/react"
import React from "react"

type ButtonFileUploadProps = {
  onFileUpload: (files: File[]) => void
  isUserAuthenticated: boolean
  model: string
}

export function ButtonFileUpload({
  onFileUpload,
  isUserAuthenticated,
}: ButtonFileUploadProps) {
  // File upload here is for attaching spreadsheets to engine's prediction
  // pipeline, not vision — no model-capability gate needed. Auth is
  // required app-wide (see middleware.ts), so isUserAuthenticated is always
  // true when this renders — the disabled/opacity styling below is just
  // defensive.
  return (
    <FileUpload
      onFilesAdded={onFileUpload}
      multiple
      disabled={!isUserAuthenticated}
      accept=".txt,.md,.csv,.xlsx,image/jpeg,image/png,image/gif,image/webp,image/svg,image/heic,image/heif,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <FileUploadTrigger asChild>
            <Button
              size="sm"
              variant="secondary"
              className={cn(
                "border-border dark:bg-secondary size-9 rounded-full border bg-transparent",
                !isUserAuthenticated && "opacity-50"
              )}
              type="button"
              disabled={!isUserAuthenticated}
              aria-label="Add files"
            >
              <Paperclip className="size-4" />
            </Button>
          </FileUploadTrigger>
        </TooltipTrigger>
        <TooltipContent>Add files</TooltipContent>
      </Tooltip>
      <FileUploadContent>
        <div className="border-input bg-background flex flex-col items-center rounded-lg border border-dashed p-8">
          <FileArrowUp className="text-muted-foreground size-8" />
          <span className="mt-4 mb-1 text-lg font-medium">Drop files here</span>
          <span className="text-muted-foreground text-sm">
            Drop any files here to add it to the conversation
          </span>
        </div>
      </FileUploadContent>
    </FileUpload>
  )
}
