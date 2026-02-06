<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import * as Card from "$lib/components/ui/card";
  import { Badge } from "$lib/components/ui/badge";
  import * as Tabs from "$lib/components/ui/tabs";

  let { data } = $props();

  let copySuccess = $state("");

  function generateExportText(includeOriginal: boolean): string {
    if (!data.sections?.length) return "";

    return data.sections
      .map((section: any) => {
        let text = `## ${section.order + 1}. ${section.title}\n\n`;

        if (includeOriginal) {
          // Strip HTML from original content but preserve structure
          const originalText = section.originalContent
            .replace(/<br\s*\/?>/gi, "\n")
            .replace(/<\/p>/gi, "\n\n")
            .replace(/<\/h[1-6]>/gi, "\n\n")
            .replace(/<\/li>/gi, "\n")
            .replace(/<[^>]*>/g, "")
            .replace(/&nbsp;/g, " ")
            .trim();
          text += `**Original:**\n${originalText}\n\n`;
        }

        if (section.proposal?.content) {
          text += `**Picarro Proposal:**\n${section.proposal.content}\n`;
        } else {
          text += `**Picarro Proposal:** *(Not yet written)*\n`;
        }

        text += `\n---\n`;
        return text;
      })
      .join("\n");
  }

  function generateProposalsOnly(): string {
    if (!data.sections?.length) return "";

    return data.sections
      .filter((s: any) => s.proposal?.content)
      .map((section: any) => {
        return `## ${section.order + 1}. ${section.title}\n\n${section.proposal.content}\n`;
      })
      .join("\n---\n\n");
  }

  async function copyToClipboard(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      copySuccess = label;
      setTimeout(() => (copySuccess = ""), 2000);
    } catch (e) {
      console.error("Copy failed:", e);
    }
  }

  const completedCount = $derived(
    data.sections?.filter((s: any) => s.status === "complete").length || 0,
  );
  const withProposals = $derived(
    data.sections?.filter((s: any) => s.proposal?.content).length || 0,
  );
</script>

