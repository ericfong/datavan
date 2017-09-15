import _ from 'lodash'
import React from 'react'
import { createStore } from 'redux'
import { Provider } from 'react-redux'
import { mount } from 'enzyme'

import '../test/setup-jsdom'
import memorizeConnect from './memorizeConnect'

test('basic', async () => {
  const func = jest.fn((state, { firstName, lastName }) => `${firstName} ${lastName}`)

  const mapState = jest.fn((memorize, state, { lastName }) => {
    const name = memorize(func, { firstName: state.firstName, lastName })
    // console.log('>>>', { name })
    return { name }
  })

  const Comp = memorizeConnect(mapState)(props => {
    // console.log('>>>>>', props)
    return <div id="name">{props.name}</div>
  })

  const store = createStore(
    state => {
      return { ...state, date: new Date() }
    },
    {
      firstName: 'Eric',
    }
  )
  const wrap = mount(
    <Provider store={store}>
      <Comp lastName="Fong" />
    </Provider>
  )

  expect(mapState).toHaveBeenCalledTimes(1)
  expect(func).toHaveBeenCalledTimes(1)
  expect(wrap.find('#name').text()).toBe('Eric Fong')

  store.dispatch({ type: 'change' })
  expect(mapState).toHaveBeenCalledTimes(2)
  expect(func).toHaveBeenCalledTimes(1)
})
