---
layout: concrete.njk
title: line falling
---
L I N E  F A L L I N G

 <script>
  const body = document.querySelector('body');
  const line = document.querySelector('.line');

  for (let index = 0; index < 180; index+=1) {
    const el = line.cloneNode(true);

    el.setAttribute('style', `transform: rotate(${index}deg)`);
    
    body.appendChild(el);
  }
</script>

<style>

</style>