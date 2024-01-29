const { EleventyRenderPlugin } = require("@11ty/eleventy");
const pluginRss = require("@11ty/eleventy-plugin-rss");
const markdownIt = require('markdown-it');

module.exports = function(eleventyConfig) {
  eleventyConfig.addPlugin(EleventyRenderPlugin);
  eleventyConfig.addPassthroughCopy("splide.min.js");
  eleventyConfig.addPassthroughCopy("splide.min.css");
  eleventyConfig.addPassthroughCopy("project-slides.css");
  eleventyConfig.addPassthroughCopy("bundle.css");
  eleventyConfig.addPassthroughCopy({ "favicon.png": "/" });
  
  // chrome-extension versions
  eleventyConfig.addPassthroughCopy('extensions');

  eleventyConfig.addGlobalData("myStatic", "static");
  // https://www.stefanjudis.com/snippets/how-to-display-the-build-date-in-eleventy/
  eleventyConfig.addGlobalData('timestamp', () => {
    let now = new Date();
    return new Intl.DateTimeFormat(
      'en-US', { dateStyle: 'full' }
    ).format(now);
  });

  // better customization of markdown parsing
  // https://markdown-it.github.io/markdown-it/
  let options = {
    html: true,
    linkify: true,
    typographer: true
  };

  eleventyConfig.setLibrary('md', markdownIt(options));

  // add RSS
  eleventyConfig.addPlugin(pluginRss);

  return {
    dir: {
      input: "src",
      layouts: "_layouts",
      output: "docs"
    }
  }
};