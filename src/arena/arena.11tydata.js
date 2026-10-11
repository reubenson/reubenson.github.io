// Every page under src/arena/ is a slideshow of one Are.na channel. Its blocks
// come from data.json beside the page (written by `npm run arena <name>`), and
// are exposed to the layout as `arena`.

const fs = require('fs');
const path = require('path');

module.exports = {
  layout: 'arena.njk',
  eleventyComputed: {
    arena: (data) => {
      const file = path.join(path.dirname(data.page.inputPath), 'data.json');
      try {
        return JSON.parse(fs.readFileSync(file, 'utf8'));
      } catch (err) {
        console.warn(`[arena] cannot read ${file}: ${err.message}`);
        return { channel: {}, blocks: [] };
      }
    },
  },
};
