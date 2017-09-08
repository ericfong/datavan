const React = require('react') // eslint-disable-line
const { renderToString: render } = require('react-dom/server') // eslint-disable-line

const { createStore } = require('redux') // eslint-disable-line
const { connect, Provider } = require('react-redux') // eslint-disable-line

const { defineCollection, datavanEnhancer, find, findOne, update, serverPreload } = require('../lib')

// defined collection called 'users'
const Users = defineCollection('users', {
  onFetch(collection, query, option) {
    return Promise.resolve([{ _id: 'id', name: 'john' }])
  },
})

const PureComponent = ({ user }) =>
  (<div>
    {(user && user.name) || 'No Name'}
  </div>)

// connect
const MyApp = connect(
  (state, { name }) => {
    return {
      user: findOne(Users(state), { name }),
      // first call result will be undefined
      // after HTTP response and cached, connect will be re-run
      // so, second result will get user object
    }
  },
  (dispatch, { name }) => {
    return {
      // query by [mingo](https://www.npmjs.com/package/mingo)
      // update by [immutability-helper](https://www.npmjs.com/package/immutability-helper)
      modifyUser: () => update(Users(dispatch), { name }, { $merge: { name: 'smith' } }),
    }
  }
)(PureComponent)

// createStore
const store = createStore(null, null, datavanEnhancer())

// Assign to your React context
console.log(
  render(
    <Provider store={store}>
      <MyApp name="john" />
    </Provider>
  )
)
// log: <div data-reactroot="" data-reactid="" data-react-checksum="">No Name</div>

// serverPreload
const PreloadApp = connect((state, { name }) => {
  return {
    user: findOne(Users(state), { name }, { serverPreload: true }),
  }
})(PureComponent)
serverPreload(store, () =>
  render(
    <Provider store={store}>
      <PreloadApp name="john" />
    </Provider>
  )
).then(output => console.log(output))
// log: <div data-reactroot="" data-reactid="" data-react-checksum="">loaded name</div>
