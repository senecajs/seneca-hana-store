'use strict'

const _ = require('lodash')
const Moment = require('moment')

const SENECA_TYPE_COLUMN = 'seneca'
const BOOLEAN_TYPE = 'b'
const OBJECT_TYPE = 'o'
const ARRAY_TYPE = 'a'
const DATE_TYPE = 'd'

const CHARACTER_TYPES = ['VARCHAR', 'NVARCHAR', 'ALPHANUM', 'SHORTTEXT']
const DATETIME_TYPES = ['DATE', 'TIME', 'SECONDDATE', 'TIMESTAMP']
const NUMERIC_TYPES = ['TINYINT', 'SMALLINT', 'INTEGER', 'BIGINT', 'SMALLDECIMAL', 'DECIMAL', 'REAL', 'DOUBLE']
const BINARY_TYPES = ['VARBINARY']
const LOB_TYPES = ['BLOB', 'CLOB', 'NCLOB', 'TEXT']

 // types allowed in where clause
const ALLOWED = _.union(CHARACTER_TYPES, DATETIME_TYPES, NUMERIC_TYPES, BINARY_TYPES, LOB_TYPES)

module.exports.isAllowed = function (dataType) {
  if (!dataType) {
    return false
  }

  var type = dataType.toUpperCase()

  return !(_.indexOf(ALLOWED, type) === -1)
}

var mapper = {
  DEFAULT: {
    toSQL: function (val) {
      return {value: val}
    },
    toJS: function (val) {
      return val
    }
  },
  TIMESTAMP: {
    toSQL: function (val) {
      var value
      if (val && Moment.utc(val).isValid()) {
        value = Moment.utc(val).format('YYYY-MM-DD HH:mm:ss.SSS')
      }
      else {
        value = null
      }
      return {value: value}
    },
    toJS: function (val) {
      var value
      if (val && Moment.utc(val).isValid()) {
        value = Moment.utc(val, 'YYYY-MM-DD HH:mm:ss.SSS').format('YYYY-MM-DD HH:mm:ss.SSS')
      }
      else {
        value = null
      }
      return value
    }
  },
  SECONDDATE: {
    toSQL: function (val) {
      var value
      if (val && Moment.utc(val).isValid()) {
        value = Moment.utc(val).format('YYYY-MM-DD HH:mm:ss')
      }
      else {
        value = null
      }
      return {value: value}
    },
    toJS: function (val) {
      var value
      if (val && Moment.utc(val).isValid()) {
        value = Moment.utc(val, 'YYYY-MM-DD HH:mm:ss').format('YYYY-MM-DD HH:mm:ss')
      }
      else {
        value = null
      }
      return value
    }
  },
  DATE: {
    toSQL: function (val) {
      var value
      if (val && Moment.utc(val).isValid()) {
        value = Moment.utc(val).format('YYYY-MM-DD')
      }
      else {
        value = null
      }
      return {value: value}
    },
    toJS: function (val) {
      var value
      if (val && Moment.utc(val).isValid()) {
        value = Moment.utc(val, 'YYYY-MM-DD').format('YYYY-MM-DD')
      }
      else {
        value = null
      }
      return value
    }
  },
  TIME: {
    toSQL: function (val) {
      var value
      if (val && Moment.utc(val).isValid()) {
        value = Moment.utc(val).format('HH:mm:ss')
      }
      else {
        value = null
      }
      return {value: value}
    },
    toJS: function (val) {
      var value
      if (val) {
        value = Moment(val, 'HH:mm:ss').format('HH:mm:ss')
      }
      else {
        value = null
      }
      return value
    }
  },
  STRING: {
    toSQL: function (val) {
      var map = {}
      if (_.isBoolean(val)) {
        map.value = JSON.stringify(val)
        map.type = BOOLEAN_TYPE
      }
      else if (_.isDate(val)) {
        map.value = val.toISOString()
        map.type = DATE_TYPE
      }
      else if (_.isArray(val)) {
        map.value = JSON.stringify(val)
        map.type = ARRAY_TYPE
      }
      else if (_.isObject(val)) {
        map.value = JSON.stringify(val)
        map.type = OBJECT_TYPE
      }
      else {
        map.value = val
      }
      return map
    },
    toJS: function (val, typeHint) {
      var value = val
      if (OBJECT_TYPE === typeHint) {
        try {
          value = JSON.parse(val)
        }
        catch (e1) {
          console.error('Error parsing OBJECT: %s', val)
        }
      }
      else if (ARRAY_TYPE === typeHint) {
        try {
          value = JSON.parse(val)
        }
        catch (e2) {
          console.error('Error parsing ARRAY: %s', val)
        }
      }
      else if (DATE_TYPE === typeHint) {
        try {
          value = new Date(val)
        }
        catch (e3) {
          console.error('Error parsing DATE: %s', val)
        }
      }
      else if (BOOLEAN_TYPE === typeHint) {
        try {
          value = JSON.parse(val)
        }
        catch (e4) {
          console.error('Error parsing BOOLEAN: %s', val)
        }
      }
      return value
    }
  }
}

