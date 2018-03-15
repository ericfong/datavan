/* globals document */
/* eslint-disable import/no-extraneous-dependencies, no-console */
import { JSDOM } from 'jsdom'
import { configure } from 'enzyme'
import Adapter from 'enzyme-adapter-react-16'

configure({ adapter: new Adapter() })

const jsdom = new JSDOM('')

global.window = jsdom.window
global.document = jsdom.window.document
global.window.alert = console.log.bind(console)

Object.keys(jsdom.window).forEach(property => {
  if (typeof global[property] === 'undefined') {
    global[property] = jsdom.window[property]
  }
})

global.navigator = {
  userAgent: 'node.js',
}
