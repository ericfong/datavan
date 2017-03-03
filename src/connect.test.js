import _ from 'lodash'
import should from 'should'
import React from 'react'
import {mount, render} from 'enzyme'

import './dev-tools/setup.test'
import {defineCollections} from '.'
import fetcher from './fetcher'
import KeyValueStore from './KeyValueStore'
import Collection from './Collection'
import connect, {Provider} from './connect'


describe('connect', function() {
  it('server rendering', async () => {
    const createStore = defineCollections({
      users: fetcher({
        get(id) {
          return Promise.resolve({_id: id, name: _.toUpper(id), friendId: 'u1'})
        },
      })(Collection),
    })
    const store = createStore()

    const UserComp = connect((db, props) => ({
      user: db.users.get(props.userId),
    }))(props => {
      const user = props.user || {}
      return <span>{user.name}</span>
    })
    const FriendComp = connect(db => ({
      user: db.users.get('u2'),
    }))(props => {
      const user = props.user || {}
      return <span>{user.name} is <UserComp userId={user.friendId} /> friend</span>
    })

    // server side render
    const wrapper = await store.serverRender(() => {
      return render(<Provider store={store}><FriendComp /></Provider>)
    })
    should(wrapper.html()).be.exactly('<span>U2 is <span>U1</span> friend</span>')

    // transfer data to client
    const json = JSON.stringify(store.getState())
    const isoData = JSON.parse(json)

    // client side
    const createBrowserStore = defineCollections({
      users: Collection,
    })
    const browserDb = createBrowserStore(null, isoData)
    // it is sync
    const browserWrapper = render(<Provider store={browserDb}><FriendComp /></Provider>)
    should(browserWrapper.html()).be.exactly('<span>U2 is <span>U1</span> friend</span>')
  })


  it('basic', async () => {
    const createStore = defineCollections({
      users: KeyValueStore,
    })
    const store = createStore()

    let lastClickValue
    const UserComp = connect(store => {
      return {
        user1: store.users.get('u1'),
      }
    }, store => {
      return {
        onClick() {
          lastClickValue = store.users.get('u1')
        },
      }
    })(props => {
      props.onClick()
      return <span>{props.user1}</span>
    })

    store.users.set('u1', 'user 1 name!!')

    const wrapper = mount(
      <Provider store={store}>
        <UserComp />
      </Provider>
    )

    wrapper.html().should.be.exactly('<span>user 1 name!!</span>')
    should( lastClickValue ).equal('user 1 name!!')
  })


  it('same state', async () => {
    const createStore = defineCollections({
      users: KeyValueStore,
    })
    const store = createStore()
    store.users.set('u1', 'user 1 name!!')

    let runTime = 0
    const UserComp = connect(store => {
      runTime ++
      return {
        user1: store.users.get('u1'),
      }
    })(props => {
      return <span>{props.user1}</span>
    })
    const wrapper = mount(
      <Provider store={store}>
        <UserComp />
      </Provider>
    )
    wrapper.html().should.be.exactly('<span>user 1 name!!</span>')
    should( runTime ).equal(1)

    // same value
    store.users.set('u1', 'user 1 name!!')
    should( runTime ).equal(1)

    // diff value
    store.users.set('u1', 'Changed')
    should( runTime ).equal(2)
  })
})
