import { JSDOM } from 'jsdom'

const jsdom = new JSDOM('')

global.window = jsdom.window
global.window.alert = console.log.bind(console)
global.document = jsdom.window.document

Object.keys(jsdom.window).forEach(property => {
  if (typeof global[property] === 'undefined') {
    global[property] = jsdom.window[property]
  }
})

global.navigator = {
  userAgent: 'node.js',
}