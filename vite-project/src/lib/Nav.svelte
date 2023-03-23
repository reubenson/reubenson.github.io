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
        {#if !$showCloseIcon}
        <a href="#info">INFO</a>
        {/if}
      </li>
      
    </ul>
    {#if $showCloseIcon}
      <button 
        class="absolute left-6 top-4"
        on:click={handleClose}>&#10008</button>
    {/if}
   </nav>
</header>
