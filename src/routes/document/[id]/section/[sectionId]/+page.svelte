<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import * as Card from "$lib/components/ui/card";
  import { Badge } from "$lib/components/ui/badge";
  import { Separator } from "$lib/components/ui/separator";
  import * as Tabs from "$lib/components/ui/tabs";
  import * as Tooltip from "$lib/components/ui/tooltip";
  import { Switch } from "$lib/components/ui/switch";
  import { Label } from "$lib/components/ui/label";
  import { untrack } from "svelte";
  import type { Section } from "$lib/db";
  import { diffWords } from "diff";
  import TurndownService from "turndown";
  import { gfm } from "turndown-plugin-gfm";

  let { data } = $props();

  let proposalContent = $state(untrack(() => data.proposals[0]?.content || ""));
  let proposalNotes = $state(untrack(() => data.proposals[0]?.notes || ""));
  let isSaving = $state(false);
  let saveMessage = $state("");
  let currentStatus = $state(untrack(() => data.section.status));
  let showDiff = $state(false);

  $effect(() => {
    proposalContent = data.proposals[0]?.content || "";
    proposalNotes = data.proposals[0]?.notes || "";
    currentStatus = data.section.status;
  });

  const turndownService = new TurndownService({
    headingStyle: "atx",
    codeBlockStyle: "fenced",
    emDelimiter: "*",
  });
  turndownService.use(gfm);

  // Custom rule for tables without headers (which gfm ignores)
  // We treat them as just text blocks with spacing
  turndownService.addRule("headerlessTables", {
    filter: ["table"],
    replacement: function (content, node) {
      return "\n\n" + content + "\n\n";
    },
  });

  turndownService.addRule("tableRows", {
    filter: ["tr"],
    replacement: function (content, node) {
      return content.trim() + "\n";
    },
  });

  turndownService.addRule("tableCells", {
    filter: ["td"],
    replacement: function (content, node) {
      return content.trim() + " | ";
    },
  });

  // Keep nothing else raw
  turndownService.keep([]);

  function stripHtml(html: string) {
    if (!html) return "";
    let markdown = turndownService.turndown(html);
    // Cleanup any double pipes or weird table artifacts if gfm failed
    return markdown
      .replace(/\|\s*\|/g, "|") // Collapse empty pipes
      .replace(/\n\s*\|/g, "\n") // Clean start of lines
      .trim();
  }

  function copyOriginal() {
    // Basic HTML stripping
    const text = stripHtml(data.section.originalContent);
    proposalContent = text;
  }

  // Reactive diff generation
  let diffParts = $derived.by(() => {
    if (!showDiff) return [];
    const originalText = stripHtml(data.section.originalContent);
    return diffWords(originalText, proposalContent);
  });

  async function saveProposal() {
    isSaving = true;
    saveMessage = "";

    try {
      const response = await fetch(`/api/sections/${data.section.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: proposalContent,
          notes: proposalNotes,
        }),
      });

      if (!response.ok) throw new Error("Failed to save");
      saveMessage = "Saved!";
      setTimeout(() => (saveMessage = ""), 2000);
    } catch (e) {
      saveMessage = "Error saving";
    } finally {
      isSaving = false;
    }
  }

  async function updateStatus(status: Section["status"]) {
    try {
      const response = await fetch(`/api/sections/${data.section.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) throw new Error("Failed to update status");
      currentStatus = status;
    } catch (e) {
      console.error("Status update failed:", e);
    }
  }
</script>

<div class="h-[calc(100vh-8rem)] flex overflow-hidden bg-background">
  <!-- Left Sidebar: Section Navigation -->
  <aside
    class="w-72 border-r border-border/50 bg-card/30 backdrop-blur-sm overflow-y-auto flex flex-col"
  >
    <div
      class="p-4 border-b border-border/50 sticky top-0 bg-background/80 backdrop-blur-md z-10"
    >
      <a
        href="/"
        class="text-sm font-medium text-muted-foreground hover:text-primary flex items-center gap-2 mb-4 transition-colors group"
      >
        <div
          class="w-6 h-6 rounded-full bg-secondary flex items-center justify-center group-hover:bg-primary/20 group-hover:text-primary transition-colors"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-3.5 w-3.5"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fill-rule="evenodd"
              d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
              clip-rule="evenodd"
            />
          </svg>
        </div>
        Back to Dashboard
      </a>
      <div class="flex items-center justify-between">
        <h3 class="font-bold text-sm tracking-tight">SECTIONS</h3>
        <span
          class="text-xs font-mono text-muted-foreground bg-secondary px-1.5 py-0.5 rounded"
          >{data.sections.length}</span
        >
      </div>
    </div>

    <nav class="p-3 space-y-1">
      {#each data.sections as section}
        <a
          href="/document/{data.document.id}/section/{section.id}"
          class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 group {section.id ===
          data.section.id
            ? 'bg-primary/10 text-primary font-medium shadow-sm'
            : 'text-muted-foreground hover:bg-secondary/50 hover:text-foreground'}"
        >
          <span
            class="w-6 h-6 rounded-md text-[10px] font-mono flex items-center justify-center transition-colors {section.id ===
            data.section.id
              ? 'bg-primary/20 text-primary'
              : 'bg-secondary text-muted-foreground group-hover:bg-secondary/80'}"
          >
            {section.order + 1}
          </span>
          <Tooltip.Provider>
            <Tooltip.Root>
              <Tooltip.Trigger class="truncate flex-1 text-left cursor-pointer">
                <span class="truncate block">{section.title}</span>
              </Tooltip.Trigger>
              <Tooltip.Content>
                <p>{section.title}</p>
              </Tooltip.Content>
            </Tooltip.Root>
          </Tooltip.Provider>
          {#if section.status === "complete"}
            <div
              class="w-1.5 h-1.5 rounded-full bg-[hsl(var(--status-complete))] shadow-[0_0_4px] shadow-[hsl(var(--status-complete))]"
            ></div>
          {:else if section.status === "in-progress"}
            <div
              class="w-1.5 h-1.5 rounded-full bg-[hsl(var(--status-in-progress))]"
            ></div>
          {/if}
        </a>
      {/each}
    </nav>
  </aside>

  <!-- Main Content: Split Pane -->
  <div class="flex-1 flex">
    <!-- Original Content -->
    <div
      class="flex-1 border-r border-border/50 flex flex-col bg-background/50"
    >
      <div
        class="p-4 border-b border-border/50 bg-card/30 backdrop-blur-sm sticky top-0 z-10 flex items-center justify-between"
      >
        <div>
          <h2 class="font-bold text-lg tracking-tight">{data.section.title}</h2>
          <p
            class="text-xs font-medium text-muted-foreground uppercase tracking-wider mt-0.5"
          >
            Original Content
          </p>
        </div>
        <Badge
          class="transition-all {currentStatus === 'complete'
            ? 'status-complete'
            : currentStatus === 'in-progress'
              ? 'status-in-progress'
              : 'status-pending'}"
        >
          {currentStatus}
        </Badge>
      </div>
      <div class="flex-1 overflow-y-auto p-8 custom-scrollbar">
        <div
          class="document-content prose prose-invert prose-sm max-w-none text-foreground/90 leading-relaxed font-serif"
        >
          {@html data.section.originalContent}
        </div>
      </div>
    </div>

    <!-- Proposal Editor -->
    <div class="flex-1 flex flex-col bg-background">
      <div
        class="p-4 border-b border-border/50 bg-card/30 backdrop-blur-sm sticky top-0 z-10"
      >
        <div class="flex items-center justify-between">
          <div>
            <h2 class="font-bold text-lg tracking-tight">Picarro Proposal</h2>
            <div class="flex items-center gap-4 mt-1">
              <p
                class="text-xs font-medium text-muted-foreground uppercase tracking-wider"
              >
                Your proposed changes
              </p>
              <div class="flex items-center space-x-2">
                <Switch id="diff-mode" bind:checked={showDiff} />
                <Label
                  for="diff-mode"
                  class="text-xs font-medium cursor-pointer text-muted-foreground"
                  >Show Changes</Label
                >
              </div>
            </div>
          </div>
          <div class="flex items-center gap-2">
            {#if saveMessage}
              <span class="text-sm text-green-500 font-medium animate-pulse"
                >{saveMessage}</span
              >
            {/if}
            <Button
              variant="outline"
              size="sm"
              class="text-xs h-8"
              onclick={copyOriginal}
              disabled={showDiff}
            >
              Copy Original
            </Button>
            <Button
              onclick={saveProposal}
              disabled={isSaving}
              size="sm"
              class="shadow-md shadow-primary/20 hover:shadow-primary/40 transition-shadow"
            >
              {isSaving ? "Saving..." : "Save Proposal"}
            </Button>
          </div>
        </div>
      </div>
      <div class="flex-1 overflow-y-auto p-6 custom-scrollbar">
        <Tabs.Root value="proposal" class="h-full flex flex-col">
          <Tabs.List
            class="mb-4 bg-secondary/50 p-1 rounded-lg border border-border/50"
          >
            <Tabs.Trigger
              value="proposal"
              class="rounded-md data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all duration-200"
              >Proposal Content</Tabs.Trigger
            >
            <Tabs.Trigger
              value="notes"
              class="rounded-md data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all duration-200"
              >Internal Notes</Tabs.Trigger
            >
          </Tabs.List>
          <Tabs.Content value="proposal" class="flex-1 min-h-[300px] relative">
            {#if showDiff}
              <div
                class="w-full h-full p-6 border border-border/60 rounded-xl bg-card/10 text-foreground leading-relaxed overflow-auto font-serif custom-scrollbar whitespace-pre-wrap"
              >
                {#each diffParts as part}
                  {#if part.added}
                    <span
                      class="bg-green-500/20 text-green-700 dark:text-green-300 px-0.5 rounded border border-green-500/30"
                      >{part.value}</span
                    >
                  {:else if part.removed}
                    <span
                      class="bg-red-500/20 text-red-700 dark:text-red-300 line-through decoration-red-500/50 px-0.5 rounded border border-red-500/30 mx-0.5"
                      >{part.value}</span
                    >
                  {:else}
                    <span class="text-muted-foreground/80">{part.value}</span>
                  {/if}
                {/each}
              </div>
            {:else}
              <textarea
                bind:value={proposalContent}
                placeholder="Write your Picarro proposal for this section..."
                class="w-full h-full p-6 border border-border/60 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 bg-card/30 text-foreground leading-relaxed transition-all duration-200 placeholder:text-muted-foreground/50 shadow-inner font-serif text-base"
              ></textarea>
            {/if}
          </Tabs.Content>
          <Tabs.Content value="notes" class="flex-1 min-h-[300px]">
            <textarea
              bind:value={proposalNotes}
              placeholder="Add personal notes, context, or references..."
              class="w-full h-full p-6 border border-border/60 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-yellow-500/50 bg-yellow-500/5 text-foreground leading-relaxed transition-all duration-200 placeholder:text-yellow-500/30 shadow-inner"
            ></textarea>
          </Tabs.Content>
        </Tabs.Root>
      </div>

      <!-- Footer Actions -->
      <div class="p-4 border-t border-border/50 bg-card/30 backdrop-blur-md">
        <div class="flex items-center justify-between">
          <div class="flex gap-2">
            <Button
              variant={currentStatus === "pending" ? "default" : "outline"}
              size="sm"
              class="transition-all duration-200 {currentStatus === 'pending'
                ? 'bg-status-pending hover:bg-status-pending/90 text-black shadow-lg shadow-status-pending/20'
                : 'hover:border-status-pending hover:text-status-pending'}"
              onclick={() => updateStatus("pending")}
            >
              Pending
            </Button>
            <Button
              variant={currentStatus === "in-progress" ? "default" : "outline"}
              size="sm"
              class="transition-all duration-200 {currentStatus ===
              'in-progress'
                ? 'bg-status-in-progress hover:bg-status-in-progress/90 shadow-lg shadow-status-in-progress/20'
                : 'hover:border-status-in-progress hover:text-status-in-progress'}"
              onclick={() => updateStatus("in-progress")}
            >
              In Progress
            </Button>
            <Button
              variant={currentStatus === "complete" ? "default" : "outline"}
              size="sm"
              class="transition-all duration-200 {currentStatus === 'complete'
                ? 'bg-status-complete hover:bg-status-complete/90 shadow-lg shadow-status-complete/20'
                : 'hover:border-status-complete hover:text-status-complete'}"
              onclick={() => updateStatus("complete")}
            >
              Complete
            </Button>
          </div>
          <div class="flex gap-2">
            {#if data.prevSection}
              <a
                href="/document/{data.document.id}/section/{data.prevSection
                  .id}"
              >
                <Button
                  variant="ghost"
                  size="sm"
                  class="hover:bg-primary/10 hover:text-primary"
                  >← Previous</Button
                >
              </a>
            {/if}
            {#if data.nextSection}
              <a
                href="/document/{data.document.id}/section/{data.nextSection
                  .id}"
              >
                <Button
                  variant="default"
                  size="sm"
                  class="shadow-md shadow-primary/20">Next →</Button
                >
              </a>
            {/if}
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
