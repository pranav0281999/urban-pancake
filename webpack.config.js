const webpack = require("webpack");
const path = require("path");

module.exports = {
    entry: {app: "./public/app.js", controls: "./public/controls.js"},
    output: {
        path: path.resolve(__dirname, "public", "build"),
        publicPath: "/public/build/",
        filename: "[name].bundle.js"
    },
    mode: "development",
    module: {
        rules: [
            {
                test: /\.js?$/,
                exclude: /node_modules/,
                loader: 'babel-loader',
            }
        ]
    },
    devServer: {
        liveReload: false
    }
}
