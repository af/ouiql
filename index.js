// @flow
const assert = require('assert')
const debug = require('debug')('ouiql')
const {sanitize} = require('./lib/queryContext')


/*::

import type {QueryContext} from './lib/queryContext.js'
import type {Backend} from './lib/backends.js'

type StoreInitOptions = {
    relation: string,
    context: QueryContext,
    sqlPath: string
}
*/

exports.makeStore = (backend /*:Backend*/, spec /*:StoreInitOptions*/) => {
    const {relation, context = {}, sqlPath} = spec
    assert(relation, '"relation" must be provided when making a store')

    // Set up the static context object that is interpolated into each query
    const defaultCtx = {relation, readFields: '*'}
    const ctx = sanitize(Object.assign(defaultCtx, context))

    const queryFnMap/*:{[string]: function}*/ = backend.buildQueryFunctions({sqlPath, ctx})

    assert(queryFnMap.init, 'init.sql must be present when making a store')
    debug(`Store "${relation}" has queries:`, Object.keys(queryFnMap))

    return queryFnMap
}

exports.makeBackend = require('./lib/backends').makeBackend
