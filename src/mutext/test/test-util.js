import createStore from '../store'

export const testColl = (collConf, name = 'users') => {
  const store = createStore({
    [name]: collConf,
  })
  return store.state[name]
}
