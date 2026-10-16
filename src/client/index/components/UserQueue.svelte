<script lang="ts">
  import { appStore } from '../stores/appStore';
  import QueueDisplay from './QueueDisplay.svelte';

  // Helper categories mapping statuses to their respective subtypes
  const STATUS_MAP = {
    action: ["Submitted", "Action Required"],
    ready: ["Ready"],
    production: ["In Production"],
    queued: ["Queued"],
    final: ["Completed", "Cancelled"]
  };

  // Reactive splits using Svelte 5 $derived runes
  let actionJobs = $derived(($appStore.userJobs || []).filter(job => 
    STATUS_MAP.action.includes(job["Status"])
  ));

  let readyJobs = $derived(($appStore.userJobs || []).filter(job => 
    STATUS_MAP.ready.includes(job["Status"])
  ));

  let productionJobs = $derived(($appStore.userJobs || []).filter(job => 
    STATUS_MAP.production.includes(job["Status"])
  ));

 let queuedJobs = $derived(
    [...($appStore.userJobs || []).filter(job => STATUS_MAP.queued.includes(job["Status"]))]
      .sort((a, b) => Number(a["Queue Position"] ?? 9999) - Number(b["Queue Position"] ?? 9999))
  );

let finalJobs = $derived(
    [...($appStore.userJobs || []).filter(job => STATUS_MAP.final.includes(job["Status"]))]
      .sort((a, b) => new Date(b["Submitted At"] || 0).getTime() - new Date(a["Submitted At"] || 0).getTime())
  );
</script>

<div class="card p-6 space-y-8">
  <h2 class="text-xl font-bold text-gray-900 border-b pb-2">My Print Requests Dashboard</h2>

  {#if $appStore.loading}
    <p class="loading">Loading print requests...</p>
  {:else}
    <!-- 1. Action Required / Submitted Section -->
    {#if actionJobs.length > 0}
      <section class="section-block">
        <h3 class="text-amber-700 font-semibold mb-3">Action Required / Submitted</h3>
        <QueueDisplay jobs={actionJobs} columnSet="user" subtype="action" emptyMessage="" />
      </section>
    {/if}

    <!-- 2. Ready for Pickup Section -->
    {#if readyJobs.length > 0}
      <section class="section-block">
        <h3 class="text-emerald-700 font-semibold mb-3">Ready for Pickup</h3>
        <QueueDisplay jobs={readyJobs} columnSet="user" subtype="ready" emptyMessage="" />
      </section>
    {/if}

    <!-- 3. In Production Section -->
    {#if productionJobs.length > 0}
      <section class="section-block">
        <h3 class="text-blue-700 font-semibold mb-3">In Production</h3>
        <QueueDisplay jobs={productionJobs} columnSet="user" subtype="inproduction" emptyMessage="" />
      </section>
    {/if}

    <!-- 4. Queued Section -->
    {#if queuedJobs.length > 0}
      <section class="section-block">
        <h3 class="text-indigo-700 font-semibold mb-3">Queued (Ordered by Queue Position)</h3>
        <QueueDisplay jobs={queuedJobs} columnSet="user" subtype="queued" emptyMessage="" />
      </section>
    {/if}

    <!-- 5. Final / History Section -->
    {#if finalJobs.length > 0}
      <section class="section-block">
        <h3 class="text-gray-700 font-semibold mb-3">Completed & Cancelled History</h3>
        <QueueDisplay jobs={finalJobs} columnSet="user" subtype="final" emptyMessage="" />
      </section>
    {/if}

    <!-- Global Empty State if absolutely no jobs exist -->
   {#if actionJobs.length === 0 && readyJobs.length === 0 && productionJobs.length === 0 && queuedJobs.length === 0 && finalJobs.length === 0}
      <p class="empty-msg text-center py-8">You have no print requests found.</p>
    {/if}
  {/if}
</div>

<style>
  .card {
    background: #FFFFFF;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
    border-top: 4px solid #001F3F;
  }
  .section-block h3 {
    font-size: 1rem;
    border-bottom: 2px solid #f4f6f9;
    padding-bottom: 0.4rem;
  }
  .empty-msg {
    color: #718096;
    font-style: italic;
    font-size: 0.9rem;
  }
  .loading {
    color: #4a5568;
    font-style: italic;
  }
</style>