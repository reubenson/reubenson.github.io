<script lang="ts">
  import { onMount } from "svelte";
  import _ from 'lodash';
  import { draw } from "svelte/transition";
  import { drawFFT, drawHistogram } from "./utils";
  import { hasStarted, audio, audioFile } from './store';
  
  export let id;
  export let audioImprint;
  export let amplitude;
  export let convolutionAmplitude;
  export let shyness;
  export let eagerness;
  export let directInputFFT;
  export let convolutionFFT;
  export let diffFFT;
  export let ambientFFT;
  let imprintEl, fftEl, convolutionEl, differenceEl, ambientEl;


  function plotInputFFT(data) {
    if (!fftEl) return;

    drawFFT(data, fftEl);
  }
  
  function plotConvolution(data) {
    if (!convolutionEl) return;
    
    drawFFT(data, convolutionEl);
  }
  
  function plotDifference(data) {
    if (!differenceEl) return;

    drawFFT(data, differenceEl);
  }

  function plotBaseline(data) {
    if (!ambientEl || !data) return;

    drawFFT(data, ambientEl);
  }
  
  $: {
    plotInputFFT(directInputFFT);
    plotConvolution(convolutionFFT);
    plotDifference(diffFFT);
    plotBaseline(ambientFFT);
  }

  // this component is expected to mount only after initialization
  // which is handled in store.js
  onMount(() => {
    drawFFT(audioImprint, imprintEl);
  });
</script>

<div class="frog-item max-w-lg m-auto border-black border-4 p-4 rounded-md">
  <div class="frog-item-state">
    <!-- to flash colors when singing and detecting other frogs -->
  </div>
  <div class="frog-debug-panel mt-2">
    <header class="text-2xl">Frog {id}</header>
    <div class="mt-2">
      <header class="text-xl mb-2">Basic Metrics</header>
      <ul class="flex">
        <li class="basis-2/4">Shyness: {_.round(shyness, 3)}</li>
        <li class="basis-2/4">Eagerness: {_.round(eagerness, 3)}</li>
        <li class="basis-2/4">Amplitude: {_.round(amplitude, 2)}</li>
        <li class="basis-2/4">Convolution Amplitude: {Math.round(convolutionAmplitude)}</li>
      </ul>
    </div>
    <header class="text-xl mb-2">Figures</header>
    <div class="flex flex-wrap flex-row">
      <div class="basis-2/4 p-2 shrink">
        <header>Audio Imprint</header>
        <canvas bind:this={imprintEl} class="w-full"></canvas>
      </div>
      <div class="basis-2/4 p-2 shrink">
        <header>FFT</header>
        <canvas bind:this={fftEl} class="w-full"></canvas>
        <ul>
        </ul>
      </div>
      <div class="basis-2/4 p-2">
        <header>Ambient Baseline</header>
        <canvas bind:this={ambientEl} class="w-full"></canvas>
      </div>
      <div class="basis-2/4 p-2">
        <header>Convolution</header>
        <canvas bind:this={convolutionEl} class="w-full"></canvas>
      </div>
      <div class="basis-2/4 p-2">
        <header>FFT Differential</header>
        <canvas bind:this={differenceEl} class="w-full"></canvas>
      </div>
    </div>
  </div>
</div>
