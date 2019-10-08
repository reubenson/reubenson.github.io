<template>
  <div>
    <nuxt />
  </div>
</template>

<style lang="scss">
$font-family: Raleway, Helvetica, Arial, sans-serif;

html {
  font: 18px/22px $font-family;
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

section {
  min-width: 450px;
  margin: 0px 20px 50px 20px;

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
    margin-bottom: 20px;
  }
}

section h3 {
  border-bottom: solid black 2px;
  font-weight: 700;
  margin: auto auto 10px;
  letter-spacing: 0.5px;

  a {
    color: black;
    text-decoration: none;
  }
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
</style>