<div class="h-[calc(100vh-8rem)] flex gap-6 p-6 overflow-hidden bg-background">
  {#if !data.mainDocument}
    <div class="flex-1 flex items-center justify-center">
      <Card.Root
        class="border-dashed border-2 border-border/60 bg-card/30 max-w-lg w-full"
      >
        <Card.Content class="py-24 text-center">
          <div
            class="w-16 h-16 bg-secondary/50 rounded-2xl flex items-center justify-center mx-auto mb-6"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-8 w-8 text-muted-foreground"
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
          <h3 class="text-xl font-medium mb-2">No document found</h3>
          <a href="/" class="text-primary hover:underline">
            Go to Dashboard to upload
          </a>
        </Card.Content>
      </Card.Root>
    </div>
  {:else}
    <!-- Left Sidebar: Settings & Stats -->
    <div
      class="w-80 flex flex-col gap-6 overflow-y-auto pr-2 custom-scrollbar shrink-0"
    >
      <div>
        <h1
          class="text-2xl font-bold bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent mb-1"
        >
          Export
        </h1>
        <p class="text-muted-foreground text-sm">Review and copy proposals</p>
      </div>

      <!-- Stats Grid (Vertical now) -->
      <div class="grid grid-cols-1 gap-4">
        <Card.Root class="border-border/50 bg-card/40 backdrop-blur-sm">
          <Card.Content class="py-4 flex items-center justify-between">
            <div>
              <div
                class="text-xs font-medium text-muted-foreground uppercase tracking-wider"
              >
                Total
              </div>
              <div class="text-2xl font-bold">{data.sections.length}</div>
            </div>
          </Card.Content>
        </Card.Root>
        <Card.Root class="border-border/50 bg-card/40 backdrop-blur-sm">
          <Card.Content class="py-4 flex items-center justify-between">
            <div>
              <div
                class="text-xs font-medium text-muted-foreground uppercase tracking-wider"
              >
                Completed
              </div>
              <div class="text-2xl font-bold text-green-500">
                {completedCount}
              </div>
            </div>
          </Card.Content>
        </Card.Root>
        <Card.Root class="border-border/50 bg-card/40 backdrop-blur-sm">
          <Card.Content class="py-4 flex items-center justify-between">
            <div>
              <div
                class="text-xs font-medium text-muted-foreground uppercase tracking-wider"
              >
                With Proposals
              </div>
              <div class="text-2xl font-bold text-blue-500">
                {withProposals}
              </div>
            </div>
          </Card.Content>
        </Card.Root>
      </div>
    </div>

    <!-- Main Content: Tabs & Preview -->
    <div
      class="flex-1 flex flex-col min-w-0 bg-background rounded-xl overflow-hidden"
    >
      <Tabs.Root value="full" class="flex-1 flex flex-col h-full">
        <div class="flex items-center justify-between gap-4 mb-4 shrink-0">
          <Tabs.List
            class="bg-secondary/30 p-1 rounded-lg border border-border/50"
          >
            <Tabs.Trigger
              value="full"
              class="rounded data-[state=active]:bg-background data-[state=active]:shadow-sm px-4"
              >Full Export</Tabs.Trigger
            >
            <Tabs.Trigger
              value="proposals"
              class="rounded data-[state=active]:bg-background data-[state=active]:shadow-sm px-4"
              >Proposals Only</Tabs.Trigger
            >
            <Tabs.Trigger
              value="preview"
              class="rounded data-[state=active]:bg-background data-[state=active]:shadow-sm px-4"
              >Sections Preview</Tabs.Trigger
            >
          </Tabs.List>

          <!-- Global Action -->
          <!-- This button logic needs to change based on active tab, but for simplicity let's rely on tab content buttons or make this dynamic -->
        </div>

        <div
          class="flex-1 overflow-hidden relative border border-border/50 rounded-xl bg-card/20 backdrop-blur-sm flex flex-col"
        >
          <Tabs.Content
            value="full"
            class="flex-1 flex flex-col h-full m-0 data-[state=inactive]:hidden"
          >
            <div
              class="p-4 border-b border-border/50 flex justify-between items-center bg-card/40 backdrop-blur-sm"
            >
              <div>
                <h3 class="font-semibold">Full Document</h3>
                <p class="text-xs text-muted-foreground">
                  Original content + Proposals
                </p>
              </div>
              <Button
                onclick={() =>
                  copyToClipboard(generateExportText(true), "full")}
                class="gap-2 shadow-lg shadow-primary/20"
                size="sm"
              >
                {copySuccess === "full" ? "✓ Copied!" : "Copy to Clipboard"}
              </Button>
            </div>
            <div
              class="flex-1 overflow-y-auto p-6 custom-scrollbar bg-background/50"
            >
              <pre
                class="whitespace-pre-wrap font-mono text-sm text-muted-foreground leading-relaxed">{generateExportText(
                  true,
                )}</pre>
            </div>
          </Tabs.Content>

          <Tabs.Content
            value="proposals"
            class="flex-1 flex flex-col h-full m-0 data-[state=inactive]:hidden"
          >
            <div
              class="p-4 border-b border-border/50 flex justify-between items-center bg-card/40 backdrop-blur-sm"
            >
              <div>
                <h3 class="font-semibold">Proposals Only</h3>
                <p class="text-xs text-muted-foreground">
                  Just Picarro proposals text
                </p>
              </div>
              <Button
                onclick={() =>
                  copyToClipboard(generateProposalsOnly(), "proposals")}
                class="gap-2 shadow-lg shadow-primary/20"
                size="sm"
              >
                {copySuccess === "proposals"
                  ? "✓ Copied!"
                  : "Copy to Clipboard"}
              </Button>
            </div>
            <div
              class="flex-1 overflow-y-auto p-6 custom-scrollbar bg-background/50"
            >
              <pre
                class="whitespace-pre-wrap font-mono text-sm text-muted-foreground leading-relaxed">{generateProposalsOnly()}</pre>
            </div>
          </Tabs.Content>

          <Tabs.Content
            value="preview"
            class="flex-1 flex flex-col h-full m-0 data-[state=inactive]:hidden"
          >
            <div
              class="p-4 border-b border-border/50 bg-card/40 backdrop-blur-sm"
            >
              <h3 class="font-semibold">Section Preview</h3>
              <p class="text-xs text-muted-foreground">
                Visual check of all sections
              </p>
            </div>
            <div
              class="flex-1 overflow-y-auto p-6 custom-scrollbar space-y-4 bg-background/50"
            >
              {#each data.sections as section}
                <Card.Root class="border-border/50 bg-card/60">
                  <Card.Header class="py-3 px-4 border-b border-border/30">
                    <div class="flex items-center justify-between">
                      <Card.Title
                        class="text-sm font-medium flex items-center gap-2"
                      >
                        <span class="text-muted-foreground"
                          >{section.order + 1}.</span
                        >
                        {section.title}
                      </Card.Title>
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
                  </Card.Header>
                  <Card.Content class="p-4">
                    {#if section.proposal?.content}
                      <div
                        class="bg-green-500/10 border border-green-500/20 rounded-lg p-3"
                      >
                        <div
                          class="text-[10px] font-medium text-green-500 mb-1 uppercase tracking-wider"
                        >
                          Proposal
                        </div>
                        <p class="text-sm whitespace-pre-wrap">
                          {section.proposal.content}
                        </p>
                      </div>
                    {:else}
                      <span class="text-xs text-muted-foreground italic"
                        >No proposal</span
                      >
                    {/if}
                  </Card.Content>
                </Card.Root>
              {/each}
            </div>
          </Tabs.Content>
        </div>
      </Tabs.Root>
    </div>
  {/if}
</div>
