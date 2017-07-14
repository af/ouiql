// @flow
const fs = require('fs')
const path = require('path')
const debug = require('debug')('ouiql')

const sqlFileRegex = /(\w+)\.sql$/
const sqlFilenameToQueryName = fname => sqlFileRegex.exec(fname)[1]


/*::
type BackendInitOptions = {
    sendQuery: (string, Array<string>) => Promise<*>
}
type Backend = {
    sendQuery: (string, Array<string>) => Promise<*>,

    // TODO: get flow working with the bind()ing of buildQueryFunctions;
    // using the [string]: function workaround for now
    // buildQueryFunctions: ({sqlPath: string, ctx: Object}) => Object
    [string]: function
}
type QueryBag = {[string]: string}
type StoreContext = {
    tableName: string,
    readFields: string,
    [string]: string
}

export type {Backend, BackendInitOptions, StoreContext}
*/

// TODO: more extensive tests to ensure no sql injection
const injectParamsToQuery = (sqlText = '', staticCtx /*:StoreContext*/, argHash = {}) => {
    const params = []

    // node-pg expects params in the form $1, but for convenient psql usage it's
    // nice to have them as :named_arg. So convert from the psql type to the node-pg
    // form here. params is be an array containing the parameters for the node-pg query.
    const replacer = (match, paramName) => {
        // Interpolate static query context first:
        if (paramName in staticCtx) return staticCtx[paramName]
        else {
            params.push(argHash[paramName])
            return `$${params.length}`
        }
    }

    // tableName is a special cased var passed in to every query
    const query = sqlText.replace(/:(\w+)/g, replacer)
    return [query, params]
}


// Detect which type of return value to use from a query function, based on a
// sql comment in the query, eg:
//
// -- return: record
//
// Acceptable values: rows (default), record, field(fieldname)
const returnRegex = /^-- return: (\w+(?:\((\w+)\))?)$/m
const returnTypeFromSQL = query => {
    const match = returnRegex.exec(query)
    if (!match) return 'rows'
    const [fullMatch, type, fieldName] = match      // eslint-disable-line no-unused-vars
    return fieldName ? {field: fieldName} : type
}



// storeContext: static query params (tableName)
// arghash = runtime query parameters
const sqlTextToQueryFn = (
    runDbQuery /*:(string, Array<string>) => Promise<Object>*/,
    ctx /*:StoreContext*/,
    sqlText /*:string*/
) => (argHash = {}) => {
    const [query, params] = injectParamsToQuery(sqlText, ctx, argHash)
    const returnType = returnTypeFromSQL(sqlText)
    debug(`returning: ${JSON.stringify(returnType)}, params: ${JSON.stringify(params)}`)

    return runDbQuery(query, params).then(res => {
        debug(`Ran query: \n${query}`)
        if (returnType === 'record') return res.rows[0]
        else if (returnType.field) return res.rows[0] && res.rows[0][returnType.field]
        else return res.rows
    })
}

const loadQueries = (pathToDir = '') /*:QueryBag*/ => {
    const queryMap = {}
    const files = fs.readdirSync(pathToDir)
    const sqlFiles = files.filter(f => sqlFileRegex.test(f))
                          .map(f => path.join(pathToDir, f))
    sqlFiles.forEach(s => {
        const queryName = sqlFilenameToQueryName(s)
        const queryText = fs.readFileSync(s, 'utf8')
        queryMap[queryName] = queryText
    })
    return queryMap
}


// Load queries that are available by default for each store
const defaultQueryMap = loadQueries(path.join(__dirname, 'defaultQueries'))

const buildQueryFunctions = (backend /*:Backend*/, {sqlPath, ctx}) => {
    const queryMap /*:QueryBag*/ = Object.assign({}, defaultQueryMap, loadQueries(sqlPath))
    const queryNames = Object.keys(queryMap)
    const queryFnMap = queryNames.reduce((acc, queryName) => {
        const queryText = queryMap[queryName]
        acc[queryName] = sqlTextToQueryFn(backend.sendQuery, ctx, queryText)
        return acc
    }, {})
    return queryFnMap
}

exports.makeBackend = ({sendQuery} /*:BackendInitOptions*/) /*:Backend*/ => {
    return {
        sendQuery,
        buildQueryFunctions: buildQueryFunctions.bind(null, {sendQuery})
    }
}
