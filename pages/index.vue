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
  .container {
    padding-bottom: 100vh;
  }
  .title {
    margin: 0;
    visibility: hidden;
    line-height: 0;
  }

  .background {
    background-image: url("https://reubenson-portfolio.s3.amazonaws.com/imgs/studio.jpg");
    background-position: 75% 50%;
    background-size: cover;
    bottom: 0;
    left: 0;
    position: fixed;
    height: 100vh;
    right: 0;
    top: 0;
    width: 100vw;
    z-index: -1;
  }

  .main {
    background-color: #f0f0e6;
    border: solid black 2px;
    box-sizing: border-box;
    margin: 10px;
    max-width: 460px;
    padding: 20px;
    position: relative;
    width: calc(100vw - 20px);
  }

  @media screen and (min-width: 768px) {
    .main {
      margin: 20px;
      width: calc(100vw - 40px);
    }
  }
</style>
