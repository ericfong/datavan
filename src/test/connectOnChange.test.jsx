// import _ from 'lodash'
import React from 'react'
import { createStore } from 'redux'
import { Provider } from 'react-redux'
import { mount } from 'enzyme'

import './util/enzyme-setup'
import { findOne, datavanEnhancer, connectOnChange } from '..'

test('basic', async () => {
  const func = jest.fn((state, { name }) => ({
    gender: findOne(state, 'users', { name }).gender,
  }))

  const Comp = connectOnChange(['name'], func)(props => {
    return (
      <div id="result">
        {props.gender}-{props.other}
      </div>
    )
  })
  const store = createStore(
    s => s,
    {},
    datavanEnhancer({
      collections: {
        users: { initState: [{ name: 'Eric', gender: 'M' }, { name: 'Eva', gender: 'F' }] },
      },
    })
  )
  const App = ({ name = 'Eric', other }) => (
    <Provider store={store}>
      <Comp name={name} other={other} />
    </Provider>
  )
  const wrap = mount(<App />)

  expect(func).toHaveBeenCalledTimes(1)
  expect(wrap.find('#result').text()).toBe('M-')

  // dispatch will NOT trigger func run
  store.dispatch({ type: 'change' })
  expect(func).toHaveBeenCalledTimes(1)

  // set props name will trigger
  wrap.setProps({ name: 'Eva' })
  expect(func).toHaveBeenCalledTimes(2)
  expect(wrap.find('#result').text()).toBe('F-')

  // set props other will NOT trigger, but still render
  wrap.setProps({ name: 'Eva', other: 'New' })
  expect(func).toHaveBeenCalledTimes(2)
  expect(wrap.find('#result').text()).toBe('F-New')
})
