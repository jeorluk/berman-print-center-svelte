<script lang="ts">
  import { appStore } from '../stores/appStore';

  // Helper to determine if a job is in the active queue
  // Adjust status matching based on your workflow values (e.g., 'Queued', 'In Progress', etc.)
  function isActiveJob(job: any): boolean {
    const status = String(job["Status"] || "").trim().toLowerCase();
    return status === 'queued' || status === 'in progress' || status === 'pending' || status === 'printing' || status === '';
  }

  // Reactive sorting logic
  let activeJobs = $derived(() => {
    const jobs = $appStore.userJobs || [];
    return jobs
      .filter(isActiveJob)
      .sort((a, b) => {
        const qA = Number(a["Queue Position"] ?? 9999);
        const qB = Number(b["Queue Position"] ?? 9999);
        return qA - qB; // Lowest queue position first
      });
  });

  let otherJobs = $derived(() => {
    const jobs = $appStore.userJobs || [];
    return jobs
      .filter(job => !isActiveJob(job))
      .sort((a, b) => {
        const dateA = new Date(a["Submitted At"] || 0).getTime();
        const dateB = new Date(b["Submitted At"] || 0).getTime();
        return dateB - dateA; // Most recent submission to oldest
      });
  });
</script>

<div class="card">
  {#if $appStore.loading}
    <p class="loading">Loading print requests...</p>
  {:else}
    <!-- Active Queue Section -->
    <section class="section-block">
      <h3>Active Queue (Ordered by Queue Position)</h3>
      {#if activeJobs().length === 0}
        <p class="empty-msg">You have no jobs currently in the active queue.</p>
      {:else}
        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th>Queue Pos</th>
                <th>Ticket ID</th>
                <th>SLA Due</th>
                <th>Estimated Completion</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {#each activeJobs() as job}
                <tr>
                  <td><span class="badge queue-badge">#{job["Queue Position"] ?? '-'}</span></td>
                  <td><strong>{job["Ticket ID"] || 'N/A'}</strong></td>
                  <td>{job["SLA Due"] || 'N/A'}</td>
                  <td>{job["Estimated Completion"] || 'Pending'}</td>
                  <td><span class="status-pill {String(job["Status"] || 'queued').toLowerCase()}">{job["Status"] || 'Queued'}</span></td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {/if}
    </section>

    <!-- Other Jobs Section -->
    <section class="section-block">
      <h3>Past Requests (Most Recent First)</h3>
      {#if otherJobs().length === 0}
        <p class="empty-msg">No past history found.</p>
      {:else}
        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th>Ticket ID</th>
                <th>SLA Due</th>
                <th>Estimated Completion</th>
                <th>Completed At</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {#each otherJobs() as job}
                <tr>
                  <td><strong>{job["Ticket ID"] || 'N/A'}</strong></td>
                  <td>{job["SLA Due"] || 'N/A'}</td>
                  <td>{job["Estimated Completion"] || 'N/A'}</td>
                  <td>{job["Completed At"] || 'N/A'}</td>
                  <td><span class="status-pill {String(job["Status"] || 'completed').toLowerCase()}">{job["Status"] || 'Completed'}</span></td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {/if}
    </section>
  {/if}
</div>

<style>
  /* .card {
    background: #FFFFFF;
    padding: 2rem;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
    border-top: 4px solid #001F3F;
  } */
  .subtitle {
    color: #666;
    margin-bottom: 1.5rem;
  }
  .section-block {
    margin-top: 2rem;
  }
  .section-block h3 {
    font-size: 1.1rem;
    color: #001F3F;
    border-bottom: 2px solid #f4f6f9;
    padding-bottom: 0.5rem;
    margin-bottom: 1rem;
  }
  .table-container {
    overflow-x: auto;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    text-align: left;
    font-size: 0.9rem;
  }
  th, td {
    padding: 0.75rem 1rem;
    border-bottom: 1px solid #edf2f7;
  }
  th {
    background-color: #f8fafc;
    color: #4a5568;
    font-weight: 600;
  }
  tr:hover {
    background-color: #f8fafc;
  }
  .badge {
    background-color: #001F3F;
    color: #fff;
    padding: 0.2rem 0.5rem;
    border-radius: 4px;
    font-weight: bold;
    font-size: 0.85rem;
  }
  .status-pill {
    padding: 0.2rem 0.6rem;
    border-radius: 12px;
    font-size: 0.75rem;
    font-weight: bold;
    text-transform: uppercase;
    background: #e2e8f0;
    color: #475569;
  }
  .status-pill.queued, .status-pill.pending {
    background: #fef3c7;
    color: #d97706;
  }
  .status-pill.in.progress, .status-pill.printing {
    background: #e0f2fe;
    color: #0284c7;
  }
  .status-pill.completed, .status-pill.done {
    background: #dcfce7;
    color: #16a34a;
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