import _ from 'lodash'
import React from 'react'
import { createStore } from 'redux'
import { Provider } from 'react-redux'
import { mount } from 'enzyme'

import '../test/enzyme-setup'
import memorizeConnect from './memorizeConnect'

test('basic', async () => {
  const func = jest.fn((state, { firstName, lastName }) => `${firstName} ${lastName}`)

  const mapState = jest.fn((memorize, state, { lastName }) => {
    const name = memorize(func, { firstName: state.firstName, lastName })
    return { name }
  })

  const Comp = memorizeConnect(mapState)(props => {
    // console.log('>>>>>', props)
    return (
      <div id="name">
        {props.name} {props.displayName}
      </div>
    )
  })
  const store = createStore(
    state => {
      return { ...state, date: new Date() }
    },
    {
      firstName: 'Eric',
    }
  )
  const App = ({ lastName = 'Fong', displayName }) => (
    <Provider store={store}>
      <Comp lastName={lastName} displayName={displayName} />
    </Provider>
  )
  const wrap = mount(<App />)

  expect(func).toHaveBeenCalledTimes(1)
  expect(mapState).toHaveBeenCalledTimes(1)
  expect(wrap.find('#name').text()).toBe('Eric Fong ')

  // dispatch will trigger func run
  store.dispatch({ type: 'change' })
  expect(func).toHaveBeenCalledTimes(2)
  expect(mapState).toHaveBeenCalledTimes(2)

  // set props will also trigger
  wrap.setProps({ lastName: 'FONG' })
  expect(func).toHaveBeenCalledTimes(3)
  expect(mapState).toHaveBeenCalledTimes(3)

  // prop with same value
  wrap.setProps({ lastName: 'FONG', displayName: 'New' })
  expect(func).toHaveBeenCalledTimes(3)
  expect(mapState).toHaveBeenCalledTimes(4)
  expect(wrap.find('#name').text()).toBe('Eric FONG New')
})
