<script lang="ts">
  import { fade } from 'svelte/transition';
  import { handleStart, showIntro } from './store';

  // const startApp = () => {
  //   hasStarted.update(() => true);
  // }
</script>

<div transition:fade class="{$showIntro ? '' : 'hidden'}">
  <h1 class="text-4xl">
    Frog Chorus
  </h1>
  <p class="mt-4 text-base">
    TK TK Description of app to come
  </p>
  <button 
    class="bg-grey-100 border-2 rounded-lg p-2 mt-4"
    on:click|once={handleStart}>
      Start
  </button>
    
</div>
