<script lang="ts">
  import { fade } from 'svelte/transition';
  import { hasStarted } from "./store";
  import { handleStart } from './store';

  // const startApp = () => {
  //   hasStarted.update(() => true);
  // }
</script>

<div transition:fade>
 TK TK Description of app to come
  <button on:click|once={handleStart}>
    Start
  </button>
    
</div>
