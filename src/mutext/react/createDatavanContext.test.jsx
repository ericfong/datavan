/* eslint-disable react/no-multi-comp, no-bitwise */
// import 'raf/polyfill'
import React from 'react'
import Enzyme, { mount } from 'enzyme'
import Adapter from 'enzyme-adapter-react-16'

import { createDatavanContext, createDb } from '..'

Enzyme.configure({ adapter: new Adapter() })

class Indirection extends React.Component {
  shouldComponentUpdate() {
    return false
  }
  render() {
    return this.props.children
  }
}

test('memoize', () => {
  const collections = { users: {} }
  const Van = createDatavanContext(collections)
  const globalDb = createDb(collections)
  const getter = _db => _db.getById('users').x

  const App = () => (
    <Van.Provider db={globalDb}>
      <Indirection>
        <Van observe="users">{db => <button>{db.memoize(getter)}</button>}</Van>
      </Indirection>
    </Van.Provider>
  )
  const wrapper = mount(<App />)
  const btn = wrapper.find('button')
  expect(btn.text()).toBe('')
  globalDb.set('users', 'x', 2)
  expect(btn.text()).toBe('2')
})

test('mutate and get back', () => {
  const Van = createDatavanContext({ users: {} })

  const App = () => (
    <Van.Provider>
      <Indirection>
        <Van observe="users">{db => <button onClick={() => db.set('users', 'x', 2)}>{db.getById('users').x}</button>}</Van>
      </Indirection>
    </Van.Provider>
  )

  const wrapper = mount(<App />)
  const btn = wrapper.find('button')
  expect(btn.text()).toBe('')
  btn.simulate('click')
  expect(btn.text()).toBe('2')
})
