const { defineConfig } = require('cypress')

module.exports = defineConfig({
    e2e: {
        video: true,
        screenshotOnRunFailure: true,
        videosFolder: 'cypress/videos',
        screenshotsFolder: 'cypress/screenshots',
        supportFile: false
    },
})

