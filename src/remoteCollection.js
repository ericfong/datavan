import {composeClass, Fetcher, Stage, Collection} from '.'

export default function(conf) {
  return composeClass(
    conf,
    Fetcher,
    Stage,
    Collection,
  )
}
