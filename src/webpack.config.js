const path = require('path');

module.exports = {
    entry: {
        app: path.resolve(__dirname, 'client/Client.js'),
        vendor: ['angular',
            'angular-animate',
            'angular-aria',
            'angular-messages',
            'angular-material',
            'fastdom',
            'd3',
            'rickshaw',
            'ngmap']
    },
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: '[name].bundle.js'
    }
};

