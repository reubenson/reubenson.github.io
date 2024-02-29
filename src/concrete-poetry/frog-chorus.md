---
layout: concrete.njk
title: mandala
---

<p>ḟԻ✺❡ ḉℏ✺Ի<span class="header-frog">&#78223;</span>ṳṧ</p>
<!-- V E R N A L  E Q U I N O X  2 0 2 4 -->

<style>
  .header-frog {
    font-size: 4px;
  }
  .container {
    position: absolute;
    left: 20px;
    right: 0;
    top: 300px;
    bottom: 0;
    margin: auto;
  }

  .line { 
    font-weight: 400;
    letter-spacing: 0px;
    line-height: 0px;
    font-size: 25px;
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