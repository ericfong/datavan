const { connect, defineStore, defineCollection, Provider, serverRender } = require('../lib')
const React = require('react') // eslint-disable-line
const { renderToString: render } = require('react-dom/server') // eslint-disable-line

function PureComponent({ user }) {
  return (
    <div>
      {(user && user.name) || 'No Name'}
    </div>
  )
}

const MyApp = connect((dv, { username }) =>
  // redux mapState, but first argument is datavan store instead of dispatch
  // assume defined a collection called 'users', which can access by dv.users
  ({
    user: dv.users.findOne({ username }),
    // first call result will be undefined
    // after HTTP response and cached, connect will be re-run
    // so, second result will get user object
  })
)(PureComponent)

// Setup

const createStore = defineStore({
  users: defineCollection({
    onFetch(query, option) {
      return Promise.resolve([{ _id: 'id', name: 'loaded name' }])
    },
  }),
})

// regular redux's createStore
const store = createStore()

// Assign to your React context
console.log(
  render(
    <Provider store={store}>
      <MyApp />
    </Provider>
  )
)
// log: <div data-reactroot="" data-reactid="" data-react-checksum="">No Name</div>

serverRender(store, () =>
  render(
    <Provider store={store}>
      <MyApp />
    </Provider>
  )
).then(output => console.log(output))
// log: <div data-reactroot="" data-reactid="" data-react-checksum="">loaded name</div>
