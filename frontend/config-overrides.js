const path = require('path');

module.exports = {
  webpack: function override(config) {
    // Stable JS filenames (no content hashes)
    config.output.filename = 'static/js/[name].js';
    config.output.chunkFilename = 'static/js/[name].chunk.js';

    // Stable CSS filenames
    const miniCssPlugin = config.plugins.find(
      (p) => p.constructor.name === 'MiniCssExtractPlugin'
    );
    if (miniCssPlugin) {
      miniCssPlugin.options.filename = 'static/css/[name].css';
      miniCssPlugin.options.chunkFilename = 'static/css/[name].chunk.css';
    }

    // Stable media/asset filenames
    const rules = config.module.rules.find((r) => r.oneOf)?.oneOf || [];
    for (const rule of rules) {
      if (rule.type === 'asset/resource') {
        rule.generator = {
          filename: 'static/media/[name][ext]',
        };
      }
    }

    return config;
  },
};
