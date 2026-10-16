<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import TestComponent from '@/client/components/TestComponent.svelte';

  const { Story } = defineMeta({
    title: 'TestComponent',
    component: TestComponent,
    globals: {
      backgrounds: {
        value: 'dark'
      }
    }
  });
</script>

<Story name="Default" />
