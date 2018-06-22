// primitives
const int = Symbol.for("Int");
const float = Symbol.for("Float");
const string = Symbol.for("String");
const boolean = Symbol.for("Boolean");

const fn = Symbol.for('Function');
const nullSymbol = Symbol.for(null);
const symbolSymbol = Symbol.for("Symbol");

const name = Symbol.for("name");

const isPrimitive = type => {
  switch(type) {
    case string:
    case boolean:
    case float:
    case int:
      return true;
  };
  return false;
};

class GraphQLObject{};
class Union {
  constructor(...values) {
    this.values = [...new Set(values)];
    this[name] = rString();
  }
  get isArray() {
    return this.values.length === 1;
  }
  get first() {
    return this.values[0]
  }
  get type() {
    if (this.isArray) {
      if (isPrimitive(this.first)) return `[${ Symbol.keyFor(this.first) }!]`;
      return `[${this.first[name]}!]`;
    }
    return this.values.map(it => {
      if (isPrimitive(it)) return Symbol.keyFor(it);
      return it[name];
    }).join(' | ');
  }
};

const rString = () => Math.random().toString(36).substring(8);

const getName = obj => {
  const result = obj.constructor.name;

  if (result !== 'Object') return result;
  return rString();
};

const graphqlify = (obj) => {
  switch (typeof obj) {
    case 'number': 
      if (~~obj === obj) return int;
      return float;
    case 'string': return string;
    case 'boolean': return boolean;
    case 'function': return fn;
    case 'undefined': return nullSymbol; // Unsure how to handle this case
    case 'symbol': return symbolSymbol;
  }
  if (obj === null) return nullSymbol;
  if (Array.isArray(obj)) {
    // this really should only be one kind ever but in the end it might be a union
    return new Union(...new Set(obj.map(graphqlify)));
  };
  // here we have an object
  const result = new GraphQLObject();
  result[name] = getName(obj);
  for (let key in obj) {
    result[key] = graphqlify(obj[key]);
  }
  return result;
};

const combine = (...objs) => objs.reduce((acc, obj) => {
  if (!(obj instanceof GraphQLObject)) return acc;
  for (let key in obj) {
    if (!acc.hasOwnProperty(key)) acc[key] = obj[key];
    else if (acc[key] != obj[key]) {
      acc[key] = new Union(acc[key], obj[key]);
    }
  }
  return acc;
}, new GraphQLObject());

const fieldString = ({ name, type }) => {
  return `${name}: ${type}`;
};

const stringify = g => {

  // test all the base case types
  switch (g) {
    case string:
    case boolean:
    case float:
    case int: 
      return Symbol.keyFor(g);
  };

  if (g instanceof Union && !g.isArray) return `union ${g[name]} = ${g.type}`;

  const fields = [];
  const adtl = [];
  for (let key in g) {
    const part = g[key];
    switch(part) {
      case string:
      case boolean:
      case float:
      case int: 
        fields.push({ name: key, type: Symbol.keyFor(part), });
        break;
      case nullSymbol:
      case symbolSymbol:
      case fn:
        fields.push({ name, type: "UNKNOWN" });
        break;
      default:
        if (part instanceof GraphQLObject) {
          adtl.push(stringify(part));
          fields.push({ name: key, type: part[name] });
          break;
        } else if (part instanceof Union) {
          part.values.forEach(v => {
            if (!isPrimitive(v)) adtl.push(stringify(v));
          });
          if (part.isArray) {
            fields.push({ name: key, type: part.type });
          } else {
            adtl.push(stringify(part));
            fields.push({ name: key, type: `[${part[name]}!]` });
          }
        }
    }
  }
  const result = `type ${g[name]} {
  ${fields.map(fieldString).join('\n  ')}
}`;
  
  if (!adtl.length) return result;
  return adtl.join('\n\n') + '\n\n' + result
};

const randomElem = a => a[~~(Math.random() * a.length)];

const randomInstance = g => {
  switch(g) {
    case string: return rString();
    case boolean: return !(~~(Math.random()*2))
    case float: return (Math.random() * Number.MAX_SAFE_INTEGER);
    case int:  return ~~(Math.random() * Number.MAX_SAFE_INTEGER) - ~~(Math.random() * Number.MAX_SAFE_INTEGER);
    case fn: return (...args) => args;
    case nullSymbol: return null;
    case symbolSymbol: return Symbol.for(rString());
  };

  if (g instanceof Union) {
    if (!g.isArray) return randomInstance(randomElem(g.values));
    return Array.from(new Array(~~(Math.random() * 10)), () => randomInstance(g.first));
  }

  const result = {};
  for (let key in g) {
    result[key] = randomInstance(g[key]);
  }
  return result;
}

module.exports = { graphqlify, combine, stringify, random: randomInstance, };
