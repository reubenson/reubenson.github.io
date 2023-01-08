
const path = require( 'path' );

module.exports = {

  // bundling mode
  mode: 'production',

  // entry files
   entry: '/frog/scripts/main.ts',

  // output bundles (location)
  output: {
    path: path.resolve( __dirname, 'frogus/scripts' ),
    filename: 'main.js',
  },

  // file resolutions
  resolve: {
    extensions: [ '.ts', '.js' ],
  },

  // loaders
  module: {
    rules: [
      {
        test: /\.tsx?/,
        use: 'ts-loader',
        exclude: /node_modules/,
      }
    ]
  },
};
