const cypressTypeScriptPreprocessor = require('./cy-ts-preprocessor')
const {
  cypressBrowserPermissionsPlugin
} = require('cypress-browser-permissions')

module.exports = (on, config) => {
  on('file:preprocessor', cypressTypeScriptPreprocessor)

  return cypressBrowserPermissionsPlugin(on, config)
}
