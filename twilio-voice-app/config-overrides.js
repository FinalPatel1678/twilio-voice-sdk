const { override, } = require("customize-cra");

module.exports = override(
    (config) => {
        // Modify output filename
        config.output.filename = "static/js/TwilioAutoDialer.js";

        // Modify CSS filename in MiniCssExtractPlugin
        config.plugins.forEach(plugin => {
            if (plugin.constructor.name === "MiniCssExtractPlugin") {
                plugin.options.filename = "static/css/TwilioAutoDialer.css";
            }
        });

        return config;
    }
);
