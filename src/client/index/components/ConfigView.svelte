<script lang="ts">
  import { appStore } from '../stores/appStore';
</script>

<div class="card config-card">
  {#if $appStore.loading}
    <p>Loading cache data...</p>
  {:else if !$appStore.isAdmin && Object.keys($appStore.configBundle).length === 0}
    <p class="unauthorized">🔒 Unauthorized: Admin access required to view system configuration.</p>
  {:else}
    <pre class="json-box">{JSON.stringify($appStore.configBundle, null, 2)}</pre>
  {/if}
</div>

<style>
  .unauthorized {
    color: #d9534f;
    font-weight: bold;
  }
  .json-box {
    background: #f4f6f9;
    padding: 1rem;
    border-radius: 4px;
    overflow-x: auto;
    font-size: 0.85rem;
  }
</style>