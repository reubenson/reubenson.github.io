<script lang="ts">
  import _ from 'lodash';
  import { fade } from 'svelte/transition';
  import Tailwind from './lib/Tailwind.svelte';
  import Section from './lib/Section.svelte';
  import NAV from './lib/Nav.svelte';
  import FROG from './lib/Frog.svelte';
  import {
    handleStart,
    hasStarted,
    FROGS,
    handleUrlUpdate
  } from './lib/store';
  
  window.addEventListener('hashchange', handleUrlUpdate);
</script>

<Tailwind />

<main class="bg-emerald-100 h-screen text-center">
  <NAV />

  <Section hashString=''>
    {#if !$hasStarted}
      <h1 class="text-4xl mt-4">
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
    {:else}
      <!--

      on start, the audio device will initialize, and a number of frogs
      will be instantiated. Each frog will register itself with the audio device.
      At an interval, the audio device will update the behavior of each frog.
      When a frog makes a call, the audio device microphone needs to be disabled,
      such that a frog does not listen to itself.

      Each frog will also have its own debug state, which can be toggled on and off,
      in order to print some basic metrics, and plot FFT histograms

      -->
      <div class="flex flex-row p-4">
        {#each $FROGS as frog}<FROG {...frog}/>{/each}
      </div>

      <!-- TO DO: don't wait for audioImprint to calculate to start frog-->
    {/if}
  </Section>

  <Section hashString='#info'>
  <div class="text-base">
    <p>
      TK TK Info to come
    </p>
  </div>
  </Section>
  
  <!-- this is the loading screen, which will fade away on start -->
  <!-- {#if showIntro}
    <INTRO/>
  {/if} -->

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
