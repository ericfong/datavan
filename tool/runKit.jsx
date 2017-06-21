const { connect, defineStore, defineCollection, Provider } = require('../src')
const React = require('react')
const { renderToString: render } = require('react-dom/server')

function PureComponent({ user }) {
  return <div>{(user && user.name) || 'No Name'}</div>
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

store.getPromise().then(() => {
  console.log(
    render(
      <Provider store={store}>
        <MyApp />
      </Provider>
    )
  )
})
