const { EleventyRenderPlugin } = require("@11ty/eleventy");

module.exports = function(eleventyConfig) {
  eleventyConfig.addPlugin(EleventyRenderPlugin);
  eleventyConfig.addPassthroughCopy("bundle.css");
  eleventyConfig.addPassthroughCopy({ "favicon.png": "/" });

  return {
    dir: {
      input: "src",
      layouts: "_layouts",
      output: "docs"
    }
  }
};