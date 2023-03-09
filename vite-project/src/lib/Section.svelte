<script lang="ts">
  import { fade } from 'svelte/transition';
  import { hash } from './store';

  export let hashString;
  export let showSection = false;

  hash.subscribe(val => {
    showSection = val === hashString;
  });
</script>

<section transition:fade class="{showSection ? '' : 'hidden'}">
  <slot></slot>
</section>
