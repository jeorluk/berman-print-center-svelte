<script lang="ts">
  import { appStore } from '../stores/appStore';
  import QueueDisplay from './QueueDisplay.svelte';

  // Define tab configurations with label and target statuses
  const navTabs = [
    { label: 'Active Queue', statuses: ['Queued'] },
    { label: 'In Production', statuses: ['In Production'] },
    { label: 'Action Required', statuses: ['Action Required', 'Submitted'] },
    { label: 'History / Archived', statuses: ['Completed', 'Canceled'] }
  ];

  // Selected tab state using Svelte 5 $state rune
  let selectedTab = $state(navTabs[0]);

  // Helper to count jobs for badges
  function getCountForStatuses(statuses: string[]): number {
    const all = $appStore.allJobs || [];
    return all.filter(job => {
      const status = String(job["Status"] || "").trim().toLowerCase();
      return statuses.some(s => s.trim().toLowerCase() === status);
    }).length;
  }

  // Count for alert banner
  let actionRequiredCount = $derived(() => {
    return getCountForStatuses(['Action Required', 'Review']);
  });

  // Derive the jobs that match the currently selected tab's statuses
  let filteredJobs = $derived(() => {
    const all = $appStore.allJobs || [];
    return all.filter(job => {
      const status = String(job["Status"] || "").trim().toLowerCase();
      return selectedTab.statuses.some(s => s.trim().toLowerCase() === status);
    });
  });
</script>

<div class="admin-container">
  <!-- Top Alert Banner if action required -->
  {#if actionRequiredCount() > 0}
    <div class="alert-banner">
      <span>⚠️ <strong>Action Required:</strong> {actionRequiredCount()} ticket(s) need your attention.</span>
      <button class="banner-btn" onclick={() => selectedTab = navTabs.find(t => t.label === 'Action Required') || navTabs[0]}>
        View Action Required
      </button>
    </div>
  {/if}

  <!-- Status Selection Nav Buttons -->
  <div class="tabs-bar">
    {#each navTabs as tab}
      <button 
        class="tab-pill {selectedTab.label === tab.label ? 'active' : ''}" 
        onclick={() => selectedTab = tab}
      >
        {tab.label} <span class="badge-count">{getCountForStatuses(tab.statuses)}</span>
      </button>
    {/each}
  </div>

  <!-- QueueDisplay component receiving the filtered jobs and admin column set -->
  <QueueDisplay 
    jobs={filteredJobs()} 
    columnSet="admin" 
    emptyMessage={`No jobs found in "${selectedTab.label}".`} 
  />
</div>

<style>
  .admin-container {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }
  .alert-banner {
    background-color: #fffbeb;
    border: 1px solid #fde68a;
    color: #92400e;
    padding: 1rem 1.5rem;
    border-radius: 8px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.9rem;
  }
  .banner-btn {
    background-color: #d97706;
    color: white;
    border: none;
    padding: 0.4rem 1rem;
    border-radius: 4px;
    font-weight: 600;
    cursor: pointer;
  }
  .tabs-bar {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }
  .tab-pill {
    background: #e2e8f0;
    border: none;
    padding: 0.5rem 1rem;
    border-radius: 20px;
    font-weight: 600;
    color: #475569;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.9rem;
  }
  .tab-pill.active {
    background-color: #001F3F;
    color: #ffffff;
  }
  .badge-count {
    background: rgba(255, 255, 255, 0.2);
    padding: 0.1rem 0.5rem;
    border-radius: 10px;
    font-size: 0.75rem;
  }
  .tab-pill:not(.active) .badge-count {
    background: #cbd5e1;
    color: #1e293b;
  }
</style>