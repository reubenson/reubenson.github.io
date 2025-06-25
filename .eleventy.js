const { EleventyRenderPlugin } = require("@11ty/eleventy");
const pluginRss = require("@11ty/eleventy-plugin-rss");
const markdownIt = require('markdown-it');
const sass = require('sass');
const path = require('path');
const fs = require('fs');

module.exports = function(eleventyConfig) {
  eleventyConfig.addPlugin(EleventyRenderPlugin);
  
  // Add SCSS template handling
  eleventyConfig.addTemplateFormats("scss");
  eleventyConfig.addExtension("scss", {
    outputFileExtension: "css",
    compile: async function(inputContent) {
      return async (data) => {
        try {
          const result = sass.compileString(inputContent, {
            loadPaths: ['src/_styles']
          });
          return result.css;
        } catch (error) {
          console.error('SCSS Processing Error:', error);
          return '';
        }
      };
    }
  });

  eleventyConfig.addPassthroughCopy("splide.min.js");
  eleventyConfig.addPassthroughCopy("splide.min.css");
  eleventyConfig.addPassthroughCopy("project-slides.css");
  eleventyConfig.addPassthroughCopy("aura.css");
  eleventyConfig.addPassthroughCopy("wordhack-2025.css");
  eleventyConfig.addPassthroughCopy("bundle.css");
  eleventyConfig.addPassthroughCopy("public");
  eleventyConfig.addPassthroughCopy({ "favicon.png": "/" });
  
  // chrome-extension versions
  eleventyConfig.addPassthroughCopy('extensions');

  eleventyConfig.addGlobalData("myStatic", "static");
  // https://www.stefanjudis.com/snippets/how-to-display-the-build-date-in-eleventy/
  eleventyConfig.addGlobalData('timestamp', () => {
    let now = new Date();
    return new Intl.DateTimeFormat(
      'en-US', { dateStyle: 'full' }
    ).format(now).toLocaleLowerCase();
  });

  // better customization of markdown parsing
  // https://markdown-it.github.io/markdown-it/
  let options = {
    html: true,
    linkify: true,
    typographer: true
  };

  let markdownItAttrs = require("markdown-it-attrs");
  
  eleventyConfig.setLibrary('md', markdownIt(options).use(markdownItAttrs));

  // add RSS
  eleventyConfig.addPlugin(pluginRss);

  // add no-sleep
  eleventyConfig.addPassthroughCopy({
      "./node_modules/@uriopass/nosleep.js/dist/NoSleep.min.js": "/public/js/nosleep.js"
  });

  eleventyConfig.addFilter("css", function(path) {
    // Process and return the CSS
    return `/css/${path}.css`;
  });

  // Instead of passthrough copy, we'll add a custom collection
  eleventyConfig.addCollection("styles", function(collectionApi) {
    return collectionApi.getFilteredByGlob("src/_styles/**/*.scss");
  });

  // Add a custom filter to process SCSS
  // eleventyConfig.addFilter("processScss", function(scssContent) {
  //   try {
  //     const result = sass.compileString(scssContent, {
  //       loadPaths: ['src/_styles']
  //     });
  //     return result.css;
  //   } catch (error) {
  //     console.error('SCSS Processing Error:', error);
  //     return '';
  //   }
  // });

  return {
    dir: {
      input: "src",
      output: "docs",
      includes: "_includes",
      layouts: "_layouts"
    },
    markdownTemplateEngine: "njk",
  }
};
