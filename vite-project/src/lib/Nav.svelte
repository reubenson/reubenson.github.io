<script lang="ts">
  import { showCloseIcon, handleClose } from "./store";
</script>

<header class="bg-gray-100 text-xl text-left h-14">
  <nav class="text-gray-600 body-font">
    <ul
      class="p-4"
      class:open
    >
      <li>
        <a href="#info">INFO</a>
      </li>
      
    </ul>
    {#if $showCloseIcon}
      <button 
        class="absolute right-4 top-4"
        on:click={handleClose}>x</button>
    {/if}
   </nav>
</header>
