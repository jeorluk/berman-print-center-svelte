<script lang="ts">
  import QueueRow from './QueueRow.svelte';

  // Props using Svelte 5 runes
  let { 
    jobs = [], 
    columnSet = 'admin', 
    subtype = 'queued',
    emptyMessage = "No jobs found in this queue."
  }: {
    jobs: any[];
    columnSet?: keyof typeof COLUMN_SCHEMAS;
    subtype?: string;
    emptyMessage?: string;
  } = $props();

  // Strongly typed schema structure
  const COLUMN_SCHEMAS: Record<string, Record<string, string[]>> = {
    admin: {
      printqueue: ["Queue", "Ticket & Priority", "Requester", "Job Details", "SLA Due/Needed", "Notification", "Internal Notes", "Status", "Actions"],
      printproduction: ["Ticket & Priority", "Requester", "Job Details", "SLA Due/Needed", "Notification", "Internal Notes", "Status", "Actions"],
      action: ["Ticket & Priority", "Requester", "Job Details", "SLA Due/Needed", "Notification", "Internal Notes", "Status", "Actions"],
      completed: ["Ticket & Priority", "Requester", "Job Details", "SLA Due/Needed", "Notification", "Internal Notes", "Status", "Actions"]
    },
    user: {
      action: ["Ticket ID", "Last Update", "Internal Notes", "Status"],
      ready: ["Ticket ID", "SLA Due", "Completed", "Status"],
      production: ["Ticket ID", "SLA Due", "Est. Completion", "Status"],
      queued: ["Queue", "Ticket ID", "SLA Due", "Est. Completion", "Status"],
      final: ["Ticket ID", "SLA Due", "Completed", "Status"]
    },
    archive: {}
  };

  // Safely resolve the active column name array with explicit typing
  let activeColumns = $derived(() => {
    const setObj = COLUMN_SCHEMAS[columnSet] || COLUMN_SCHEMAS.admin;
    return setObj[subtype] || setObj['queued'] || Object.values(setObj)[0] || [];
  });
</script>

<div class="overflow-x-auto shadow-sm rounded-lg border border-gray-200 bg-white">
  <!-- Level 1: Render dynamic grid headers based on active column length -->
  <div 
    class="grid bg-gray-50 text-gray-700 text-sm font-semibold px-4 py-3 border-b border-gray-200 gap-2 items-center"
    style="grid-template-columns: repeat({activeColumns().length}, minmax(0, 1fr));"
  >
    {#each activeColumns() as colName}
      <div>{colName}</div>
    {/each}
  </div>

  <!-- Level 2: Render each job via QueueRow component -->
  <div class="divide-y divide-gray-200 text-sm">
    {#if jobs.length === 0}
      <div class="px-4 py-8 text-center text-gray-500">
        {emptyMessage}
      </div>
    {:else}
      {#each jobs as job (job["Ticket ID"] || job.id)}
        <QueueRow {job} columns={activeColumns()} />
      {/each}
    {/if}
  </div>
</div>