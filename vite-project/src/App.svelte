<script lang="ts">
  import _ from 'lodash';
  import { createEventDispatcher } from 'svelte';
  import { fade } from 'svelte/transition';
  import svelteLogo from './assets/svelte.svg';
  import Counter from './lib/Counter.svelte';
  import NAV from './lib/Nav.svelte';
  import NAVITEM from './lib/Nav.svelte';
  import INTRO from './lib/Intro.svelte';
  import FROG from './lib/Frog.svelte';
  import { hasStarted, FROGS, handleUrlUpdate, showInfo } from './lib/store';

  let showIntro = true;
  
  hasStarted.subscribe(value => {
    if (value) {
      showIntro = false;
    }
  });

  window.addEventListener('hashchange', handleUrlUpdate);
</script>

<main>
  <NAV>
    <!-- On click, info screen will render on top -->
    <NAVITEM>INFO</NAVITEM>
  </NAV>

  <div class="info {$showInfo ? '' : 'hidden'}">
    <p transition:fade>
      TK TK Info to come
    </p>
  </div>
  
  <!-- this is the loading screen, which will fade away on start -->
  {#if showIntro}
    <INTRO/>
  {/if}

  <!-- 
    
  on start, the audio device will initialize, and a number of frogs
  will be instantiated. Each frog will register itself with the audio device.
  At an interval, the audio device will update the behavior of each frog.
  When a frog makes a call, the audio device microphone needs to be disabled,
  such that a frog does not listen to itself. 

  Each frog will also have its own debug state, which can be toggled on and off,
  in order to print some basic metrics, and plot FFT histograms

  -->
  <div class="frogs-container">
    {#each $FROGS as frog}
      <FROG {...frog}/>
    {/each}
  </div>

  <!-- todo: error panel, when app fails to start -->

  <!-- potentially use slider to determine number of frogs instantiated 
  https://svelte.dev/tutorial/local-transitions -->
  

  <!-- <div>
    <a href="https://vitejs.dev" target="_blank" rel="noreferrer"> 
      <img src="/vite.svg" class="logo" alt="Vite Logo" />
    </a>
    <a href="https://svelte.dev" target="_blank" rel="noreferrer"> 
      <img src={svelteLogo} class="logo svelte" alt="Svelte Logo" />
    </a>
  </div>
  <h1>Vite + Svelte</h1>

  <div class="card">
    <Counter />
  </div>

  <p>
    Check out <a href="https://github.com/sveltejs/kit#readme" target="_blank" rel="noreferrer">SvelteKit</a>, the official Svelte app framework powered by Vite!
  </p>

  <p class="read-the-docs">
    Click on the Vite and Svelte logos to learn more
  </p> -->
</main>

<!-- <style>
  .logo {
    height: 6em;
    padding: 1.5em;
    will-change: filter;
    transition: filter 300ms;
  }
  .logo:hover {
    filter: drop-shadow(0 0 2em #646cffaa);
  }
  .logo.svelte:hover {
    filter: drop-shadow(0 0 2em #ff3e00aa);
  }
  .read-the-docs {
    color: #888;
  }
</style> -->
