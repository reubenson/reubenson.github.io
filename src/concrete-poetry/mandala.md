---
layout: concrete.njk
title: mandala
---
S S S S S S S S S S S S S S S S S S S S S S S S

<style>
  .container {
    position: absolute;
    left: 20px;
    right: 0;
    top: 300px;
    bottom: 0;
    margin: auto;
  }

  .line { 
    letter-spacing: -3px;
    position: absolute;
    text-align: justify;
    display: block;
    width: calc(100% - 40px);
    /* height: 10px; */
  }
</style>

 <script>
  const  container = document.querySelector('.container');
  const line = document.querySelector('.line');

  for (let index = 0; index < 360; index += 2) {
    const el = line.cloneNode(true);

    el.setAttribute('style', `transform: rotate(${index}deg)`);
    
     container.appendChild(el);
  }
</script>