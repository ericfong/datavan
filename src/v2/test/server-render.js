test.skip('server rendering', async () => {
  const Users = collect('users')
  const store = createEnhancer()(createStore)()

  const UserComp = connect((dv, props) => {
    serverPreload(dv, true)
    return {
      user: dv.users.findOne({ _id: props.userId }),
    }
  })(props => {
    const user = props.user || {}
    return (
      <span>
        {user.name}
      </span>
    )
  })

  const FriendComp = connect(dv => {
    serverPreload(dv, true)
    return {
      user: dv.users.findOne({ _id: 'u2' }),
    }
  })(props => {
    const user = props.user || {}
    return (
      <span>
        {user.name} is <UserComp userId={user.friendId} /> friend
      </span>
    )
  })

  // server side render
  const FriendServer = withCollections({
    users: {
      onFetch(query) {
        if (query && query._id) {
          const ids = getQueryIds(query)
          return Promise.resolve(_.map(ids, _id => ({ _id, name: _.toUpper(_id), friendId: 'u1' })))
        }
        return Promise.resolve([])
      },
    },
  })(FriendComp)
  const wrapper = await serverRender(store, () =>
    render(
      <Provider store={store}>
        <FriendServer />
      </Provider>
    )
  )
  expect(wrapper.html()).toBe('<span>U2 is <span>U1</span> friend</span>')

  // transfer data to client
  const json = JSON.stringify(store.getState())
  const isoData = JSON.parse(json)

  // client side
  const browserDb = datavanEnhancer(createReduxStore)(null, isoData)
  // it is sync
  const FriendBrowser = withCollections({ users: Collection })(FriendComp)
  const browserWrapper = render(
    <Provider store={browserDb}>
      <FriendBrowser />
    </Provider>
  )
  expect(browserWrapper.html()).toBe('<span>U2 is <span>U1</span> friend</span>')
})
