<template>
  <div>
    <nuxt />
  </div>
</template>

<style lang="scss">
$font-family: Raleway, Helvetica, Arial, sans-serif;

html {
  font: 17px/22px $font-family;
  word-spacing: 1px;
  -ms-text-size-adjust: 100%;
  -webkit-text-size-adjust: 100%;
  -moz-osx-font-smoothing: grayscale;
  -webkit-font-smoothing: antialiased;
  box-sizing: border-box;
}

*,
*:before,
*:after {
  box-sizing: border-box;
  margin: 0;
}

em {
  font-weight: 700;
}

h1 {
  margin-bottom: 20px;
}

section {
  max-width: 500px;
  margin-left: 20px;

  a {
    color: black;
    font-weight: 700;
    text-decoration: none;

    &:hover {
      text-decoration: underline;
    }
  }

  p {
    margin-bottom: 15px;
  }

  ul {
    padding-left: 20px;
  }

  li {
    margin: 10px 0;
  }

  .subsection {
    margin-bottom: 20px;
  }
}

section h3 {
  border-bottom: solid black 2px;
  margin: auto auto 10px -20px;
  letter-spacing: 0.5px;

  a {
    color: black;
    font-weight: 700;
    text-decoration: none;
  }
}

section h4 {
  border-bottom: solid black 2px;
  font-size: 18px;
}

section .header-image {
  border: 3px solid black;
  margin: 10px auto;
  height: auto;
  width: 100%;
}

section .read-more {
  border-top: solid black 2px;
  color: black;
  display: block;
  font-weight: 700;
  margin-top: 10px;
  text-decoration: none;
  width: 100%;

  &:hover {
    text-decoration: underline;
  }
}

.soundcloud-embed iframe {
  border: none;
}

figure {
  margin-bottom: 10px;

  figcaption {
    font-size: 14px;
    margin: -15px 0 0 10px;
  }
}

</style>
