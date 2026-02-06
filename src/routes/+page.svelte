<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import * as Card from "$lib/components/ui/card";
  import { Badge } from "$lib/components/ui/badge";
  import { Progress } from "$lib/components/ui/progress";
  import * as Tooltip from "$lib/components/ui/tooltip";

  let { data } = $props();

  let uploadInput = $state<HTMLInputElement>();
  let isUploading = $state(false);
  let uploadError = $state("");

  // Calculate progress
  const totalSections = $derived(data.sections?.length || 0);
  const completedSections = $derived(
    data.sections?.filter((s: any) => s.status === "complete").length || 0,
  );
  const inProgressSections = $derived(
    data.sections?.filter((s: any) => s.status === "in-progress").length || 0,
  );
  const progressPercent = $derived(
    totalSections > 0
      ? Math.round((completedSections / totalSections) * 100)
      : 0,
  );

  async function deleteMainDocument(id: number, event: Event) {
    event.stopPropagation();
    event.preventDefault();
    if (
      !confirm(
        "Are you sure you want to delete this document and all its sections? This cannot be undone.",
      )
    )
      return;

    isUploading = true; // Use loading state
    try {
      const response = await fetch(`/api/documents/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete");

      // Reload to clear state
      window.location.reload();
    } catch (e: any) {
      alert(e.message);
      isUploading = false;
    }
  }

  async function handleUpload(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    isUploading = true;
    uploadError = "";

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", "main");
      formData.append("language", "en");

      const response = await fetch("/api/documents", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Upload failed");
      }

      // Reload the page to show the uploaded document
      window.location.reload();
    } catch (e: any) {
      uploadError = e.message;
    } finally {
      isUploading = false;
    }
  }
</script>

<div class="h-[calc(100vh-8rem)] flex gap-6 p-6 overflow-hidden bg-background">
  {#if data.mainDocument}
    <!-- Left Sidebar: Progress & Actions -->
    <div
      class="w-96 flex flex-col gap-6 overflow-y-auto pr-2 custom-scrollbar shrink-0"
    >
      <div>
        <h1
          class="text-2xl font-bold bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent mb-1"
        >
          Dashboard
        </h1>
        <p class="text-muted-foreground text-sm mb-4">Manage IGG documents</p>

        <input
          type="file"
          accept=".docx"
          bind:this={uploadInput}
          onchange={handleUpload}
          class="hidden"
        />
        <Button
          onclick={() => uploadInput?.click()}
          disabled={isUploading}
          class="w-full shadow-lg shadow-primary/20"
        >
          {isUploading ? "Uploading..." : "Upload New Document"}
        </Button>
      </div>

      <!-- Progress Card -->
      <Card.Root
        class="border-border/50 bg-gradient-to-br from-card to-card/50 shadow-xl"
      >
        <Card.Header class="pb-2">
          <Card.Title class="flex items-center justify-between text-lg w-full">
            <Tooltip.Provider>
              <Tooltip.Root>
                <Tooltip.Trigger class="truncate pr-2 cursor-pointer text-left">
                  <span class="truncate block">{data.mainDocument.name}</span>
                </Tooltip.Trigger>
                <Tooltip.Content>
                  <p>{data.mainDocument.name}</p>
                </Tooltip.Content>
              </Tooltip.Root>
            </Tooltip.Provider>
            <Button
              variant="ghost"
              size="icon"
              class="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
              onclick={(e) => deleteMainDocument(data.mainDocument.id, e)}
              title="Delete Document"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </Button>
          </Card.Title>
        </Card.Header>
        <Card.Content>
          <div class="space-y-4">
            <div class="flex items-end justify-between">
              <div class="text-3xl font-bold tabular-nums tracking-tighter">
                {progressPercent}%
              </div>
              <div class="text-xs text-muted-foreground font-medium mb-1">
                {completedSections}/{totalSections} done
              </div>
            </div>
            <Progress value={progressPercent} class="h-2 bg-secondary" />

            <div class="space-y-2 text-sm pt-2">
              <div class="flex items-center justify-between text-xs">
                <div class="flex items-center gap-2 text-muted-foreground">
                  <span
                    class="w-1.5 h-1.5 rounded-full bg-[hsl(var(--status-pending))]"
                  ></span>
                  Pending
                </div>
                <span class="font-medium"
                  >{totalSections -
                    completedSections -
                    inProgressSections}</span
                >
              </div>
              <div class="flex items-center justify-between text-xs">
                <div class="flex items-center gap-2 text-muted-foreground">
                  <span
                    class="w-1.5 h-1.5 rounded-full bg-[hsl(var(--status-in-progress))]"
                  ></span>
                  In Progress
                </div>
                <span class="font-medium">{inProgressSections}</span>
              </div>
              <div class="flex items-center justify-between text-xs">
                <div class="flex items-center gap-2 text-muted-foreground">
                  <span
                    class="w-1.5 h-1.5 rounded-full bg-[hsl(var(--status-complete))]"
                  ></span>
                  Complete
                </div>
                <span class="font-medium">{completedSections}</span>
              </div>
            </div>
          </div>
        </Card.Content>
      </Card.Root>

      <!-- Actions Card -->
      <Card.Root class="border-border/50 bg-card/30">
        <Card.Content class="p-4">
          <Button
            variant="outline"
            class="w-full justify-start gap-2 text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/20 hover:border-destructive/50"
            onclick={(e) => deleteMainDocument(data.mainDocument.id, e)}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
            Delete Document
          </Button>
          <p class="text-[10px] text-muted-foreground mt-2 px-1">
            Permanently remove this document and all its sections to upload a
            new one.
          </p>
        </Card.Content>
      </Card.Root>

      {#if uploadError}
        <div
          class="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-red-400 text-xs flex gap-2"
        >
          <span>!</span>
          {uploadError}
        </div>
      {/if}
    </div>

    <!-- Main Content: Sections Grid -->
    <div
      class="flex-1 flex flex-col min-w-0 bg-secondary/10 rounded-xl border border-border/50 overflow-hidden"
    >
      <div
        class="p-4 border-b border-border/50 bg-card/30 backdrop-blur-sm flex items-center justify-between"
      >
        <h2 class="font-semibold text-lg flex items-center gap-2">
          Sections
          <span
            class="text-xs font-normal text-muted-foreground bg-secondary px-2 py-0.5 rounded-full"
            >{totalSections}</span
          >
        </h2>
        <!-- Search or Filter could go here -->
      </div>

      <div class="flex-1 overflow-y-auto p-4 custom-scrollbar">
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {#each data.sections as section}
            <a
              href="/document/{data.mainDocument.id}/section/{section.id}"
              class="group block"
            >
              <Card.Root
                class="h-full border-border/40 bg-card/60 hover:bg-card hover:border-primary/30 transition-all duration-200 hover:shadow-md group-hover:-translate-y-0.5"
              >
                <Card.Content
                  class="p-4 flex flex-col justify-between gap-3 h-full"
                >
                  <div class="flex justify-between items-start gap-3">
                    <span
                      class="flex items-center justify-center w-6 h-6 rounded bg-secondary text-muted-foreground text-xs font-mono font-medium group-hover:bg-primary/10 group-hover:text-primary transition-colors shrink-0"
                    >
                      {section.order + 1}
                    </span>
                    <Badge
                      class="text-[10px] h-5 px-1.5 {section.status ===
                      'complete'
                        ? 'status-complete'
                        : section.status === 'in-progress'
                          ? 'status-in-progress'
                          : 'status-pending'}"
                    >
                      {section.status}
                    </Badge>
                  </div>

                  <h3
                    class="font-medium text-sm leading-snug group-hover:text-primary transition-colors line-clamp-2"
                  >
                    {section.title}
                  </h3>

                  {#if (section as any).proposal?.content}
                    <div
                      class="text-[10px] text-muted-foreground flex items-center gap-1 mt-auto pt-2 border-t border-border/30"
                    >
                      <span class="w-1.5 h-1.5 rounded-full bg-green-500"
                      ></span>
                      Proposal added
                    </div>
                  {/if}
                </Card.Content>
              </Card.Root>
            </a>
          {/each}
        </div>
      </div>
    </div>
  {:else}
    <!-- Empty State (Centered Full Height) -->
    <div class="flex-1 flex items-center justify-center">
      <Card.Root
        class="border-dashed border-2 border-border/60 bg-card/30 max-w-lg w-full"
      >
        <Card.Content class="py-24 text-center">
          <div
            class="w-20 h-20 bg-secondary/50 rounded-2xl flex items-center justify-center mx-auto mb-6"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-10 w-10 text-muted-foreground"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="1.5"
                d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <h3 class="text-xl font-semibold mb-3">No document uploaded</h3>
          <p class="text-muted-foreground mb-8">
            Upload your IGG DOCX file to start managing proposals.
          </p>
          <input
            type="file"
            accept=".docx"
            bind:this={uploadInput}
            onchange={handleUpload}
            class="hidden"
          />
          <Button
            onclick={() => uploadInput?.click()}
            size="lg"
            variant="secondary"
            class="shadow-sm"
          >
            Select Document to Upload
          </Button>
          {#if uploadError}
            <p class="text-red-400 text-sm mt-4">{uploadError}</p>
          {/if}
        </Card.Content>
      </Card.Root>
    </div>
  {/if}
</div>