/**
 * SAP HANA Data Types Reference: http://help.sap.com/hana/html/_csql_data_types.html
 *
 * Character string types  VARCHAR, NVARCHAR, ALPHANUM, SHORTTEXT
 * Datetime types  DATE, TIME, SECONDDATE, TIMESTAMP
 * Numeric types  TINYINT, SMALLINT, INTEGER, BIGINT, SMALLDECIMAL, DECIMAL, REAL, DOUBLE
 * Binary types  VARBINARY
 * Large Object types  BLOB, CLOB, NCLOB, TEXT
 *
 * @param dataType data type name
 * @returns {*}
 */
var getMapper = module.exports.getMapper = function (dataType) {
  switch (dataType) {
    case 'VARCHAR':
    case 'NVARCHAR':
    case 'ALPHANUM':
    case 'SHORTTEXT':
      return mapper.STRING
    case 'DATE':
    case 'TIME':
    case 'SECONDDATE':
    case 'TIMESTAMP':
      return mapper[dataType]
    case 'TINYINT':
    case 'SMALLINT':
    case 'INTEGER':
    case 'BIGINT':
    case 'SMALLDECIMAL':
    case 'DECIMAL':
    case 'REAL':
    case 'DOUBLE':
    case 'VARBINARY':
    case 'BLOB':
    case 'CLOB':
    case 'NCLOB':
    case 'TEXT':
      return mapper.DEFAULT
    default:
      console.log('Type %s not mapped. Using default mapper.', dataType)
      return mapper.DEFAULT
  }
}

module.exports.fixquery = function (entp, q) {
  var qq = {}
  var qp

  for (qp in q) {
    if (!qp.match(/\$$/)) {
      qq[qp] = q[qp]
    }
  }

  if (_.isFunction(qq.id)) {
    delete qq.id
  }

  return qq
}


/**
 * Create a new persistable entity from the entity object. The function adds
 * the value for SENECA_TYPE_COLUMN with hints for type of the serialized objects.
 *
 * @param ent entity
 * @return {Object}
 */
module.exports.makeentp = function (ent, tblspec) {
  if (!ent) {
    return null
  }

  const entp = {}
  const type = {}
  const fields = ent.fields$()

  fields.forEach(function (field) {
    const cspec = tblspec.columns[field]
    const dataType = (cspec && cspec.dataTypeName) ? cspec.dataTypeName : null
    const mappedval = getMapper(dataType).toSQL(ent[field])

    if (mappedval.value) {
      entp[field] = mappedval.value
      if (mappedval.type) {
        type[field] = mappedval.type
      }
    }
  })

  if (!_.isEmpty(type)) {
    entp[SENECA_TYPE_COLUMN] = JSON.stringify(type)
  }

  return entp
}


/**
 * Create a new entity using a row from database. This function is using type
 * hints from database column SENECA_TYPE_COLUMN to deserialize stored values
 * into proper objects.
 *
 * @param ent entity
 * @param row database row data
 * @return {Entity}
 */
module.exports.makeent = function (ent, row, tblspec) {
  if (_.isUndefined(ent) || _.isUndefined(row)) {
    return null
  }

  const entp = {}
  const fields = _.keys(row)
  const hints = row[SENECA_TYPE_COLUMN]
  const senecatype = hints ? JSON.parse(hints) : {}

  fields.forEach(function (field) {
    if (SENECA_TYPE_COLUMN !== field) {
      const cspec = tblspec.columns[field]
      const dataType = (cspec && cspec.dataTypeName) ? cspec.dataTypeName : null
      entp[field] = getMapper(dataType).toJS(row[field], senecatype[field])
    }
  })

  return ent.make$(entp)
}


module.exports.tablename = function (entity) {
  const canon = entity.canon$({object: true})
  const name = (canon.base ? canon.base + '_' : '') + canon.name

  return name
}

