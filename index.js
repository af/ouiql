const fs = require('fs')
const path = require('path')
const assert = require('assert')
const debug = require('debug')('ouiql')

const sqlFileRegex = /(\w+)\.sql$/
const sqlFilenameToQueryName = fname => sqlFileRegex.exec(fname)[1]


// dirPath -> { queryName: querySQL }
const loadQueries = (pathToDir, storeConfig) => {
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

// TODO: test to ensure no sql injection
const injectParamsToQuery = (sqlText = '', {tableName}, argHash = {}) => {
    const params = []

    // node-pg expects params in the form $1, but for convenient psql usage it's
    // nice to have them as :named_arg. So convert from the psql type to the node-pg
    // form here. params is be an array containing the parameters for the node-pg query.
    const replacer = (match, paramName) => {
        params.push(argHash[paramName])
        return `$${params.length}`
    }

    // tableName is a special cased var passed in to every query
    const sanitizedTableName = tableName.replace(/\W/g, '')
    const query = sqlText.replace(':tableName', sanitizedTableName)
                         .replace(/:(\w+)/g, replacer)
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

// storeConfig: static query params (tableName)
// arghash = runtime query parameters
const sqlTextToQueryFn = (runDbQuery, storeConfig, sqlText) => (argHash = {}) => {
    const [query, params] = injectParamsToQuery(sqlText, storeConfig, argHash)
    const returnType = returnTypeFromSQL(sqlText)
    debug(`returning: ${JSON.stringify(returnType)}, params: ${JSON.stringify(params)}`)

    return runDbQuery(query, params).then(res => {
        debug(`Ran query: \n${query}`)
        if (returnType === 'record') return res.rows[0]
        else if (returnType.field) return res.rows[0] && res.rows[0][returnType.field]
        else return res.rows
    })
}

exports.makeBackend = ({sendQuery}) => {
    return {sendQuery}
}

exports.makeStore = (backend, spec) => {
    // TODO: (later) also load default queries
    const {tableName} = spec
    assert(tableName, 'tableName must be provided when making a store')

    const storeConfig = {tableName}
    const queryMap = loadQueries(spec.sqlPath, storeConfig)
    const queryNames = Object.keys(queryMap)
    const queryFnMap = queryNames.reduce((acc, queryName) => {
        const queryText = queryMap[queryName]
        acc[queryName] = sqlTextToQueryFn(backend.sendQuery, storeConfig, queryText)
        return acc
    }, {})

    // TODO: change required file to createTable.sql
    assert(queryFnMap.create, 'create.sql must be present when making a store')
    debug(`Store "${tableName}" has queries:`, queryNames)

    return queryFnMap
}
