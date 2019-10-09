<template>
  <div class="container">
    <div class="main">
      <h1 class="title">Reuben Son</h1>
      <about />
      <music />
      <ceramics />
    </div>
    <div class="background"></div>
  </div>
</template>

<script>

import About from '~/components/About.vue'
import Music from '~/components/Music.vue'
import Ceramics from '~/components/Ceramics.vue'

export default {
  layout: 'primary',
  components: {
    About,
    Music,
    Ceramics
  }
}
</script>

<style>
  .title {
    margin: 0;
    visibility: hidden;
  }

  .container {
    /* background-image: url("https://reubenson-portfolio.s3.amazonaws.com/imgs/studio.jpg");
    background-position: 75% 50%;
    background-size: cover;
    bottom: 0;
    left: 0;
    position: fixed;
    height: 100vh;
    overflow-y: scroll;
    right: 0;
    top: 0;
    width: 100vw;
    z-index: -1; */
  }

  .background {
    background-image: url("https://reubenson-portfolio.s3.amazonaws.com/imgs/studio.jpg");
    background-position: 75% 50%;
    background-size: cover;
    bottom: 0;
    left: 0;
    position: fixed;
    height: 100vh;
    /* overflow-y: scroll; */
    right: 0;
    top: 0;
    width: 100vw;
    z-index: -1;
  }

  .main {
    background-color: #f0f0e6;
    border: solid black 2px;
    box-sizing: border-box;
    margin-left: 20px;
    margin-top: 20px;
    margin-bottom: 100vh;
    max-width: 560px;
    padding: 20px;
    position: relative;
    width: calc(100vw - 40px);
  }

/* .container {
  margin: 0 auto;
  min-height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  text-align: center;
}

.title {
  font-family: 'Quicksand', 'Source Sans Pro', -apple-system, BlinkMacSystemFont,
    'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  display: block;
  font-weight: 300;
  font-size: 100px;
  color: #35495e;
  letter-spacing: 1px;
}

.subtitle {
  font-weight: 300;
  font-size: 42px;
  color: #526488;
  word-spacing: 5px;
  padding-bottom: 15px;
}

.links {
  padding-top: 15px;
} */
</style>
