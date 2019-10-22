<template>
  <div>
    <nuxt />
  </div>
</template>

<style lang="scss">
$font-family: Raleway, Helvetica, Arial, sans-serif;

html {
  font: 14px/18px $font-family;
  word-spacing: 1px;
  -ms-text-size-adjust: 100%;
  -webkit-text-size-adjust: 100%;
  -moz-osx-font-smoothing: grayscale;
  -webkit-font-smoothing: antialiased;
  box-sizing: border-box;
  font-weight: 300;
  letter-spacing: .1px;
}

*,
*:before,
*:after {
  box-sizing: border-box;
  margin: 0;
}

em {
  font-weight: 400;
}

h1 {
  margin-bottom: 20px;
}

section {
  margin-bottom: 40px;
  max-width: 520px;

  a {
    color: black;
    font-weight: 500;
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
    margin: 25px auto;
  }
}

section h3 {
  border-bottom: solid black 2px;
  font-weight: 500;
  margin: auto auto 10px;
  letter-spacing: 0.5px;

  a {
    color: black;
    text-decoration: none;
  }
}

section h4 {
  border-bottom: solid black 2px;
  font-size: 18px;
  font-weight: 500;
  margin-bottom: 10px;
}

section .header-image {
  border: 2px solid black;
  margin: 10px auto;
  height: auto;
  width: 100%;
}

section .read-more {
  border-top: solid black 2px;
  color: black;
  display: block;
  font-weight: 500;
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
    margin: -8px 0 0 10px;
  }
}

@media screen and (min-width:768px) {
  html {
    font-size: 17px;
    line-height: 22px;
  }
}

</style>
