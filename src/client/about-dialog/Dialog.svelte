<script lang="ts">
  import Application from '../Application.svelte';
  import { serverFunctions } from '../utils/serverFunctions';

  const environment = import.meta.env.DEV ? 'development' : 'production';

  let locale = $state<string>();
  let loading = $state<boolean>(false);

  const runServerFunction = async () => {
    loading = true;
    const result = await serverFunctions.getSpreadsheetLocale();
    locale = result;
    loading = false;
  };
</script>

<Application>
  <p class="mb-4">Thank you for using the Svelte Google Apps Script template!</p>
  <button
    type="button"
    class="text-black box-border border hover:bg-brand-strong shadow-xs font-medium rounded-base text-sm px-4 py-1"
    onclick={() => runServerFunction()}
    >{loading ? 'Loading...' : 'Get spreadsheet locale'}</button>
  <p class="mb-4">{locale ? `Spreadsheet locale: ${locale}` : ''}</p>
  <p class="mb-4">The code for this Google Apps Script Template can be found here:</p>
  <a class="mb-4 font-bold underline" target="_blank" href="https://github.com/melledijkstra/Svelte-Google-Apps-Script">
    Svelte-Google-Apps-Script
  </a>
  <p>
    {`Version: ${__APP_VERSION__}`}
    <br/>
    <small class="text-gray-700">{` (${environment})`}</small>
  </p>
</Application>