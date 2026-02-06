<script lang="ts">
  import "./layout.css";
  import { Button } from "$lib/components/ui/button";

  let { children } = $props();
</script>

<svelte:head>
  <title>IGG Document Assistant</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link
    rel="preconnect"
    href="https://fonts.gstatic.com"
    crossorigin="anonymous"
  />
  <link
    href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
    rel="stylesheet"
  />
</svelte:head>

<div
  class="min-h-screen flex flex-col dark bg-background text-foreground selection:bg-primary/20"
>
  <!-- Navigation Header -->
  <header class="sticky top-0 z-50 glass">
    <div class="container mx-auto px-6 h-16 flex items-center justify-between">
      <div class="flex items-center gap-8">
        <a
          href="/"
          class="flex items-center gap-3 font-bold text-xl tracking-tight hover:text-primary transition-colors"
        >
          <div
            class="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center text-primary"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2.5"
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <span>IGG Assistant</span>
        </a>
        <nav class="hidden md:flex items-center gap-6">
          <a
            href="/"
            class="text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
          >
            Dashboard
          </a>
          <a
            href="/references"
            class="text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
          >
            References
          </a>
          <a
            href="/export"
            class="text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
          >
            Export
          </a>
        </nav>
      </div>
      <div class="flex items-center gap-3">
        <div
          class="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary/50 border border-border/50"
        >
          <span class="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
          <span class="text-xs font-medium text-muted-foreground">
            Picarro × PSG
          </span>
        </div>
      </div>
    </div>
  </header>

  <!-- Main Content -->
  <main class="flex-1">
    {@render children()}
  </main>

  <!-- Footer -->
  <footer
    class="border-t border-[hsl(var(--border))] py-4 text-center text-sm text-[hsl(var(--muted-foreground))]"
  >
    IGG Document Assistant — Picarro Proposal Tool
  </footer>
</div>
