<script>
  import { getContext } from 'svelte';
  import { createEventDispatcher } from 'svelte';
  const dispatch = createEventDispatcher();

  export let segment = null;
  const current = getContext('nav');

  function setSegment(){
    current.set(segment);
  }

  export let content = "";

</script>
    
<li on:click={setSegment} class:active="{$current === segment}"><a href={segment}><slot></slot></a></li>
<p>{content}</p>
