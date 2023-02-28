<script lang="ts">
  // import { fade } from 'svelte/transition';
  import { hasStarted } from "./store";

  // let count: number = 0
  const startApp = () => {
    hasStarted.update(() => true);
    // console.log('app started');
    // count += 1
  }
</script>

<!-- <script>
  // let visible = true;
  import { onMount, setContext } from 'svelte';
  import { writable } from 'svelte/store';

  let open = false;
  export let segment;
  export let logo;
  export let visible = true;

  const current = writable(null);
  setContext('nav', current);

  $: $current = segment;
</script> -->


<header>
  <nav class="bg-gray-200">
    <!-- <a  
      href="."
      class="home h-8"
      title="Homepage"
      style="background-image: url({logo})"
    >Home</a> -->
    <ul
      class="primary"
      class:open
    >
      <li>
        <a href="#info">INFO</a>
      </li>
      <!-- <slot></slot> -->
    </ul>
      
   </nav>
</header>


<!-- 
<style>
header {
position: fixed;
display: flex;
align-items: center;
justify-content: space-between;
width: 100vw;
height: 6rem;
padding: 0 4.8rem;
margin: 0 auto;
background-color: yellow;
box-shadow: 0 -0.4rem 0.9rem 0.2rem rgba(0,0,0,.5);
z-index: 100;
user-select: none;
transform: translate(0,calc(-100% - 1rem));
transition: transform 0.2s;
}

header.visible {
transform: none;
}

nav {
position: fixed;
top: 0;
left: 0;
width: 75%;
height:6rem;
padding: 0  4.8rem 0  4.8rem;
display: flex;
align-items: center;
justify-content: space-between;
background-color: transparent;
transform: none;
transition: none;
box-shadow: none;
}

.primary {
list-style: none;
margin: 0;
line-height: 1;
}



ul :global(li).active {
display: block;
}

ul {
display:flex;
position: relative;
padding: 0 3rem 0 0;
background-size: 1em 1em;
}



ul.open {
padding: 0 0 1em 0;
background: white;
border-left: 1px solid #eee;
border-right: 1px solid #eee;
border-bottom: 1px solid #eee;
border-radius: 0 0 .4rem .4rem;
align-self: start;
}

ul.open :global(li) {
display: block;
text-align: right;
}



ul :global(li) :global(a) {
font-size: 1.6rem;
padding: 0 .8rem;
border: none;
color: inherit;
}

ul.open :global(li) :global(a) {
padding: 1.5rem 3.7rem 1.5rem 4rem;
display: block;
}

ul.open :global(li):first-child :global(a) {
padding-top: 2.3rem;
}

.primary :global(svg) {
width: 2rem;
height: 2rem;
}

.home {
position: relative;
top: -.1rem;
	height: 3rem;
width: 12rem;
-webkit-tap-highlight-color: transparent;
-webkit-touch-callout: none;
background: 0 50% no-repeat;
background-size: auto 100%;
text-indent: -9999px;
/* z-index: 11; */
}

ul :global(li).active :global(a) {
color: #ff3e00;
}

.modal-background {
position: fixed;
width: 100%;
height: 100%;
left: 0;
top: 0;
background-color: rgba(255, 255, 255, 0.9);
}

a {
color: inherit;
border-bottom: none;
transition: none;
}

ul :global(li):not(.active) :global(a):hover {
color: #40b3ff;
}

@media (min-width: 840px) {
ul {
padding: 0;
background: none;
}

ul.open {
padding: 0;
background: white;
border: none;
align-self: initial;
}

ul.open :global(li) {
display: inline;
text-align: left;
}

ul.open :global(li) :global(a) {
font-size: 1.6rem;
padding: 0 .8rem;
display: inline;
}

ul::after {
display: none;
}

ul :global(li) {
display: inline !important;
}

.hide-if-desktop {
display: none !important;
}
}

</style> -->
