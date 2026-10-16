<script>
  // State tracking current view: 'user' or 'admin'
  let currentView = 'user';

  function toggleView() {
    currentView = currentView === 'user' ? 'admin' : 'user';
  }
</script>

<main>
  <!-- Header Bar -->
  <header>
    <div class="brand">
      <h1>Berman Print Center</h1>
    </div>
    <div class="nav-controls">
      <span class="role-badge">View: {currentView.toUpperCase()}</span>
      <button on:click={toggleView}>
        Switch to {currentView === 'user' ? 'Admin' : 'User'} View
      </button>
    </div>
  </header>

  <!-- Dynamic Content Area -->
  <section class="content-container">
    {#if currentView === 'user'}
      <div class="card">
        <h2>User Queue</h2>
        <p>You are currently viewing the <strong>User Queue</strong> interface. Print job submission forms and user tracking data will live here.</p>
      </div>
    {:else}
      <div class="card admin-card">
        <h2>Admin Queue & Configuration</h2>
        <p>You are currently viewing the <strong>Admin Management</strong> interface. Queue controls, job approvals, and system settings will live here.</p>
      </div>
    {/if}
  </section>
</main>

<style>
  :global(body) {
    margin: 0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
    background-color: #f4f6f9;
    color: #333333;
  }

  main {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
  }

  /* School Colors Header: Deep Navy & White */
  header {
    background-color: #001F3F; 
    color: #FFFFFF;
    padding: 1.25rem 2rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }

  header h1 {
    margin: 0;
    font-size: 1.5rem;
    letter-spacing: 0.5px;
  }

  .nav-controls {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  /* Accent Color: Vibrant Orange */
  .role-badge {
    background-color: #FF851B;
    color: #FFFFFF;
    padding: 0.3rem 0.75rem;
    border-radius: 4px;
    font-size: 0.8rem;
    font-weight: bold;
    letter-spacing: 0.5px;
  }

  button {
    background-color: #FF851B;
    color: #FFFFFF;
    border: none;
    padding: 0.5rem 1rem;
    border-radius: 4px;
    font-weight: bold;
    cursor: pointer;
    transition: background-color 0.2s ease;
  }

  button:hover {
    background-color: #e06d0b;
  }

  .content-container {
    padding: 2.5rem 2rem;
    max-width: 1000px;
    margin: 0 auto;
    width: 100%;
    box-sizing: border-box;
  }

  .card {
    background: #FFFFFF;
    padding: 2rem;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
    border-top: 4px solid #001F3F;
  }

  .admin-card {
    border-top-color: #FF851B;
  }

  .card h2 {
    margin-top: 0;
    color: #001F3F;
  }
</style>