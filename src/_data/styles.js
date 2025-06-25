const fs = require('fs');
const path = require('path');

module.exports = function() {
  const scssPath = path.join(__dirname, '../styles/main.scss');
  return fs.readFileSync(scssPath, 'utf8');
}; 