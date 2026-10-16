<script lang="ts">
  import { onMount } from 'svelte';
  import Application from '../Application.svelte';
  import { appStore, initAppStore } from './stores/appStore';
  
  import UserQueue from './components/UserQueue.svelte';
  import AdminQueue from './components/AdminQueue.svelte';
  import ConfigView from './components/ConfigView.svelte';
  import PrintForm from './components/PrintForm.svelte';

  type View = 'user' | 'admin' | 'config';
  
  let currentView: View = $state('user');
  let isNewJobOpen: boolean = $state(false);
  
  onMount(async () => {
    // Initialize the store data caches
    await initAppStore();
  });
  let userEmail = $derived($appStore.currentUserEmail || 'Guest User');
  function setView(view: View) {
    currentView = view;
  }
</script>

<Application>
  <main>
    <header>
      <div class="brand">
        <h1>Berman Print Center</h1>
      </div>
      
      <nav class="nav-tabs">
        <button class={currentView === 'user' ? 'active' : ''} onclick={() => setView('user')}>User</button>
        <button class={currentView === 'admin' ? 'active' : ''} onclick={() => setView('admin')}>Admin</button>
        <button class={currentView === 'config' ? 'active' : ''} onclick={() => setView('config')}>Config</button>
      </nav>

      <div class="nav-controls">
        <button class="new-job-btn" onclick={() => isNewJobOpen = true}>+ New Job</button>
        <span class="role-badge">User: {userEmail}</span>
      </div>
    </header>

    <section class="content-container">
      {#if currentView === 'user'}
        <UserQueue />
      {:else if currentView === 'admin'}
        <AdminQueue />
      {:else if currentView === 'config'}
        <ConfigView />
      {/if}
    </section>
  </main>
</Application>

<PrintForm 
  isOpen={isNewJobOpen} 
  onClose={() => isNewJobOpen = false} 
/>

<style>
  :global {
    body {
      margin: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background-color: #f4f6f9;
      color: #333333;
    }
    .card {
      background: #FFFFFF;
      padding: 1.5rem;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
      border-top: 4px solid #001F3F;
    }
  }
  main {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
  }
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
  }
  .nav-tabs {
    display: flex;
    gap: 0.5rem;
    background: rgba(255, 255, 255, 0.1);
    padding: 0.25rem;
    border-radius: 6px;
  }
  .nav-tabs button {
    background: transparent;
    color: #FFFFFF;
    border: none;
    padding: 0.4rem 1rem;
    border-radius: 4px;
    font-weight: 600;
    cursor: pointer;
  }
  .nav-tabs button.active {
    background-color: #FF851B;
  }
  .nav-controls {
    display: flex;
    align-items: center;
    gap: 1rem;
  }
  .new-job-btn {
    background-color: #FF851B;
    color: #FFFFFF;
    border: none;
    padding: 0.4rem 0.8rem;
    border-radius: 4px;
    font-weight: 600;
    cursor: pointer;
    transition: opacity 0.2s;
  }
  .new-job-btn:hover {
    opacity: 0.9;
  }
  .role-badge {
    background-color: #FF851B;
    color: #FFFFFF;
    padding: 0.3rem 0.75rem;
    border-radius: 4px;
    font-size: 0.8rem;
    font-weight: bold;
  }
  .content-container {
    padding: 2.5rem 2rem;
    max-width: 1000px;
    margin: 0 auto;
    width: 100%;
    box-sizing: border-box;
  }
</style>