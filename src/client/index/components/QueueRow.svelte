<script lang="ts">
  let { job, columns } = $props();
</script>

<div 
  class="grid items-center px-4 py-4 hover:bg-gray-50 transition-colors gap-2 border-b border-gray-100 text-sm"
  style="grid-template-columns: repeat({columns.length}, minmax(0, 1fr));"
>
  {#each columns as colName}
    <div>
      {#if colName === "Queue"}
        <span class="font-bold text-gray-900">{job["Queue Position"] ?? 0}</span>

      {:else if colName === "Ticket & Priority"}
        <div class="flex items-start gap-2">
          <div class="w-1.5 h-10 bg-emerald-500 rounded-full mt-0.5"></div>
          <div>
            <div class="font-bold text-gray-900 tracking-tight">{job["Ticket ID"]}</div>
            <div class="mt-1">
              <span class="inline-block px-2 py-0.5 text-xs font-semibold rounded bg-amber-100 text-amber-800">
                {job["Priority"] || 'Standard'}
              </span>
            </div>
          </div>
        </div>

      {:else if colName === "Ticket ID"}
        <span class="font-bold text-blue-600">{job["Ticket ID"] || 'N/A'}</span>

      {:else if colName === "Requester"}
        <div>
          <div class="font-medium text-gray-900 break-all">{job["Teacher Email"]}</div>
          <div class="text-xs text-gray-500 mt-0.5">Sub: {job["Submitted At"]}</div>
        </div>

      {:else if colName === "Job Details"}
        <div class="space-y-1">
          <div class="font-semibold text-gray-900">{job["Copies"] ?? 0} copies</div>
          <div class="text-xs text-gray-600 flex items-center gap-1.5">
            <span>{job["Color"] ?? 'B&W'}</span>
            <span>•</span>
            <span>{job["Finishing"] ?? 'None'}</span>
          </div>
          <div class="text-xs text-gray-400">
            {job["Paper Size"] ?? 'Letter'} • {job["Sides"] ?? 'Single-sided'}
          </div>
        </div>

      {:else if colName === "SLA Due/Needed" || colName === "SLA Due"}
        <div class="space-y-1">
          <div class="text-red-700 font-semibold text-xs">{job["SLA Due"] || 'N/A'}</div>
          {#if job["Needed By"]}
            <div class="text-xs text-gray-500">Needed: {job["Needed By"]}</div>
          {/if}
        </div>

      {:else if colName === "Est. Completion"}
        <span class="text-xs text-gray-600">{job["Estimated Completion"] || 'Pending'}</span>

      {:else if colName === "Notification" || colName === "Last Update" || colName === "Completed"}
        <span class="text-gray-600 text-xs">{job["Last Notification"] || 'None'}</span>

      {:else if colName === "Internal Notes"}
        <input 
          type="text" 
          class="border border-gray-300 rounded px-2 py-1 text-xs w-full" 
          value={job["Internal Notes"] || ''} 
        />

      {:else if colName === "Status"}
        <span class="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800 font-medium">
          {job["Status"] || 'Queued'}
        </span>

      {:else if colName === "Actions"}
        <button class="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3 py-1.5 rounded transition-colors shadow-sm w-full">
          Save
        </button>

      {:else}
        {job[colName] ?? '—'}
      {/if}
    </div>
  {/each}
</div>