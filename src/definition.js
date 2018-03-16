import _ from 'lodash'

export const GET_DATAVAN_ACTION = 'DATAVAN'
export const DATAVAN_MUTATE_ACTION = 'DATAVAN_MUTATE'

export const TMP_ID_PREFIX = 'dv~'

export const tmpIdRegExp = /^dv~(\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d\.\d+Z)~([.\d]+)~(.+)/
export const getDeviceName = store => (store && store.getState().datavan.system.byId.deviceName) || 'tmp'

// NOTE query key with $$ prefix are omitted in query but send to fetcher
export const startsWith$$ = (v, k) => _.startsWith(k, '$$')
export const isInResponseQuery = query => _.some(query, startsWith$$)
