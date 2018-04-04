/* eslint-disable react/no-multi-comp, no-bitwise */
// import 'raf/polyfill'
import React from 'react'
import Enzyme, { mount } from 'enzyme'
import Adapter from 'enzyme-adapter-react-16'

import { createDb, createDatavanContext } from '..'

Enzyme.configure({ adapter: new Adapter() })

class Indirection extends React.Component {
  shouldComponentUpdate() {
    return false
  }
  render() {
    return this.props.children
  }
}

test('mutate and get back', () => {
  const globalDb = createDb({ users: {} })
  const Van = createDatavanContext(globalDb)

  const App = () => (
    <Van.Provider>
      <Indirection>
        <Van observe="users">
          {db => {
            return <button onClick={() => db.users.set('x', 2)}>{db.users.getById().x}</button>
          }}
        </Van>
      </Indirection>
    </Van.Provider>
  )

  const wrapper = mount(<App />)
  const btn = wrapper.find('button')
  expect(btn.text()).toBe('')
  btn.simulate('click')
  expect(btn.text()).toBe('2')
})
