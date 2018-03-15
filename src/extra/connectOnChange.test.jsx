import _ from 'lodash'
import React from 'react'
import { createStore } from 'redux'
import { Provider } from 'react-redux'
import { mount } from 'enzyme'

import '../test/enzyme-setup'
import { find, datavanEnhancer, connectOnChange, recall, get, mutate } from '..'

test('work with virtual collection and recall', async () => {
  const collections = {
    item_table: {
      initState: [{ list: 'l1', _id: 'a', name: 'a' }, { list: 'l1', _id: 'b', name: 'b' }, { list: 'l2', _id: 'c' }],
      groupByList: byId => {
        // console.log('>> ???>', _.mapValues(_.groupBy(byId, 'list'), (items, _id) => ({ _id, items })))
        return _.mapValues(_.groupBy(byId, 'list'), (items, _id) => ({ _id, items }))
      },
    },
    list_table: {
      getState() {
        return { byId: recall(this.store, 'item_table', 'groupByList'), fetchAts: {}, originals: {} }
      },
    },
  }
  const Comp = connectOnChange(['list'], (state, { list }) => {
    if (list && list._id) {
      list = get(state, 'list_table', list._id)
    }
    return { list }
  })(props => {
    return <div id="result">{_.map(_.get(props.list, 'items'), 'name').join()}</div>
  })
  const store = createStore(s => s, {}, datavanEnhancer({ collections }))
  const App = () => (
    <Provider store={store}>
      <Comp list={{ _id: 'l1' }} />
    </Provider>
  )
  const wrap = mount(<App />)

  expect(wrap.find('#result').text()).toBe('a,b')

  mutate(store, 'item_table', 'b', { $merge: { name: 'B' } })

  expect(wrap.find('#result').text()).toBe('a,B')
})

test('basic', async () => {
  const func = jest.fn((state, { name }) => ({
    gender: find(state, 'users', { name })[0].gender,
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

  // first time determine onChangeTables
  // second time really compare
  expect(func).toHaveBeenCalledTimes(2)
  expect(wrap.find('#result').text()).toBe('M-')

  // dispatch will NOT trigger func run
  store.dispatch({ type: 'change' })
  expect(func).toHaveBeenCalledTimes(2)

  // set props name will trigger
  wrap.setProps({ name: 'Eva' })
  expect(func).toHaveBeenCalledTimes(3)
  expect(wrap.find('#result').text()).toBe('F-')

  // set props other will NOT trigger, but still render
  wrap.setProps({ name: 'Eva', other: 'New' })
  expect(func).toHaveBeenCalledTimes(3)
  expect(wrap.find('#result').text()).toBe('F-New')
})
