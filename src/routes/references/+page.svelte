<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import * as Card from "$lib/components/ui/card";
  import { Badge } from "$lib/components/ui/badge";

  import { dndzone, type DndEvent } from "svelte-dnd-action";
  import * as Tooltip from "$lib/components/ui/tooltip";
  import * as Tabs from "$lib/components/ui/tabs";
  import { Progress } from "$lib/components/ui/progress";
  import { flip } from "svelte/animate";
  import { untrack } from "svelte";
  import DOMPurify from "isomorphic-dompurify";

  let { data } = $props();

  let uploadInput = $state<HTMLInputElement>();
  let isUploading = $state(false);
  let uploadError = $state("");
  let selectedDocument = $state<any>(null);
  let isDeleting = $state(false);
  let isDragging = $state(false);
  let isTranslating = $state(false);
  let translationProgress = $state(0);
  let translationStatusText = $state("");
  let viewMode = $state("original");

  // Local list state for DnD
  let listItems = $state(untrack(() => data.references) || []);

  // Update list when data changes (e.g. after upload/reload)
  $effect(() => {
    // Prevent external sync during drag
    if (isDragging) return;

    // Only update if IDs don't match (ignoring order) to avoid resetting
    const currentIds = listItems
      .map((i: any) => i.id)
      .sort((a: number, b: number) => a - b)
      .join(",");
    const newIds = data.references
      .map((i: any) => i.id)
      .sort((a: number, b: number) => a - b)
      .join(",");

    if (currentIds !== newIds) {
      listItems = data.references;
    }
  });

  function handleDndConsider(e: CustomEvent<DndEvent<any>>) {
    isDragging = true;
    listItems = e.detail.items;
  }

  async function handleDndFinalize(e: CustomEvent<DndEvent<any>>) {
    isDragging = false;
    listItems = e.detail.items;

    // Optimistic update done, now save to API
    try {
      const itemsToUpdate = listItems.map((item: any, index: number) => ({
        id: item.id,
        order: index,
      }));

      await fetch("/api/documents/reorder", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: itemsToUpdate }),
      });
    } catch (err) {
      console.error("Failed to save order", err);
    }
  }

  async function deleteDocument(id: number, event: Event) {
    event.stopPropagation();
    if (!confirm("Are you sure you want to delete this document?")) return;

    isDeleting = true;
    try {
      const response = await fetch(`/api/documents/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete");

      // Remove from local data or reload
      window.location.reload();
    } catch (e: any) {
      alert(e.message);
    } finally {
      isDeleting = false;
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
      formData.append("type", "reference");
      formData.append("language", "de");

      const response = await fetch("/api/documents", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Upload failed");
      }

      window.location.reload();
    } catch (e: any) {
      uploadError = e.message;
    } finally {
      isUploading = false;
    }
  }

  async function handleTranslate() {
    if (!selectedDocument) return;

    isTranslating = true;
    translationProgress = 0;
    translationStatusText = "Initializing...";

    try {
      const response = await fetch(
        `/api/documents/${selectedDocument.id}/translate`,
        {
          method: "POST",
        },
      );

      if (!response.ok) {
        throw new Error("Translation request failed");
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response stream");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");

        // Process all complete lines
        buffer = lines.pop() || ""; // Keep incomplete line in buffer

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const msg = JSON.parse(line);

            if (msg.type === "progress") {
              translationProgress = msg.value;
              translationStatusText = msg.status;
            } else if (msg.type === "complete") {
              // Update local state
              const updatedDoc = {
                ...selectedDocument,
                translatedContent: msg.translatedContent,
                translationStatus: "completed",
              };

              listItems = listItems.map((item: any) =>
                item.id === selectedDocument.id ? updatedDoc : item,
              );
              selectedDocument = updatedDoc;
              viewMode = "english";
            } else if (msg.type === "error") {
              throw new Error(msg.error);
            }
          } catch {
            // Ignore parse errors for partial lines if logic fails
          }
        }
      }
    } catch (e: any) {
      alert(e.message);
    } finally {
      isTranslating = false;
    }
  }
</script>

<div class="h-[calc(100vh-8rem)] flex overflow-hidden bg-background">
  <!-- Left Sidebar: Document List -->
  <aside
    class="w-80 shrink-0 border-r border-border/50 bg-card/30 backdrop-blur-sm overflow-y-auto flex flex-col"
  >
    <div
      class="p-4 border-b border-border/50 sticky top-0 bg-background/80 backdrop-blur-md z-10"
    >
      <h2 class="font-bold text-lg tracking-tight mb-2">References</h2>
      <div class="flex items-center gap-2">
        <input
          type="file"
          accept=".docx,.pdf"
          bind:this={uploadInput}
          onchange={handleUpload}
          class="hidden"
        />
        <Button
          onclick={() => uploadInput?.click()}
          disabled={isUploading}
          size="sm"
          class="w-full shadow-sm shadow-primary/20"
        >
          {isUploading ? "Uploading..." : "Upload New"}
        </Button>
      </div>
      {#if uploadError}
        <p class="text-xs text-red-400 mt-2">{uploadError}</p>
      {/if}
    </div>

    <div
      class="p-3 flex flex-col gap-2"
      use:dndzone={{
        items: listItems,
        flipDurationMs: 200,
        dropTargetStyle: {},
      }}
      onconsider={handleDndConsider}
      onfinalize={handleDndFinalize}
    >
      {#if listItems.length === 0}
        <div class="text-center py-8 text-muted-foreground">
          {#if data.references.length === 0}
            <p class="text-sm">No references yet</p>
          {/if}
        </div>
      {:else}
        {#each listItems as ref ((ref as any).isDndShadowItem ? "shadow" + ref.id : ref.id)}
          <!-- svelte-ignore a11y_click_events_have_key_events -->
          <!-- svelte-ignore a11y_no_static_element_interactions -->
          <div
            animate:flip={{ duration: 200 }}
            onclick={() => (selectedDocument = ref)}
            class="w-full text-left p-3 rounded-lg border transition-all duration-200 group cursor-pointer relative {selectedDocument?.id ===
            ref.id
              ? 'bg-primary/10 border-primary/20 shadow-sm'
              : 'border-border/50 hover:bg-secondary/50 hover:border-border'}"
          >
            <div class="flex items-start gap-3">
              <!-- Grid Grip Icon for Dragging indication -->
              <div
                class="mt-1 text-muted-foreground/30 group-hover:text-muted-foreground/70 cursor-grab active:cursor-grabbing"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  class="lucide lucide-grip-vertical"
                  ><circle cx="9" cy="12" r="1" /><circle
                    cx="9"
                    cy="5"
                    r="1"
                  /><circle cx="9" cy="19" r="1" /><circle
                    cx="15"
                    cy="12"
                    r="1"
                  /><circle cx="15" cy="5" r="1" /><circle
                    cx="15"
                    cy="19"
                    r="1"
                  /></svg
                >
              </div>

              <div
                class="mt-0.5 w-6 h-6 rounded flex items-center justify-center shrink-0 transition-colors {selectedDocument?.id ===
                ref.id
                  ? 'bg-primary/20 text-primary'
                  : 'bg-secondary text-muted-foreground'}"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="h-3.5 w-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <div class="flex-1 min-w-0">
                <Tooltip.Provider>
                  <Tooltip.Root>
                    <Tooltip.Trigger
                      class="w-full text-left truncate cursor-pointer"
                    >
                      <span class="font-medium text-sm block truncate mb-1"
                        >{ref.name}</span
                      >
                    </Tooltip.Trigger>
                    <Tooltip.Content>
                      <p>{ref.name}</p>
                    </Tooltip.Content>
                  </Tooltip.Root>
                </Tooltip.Provider>
                <div class="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    class="text-[10px] h-4 px-1 font-normal bg-background/50"
                  >
                    {ref.language === "de" ? "DE" : ref.language.toUpperCase()}
                  </Badge>
                  <span
                    class="text-[10px] text-muted-foreground truncate opacity-70"
                  >
                    {new Date(ref.uploadedAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
              <button
                onclick={(e) => deleteDocument(ref.id, e)}
                class="opacity-0 group-hover:opacity-100 p-1.5 rounded-md hover:bg-destructive/10 hover:text-destructive text-muted-foreground transition-all cursor-pointer"
                title="Delete document"
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
              </button>
            </div>
          </div>
        {/each}
      {/if}
    </div>
  </aside>

  <!-- Main Content: Preview -->
  <div class="flex-1 flex flex-col bg-background/50">
    {#if selectedDocument}
      <div
        class="p-4 border-b border-border/50 bg-card/30 backdrop-blur-sm sticky top-0 z-10 flex items-center justify-between"
      >
        <div>
          <h2 class="font-bold text-lg tracking-tight">
            {selectedDocument.name}
          </h2>
          <p
            class="text-xs font-medium text-muted-foreground uppercase tracking-wider mt-0.5"
          >
            Reference Preview
          </p>
        </div>
        <div class="flex items-center gap-2">
          {#if selectedDocument.originalPath}
            <a
              href={selectedDocument.originalPath}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="ghost" size="sm" class="h-8 w-8 p-0">
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
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                  />
                </svg>
              </Button>
            </a>
          {/if}

          <div
            class="flex items-center bg-secondary/50 rounded-lg p-1 border border-border/50"
          >
            <button
              class="px-3 py-1 text-xs font-medium rounded-md transition-all {viewMode ===
              'original'
                ? 'bg-background shadow-sm text-foreground'
                : 'text-muted-foreground hover:text-foreground'}"
              onclick={() => (viewMode = "original")}
            >
              Original
            </button>
            <button
              class="px-3 py-1 text-xs font-medium rounded-md transition-all flex items-center gap-1.5 {viewMode ===
              'english'
                ? 'bg-background shadow-sm text-foreground'
                : 'text-muted-foreground hover:text-foreground'}"
              onclick={() => (viewMode = "english")}
            >
              English
              {#if selectedDocument.translationStatus === "completed"}
                <span class="w-1.5 h-1.5 rounded-full bg-green-500"></span>
              {/if}
            </button>
          </div>

          {#if viewMode === "english"}
            <Button
              size="sm"
              variant={selectedDocument.translationStatus === "completed"
                ? "outline"
                : "default"}
              onclick={handleTranslate}
              disabled={isTranslating}
              class="ml-2 h-8"
            >
              {isTranslating
                ? `Translating (${translationProgress}%)`
                : selectedDocument.translationStatus === "completed"
                  ? "Translate Again"
                  : "Translate Doc"}
            </Button>
          {/if}
        </div>
      </div>

      <div class="flex-1 overflow-y-auto p-8 custom-scrollbar">
        {#if viewMode === "english"}
          {#if selectedDocument.translationStatus === "completed" && selectedDocument.translatedContent}
            <div
              class="document-content prose prose-invert prose-sm max-w-none text-foreground/90 leading-relaxed font-serif"
            >
              {@html DOMPurify.sanitize(selectedDocument.translatedContent)}
            </div>
          {:else if isTranslating}
            <div
              class="flex flex-col items-center justify-center py-20 text-muted-foreground w-full max-w-md mx-auto px-6"
            >
              <p class="mb-4 font-medium">{translationStatusText}</p>
              <Progress value={translationProgress} class="h-2 w-full" />
              <p class="text-xs mt-2 opacity-70">
                {translationProgress}% completed
              </p>
            </div>
          {:else}
            <div
              class="flex flex-col items-center justify-center py-20 text-muted-foreground border-2 border-dashed border-border/50 rounded-xl"
            >
              <p class="mb-4">No translation available yet.</p>
              <Button onclick={handleTranslate}>Translate to English</Button>
            </div>
          {/if}
        {:else if selectedDocument.name.endsWith(".pdf")}
          <pre
            class="whitespace-pre-wrap text-sm font-mono text-muted-foreground leading-relaxed max-w-none">{selectedDocument.rawContent}</pre>
        {:else}
          <div
            class="document-content prose prose-invert prose-sm max-w-none text-foreground/90 leading-relaxed font-serif"
          >
            {@html selectedDocument.rawContent}
          </div>
        {/if}
      </div>
    {:else}
      <div
        class="flex-1 flex items-center justify-center text-muted-foreground"
      >
        <div class="text-center">
          <div
            class="w-16 h-16 bg-secondary/50 rounded-2xl flex items-center justify-center mx-auto mb-6"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-8 w-8 text-muted-foreground opacity-50"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="1.5"
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="1.5"
                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
              />
            </svg>
          </div>
          <p>Select a document to view</p>
        </div>
      </div>
    {/if}
  </div>
</div>
