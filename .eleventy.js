const { EleventyRenderPlugin } = require("@11ty/eleventy");
const pluginRss = require("@11ty/eleventy-plugin-rss");
const markdownIt = require('markdown-it');
const sass = require('sass');
const path = require('path');
const fs = require('fs');
const { flowTextIntoSvg, toHtml } = require('./scripts/lib/svg-text-flow');

module.exports = function (eleventyConfig) {
  eleventyConfig.addPlugin(EleventyRenderPlugin);

  // Add SCSS template handling
  eleventyConfig.addTemplateFormats("scss");
  eleventyConfig.addExtension("scss", {
    outputFileExtension: "css",
    compile: async function (inputContent) {
      return async (data) => {
        try {
          const result = sass.compileString(inputContent, {
            loadPaths: ['src/styles']
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
  // URL-safe build id for cache-busting linked assets (?v={{ buildId }}), so a
  // changed main.css/JS is actually refetched instead of served stale from the
  // browser cache. Evaluated once per build.
  eleventyConfig.addGlobalData('buildId', () => Date.now());
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
  let markdownItFootnote = require("markdown-it-footnote");

  eleventyConfig.setLibrary('md', markdownIt(options).use(markdownItAttrs).use(markdownItFootnote));

  // add RSS
  eleventyConfig.addPlugin(pluginRss);

  // add no-sleep
  eleventyConfig.addPassthroughCopy({
    "./node_modules/@uriopass/nosleep.js/dist/NoSleep.min.js": "/public/js/nosleep.js"
  });

  eleventyConfig.addFilter("css", function (path) {
    // Process and return the CSS
    return `/css/${path}.css`;
  });

  // Format a decimal-string amount (e.g. "45.00") as localized currency
  eleventyConfig.addFilter("money", function (amount, currency = "USD") {
    const value = Number(amount);
    if (Number.isNaN(value)) return amount;
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: value % 1 === 0 ? 0 : 2
    }).format(value);
  });

  // List the image files in a public directory as URL paths, natural-sorted.
  // Used by the image-sequence component (src/_includes/image-sequence.njk) so
  // it works with any filename convention. `urlPath` is a site-absolute path
  // like "/public/ceramics/travel-vase-series".
  eleventyConfig.addFilter("sequenceImages", function (urlPath) {
    const dir = path.join(__dirname, urlPath.replace(/^\//, ""));
    let files;
    try {
      files = fs.readdirSync(dir);
    } catch (err) {
      console.warn(`[sequenceImages] cannot read ${dir}: ${err.message}`);
      return [];
    }
    return files
      .filter((f) => /\.(jpe?g|png|gif|webp|avif)$/i.test(f))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }))
      .map((f) => `${urlPath}/${f}`);
  });

  // Pour a block of text into the negative space of an SVG, on a monospaced
  // character grid. The SVG may hold any number of closed forms, and they may
  // have holes; every filled region becomes whitespace in the text.
  //
  //   {% shapedText "demo-forms", cols=84, repeat=true %}
  //   Suppose instead that you are perched on a dock facing the sea...
  //   {% endshapedText %}
  //
  // The body must be plain text: it lands in a <pre>, so markdown syntax inside
  // it would show up as literal characters. Preview and tune with
  // `node scripts/svg-text-flow.js masks/<name>.svg --mask` before wiring it up.
  eleventyConfig.addWatchTarget("./masks");
  eleventyConfig.addPairedShortcode("shapedText", function (content, mask, options = {}) {
    // accept either "demo-forms" (looked up in masks/) or an explicit path
    const maskPath = mask.endsWith(".svg") ? mask : path.join("masks", `${mask}.svg`);
    const absolute = path.join(__dirname, maskPath);

    let svg;
    try {
      svg = fs.readFileSync(absolute, "utf8");
    } catch (err) {
      throw new Error(`[shapedText] cannot read mask ${maskPath}: ${err.message}`);
    }

    // Nunjucks hands keyword arguments over with this marker attached;
    // flowTextIntoSvg only reads keys it knows, so it's harmless either way.
    const result = flowTextIntoSvg({ svg, text: content, ...options });

    // Fit is the thing that goes wrong here, and it goes wrong silently — a
    // dropped tail just looks like a shorter poem. Say so at build time.
    for (const warning of result.warnings) {
      console.warn(`[shapedText] ${maskPath}: ${warning}`);
    }

    return toHtml(result, {
      text: content,
      maxFontSize: options.maxFontSize,
      // so the block can also be a grid item, e.g. class="project-grid-item-full"
      className: options.class ? `shaped-text ${options.class}` : "shaped-text",
    });
  });

  // Instead of passthrough copy, we'll add a custom collection
  eleventyConfig.addCollection("styles", function (collectionApi) {
    return collectionApi.getFilteredByGlob("src/_styles/**/*.scss");
  });

  // Projects collection sorted reverse-chronologically by year
  eleventyConfig.addCollection("projects", function (collectionApi) {
    const projects = collectionApi.getFilteredByGlob("src/works/*.md");

    // Helper function to extract numeric year for sorting
    const getYearForSorting = (year) => {
      if (typeof year === 'number') return year;
      if (typeof year === 'string') {
        // Extract first year from ranges like "2019 —"
        const match = year.match(/^(\d{4})/);
        return match ? parseInt(match[1], 10) : 0;
      }
      return 0;
    };

    return projects.sort((a, b) => {
      const yearA = getYearForSorting(a.data.year);
      const yearB = getYearForSorting(b.data.year);
      return yearB - yearA; // Reverse chronological (newest first)
    });
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
