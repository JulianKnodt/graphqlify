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
    return this.values.map(it => {
      if (isPrimitive(it)) return Symbol.keyFor(it);
      return it[name];
    }).join(' | ');
  }
};

class GraphQLArray {
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
}

const rString = () => Math.random().toString(36).substring(8);

const getName = obj => {
  const result = obj.constructor.name;
  return result !== 'Object' ? result : rString();
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
    // this really should only be one kind ever but in the end it might need a new union
    return new GraphQLArray(...new Set(obj.map(graphqlify)));
  };
  // here we have an object
  const result = new GraphQLObject();
  result[name] = getName(obj);
  return Object.keys(obj).reduce((acc, key) => 
    Object.assign(acc, {[key]: graphqlify(obj[key])}),
  result);
};

const combine = (...objs) => objs
  .filter(it => it instanceof GraphQLObject)
  .reduce((acc, obj) => {
  for (let key in obj) {
    if (!acc.hasOwnProperty(key)) acc[key] = obj[key];
    else if (acc[key] != obj[key]) {
      acc[key] = new Union(acc[key], obj[key]);
    }
  }
  return acc;
}, new GraphQLObject());

const fieldString = ({ name, type }) => `${name}: ${type}`;

const stringify = g => {
  // test all the base case types
  switch (g) {
    case string:
    case boolean:
    case float:
    case int: return Symbol.keyFor(g);
  };

  if ((g instanceof Union || g instanceof GraphQLArray)  && !g.isArray) return `union ${g[name]} = ${g.type}`;

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
        fields.push({ name: key, type: "UNKNOWN" });
        break;
      default:
        if (part instanceof GraphQLObject) {
          adtl.push(stringify(part));
          fields.push({ name: key, type: part[name] });
        } else if (part instanceof GraphQLArray) {
          part.values
            .filter(it => !isPrimitive(it))
            .forEach(it => adtl.push(stringify(it)))

          if (part.isArray) fields.push({ name: key, type: part.type });
          else {
            adtl.push(stringify(part));
            fields.push({ name: key, type: `[${part[name]}!]` });
          }
        } else if (part instanceof Union) {
          part.values
            .filter(it => !isPrimitive(it))
            .forEach(it => adtl.push(stringify(it)))

          adtl.push(stringify(part));
          fields.push({ name: key, type: part[name] });
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
    case float: return (Math.random() * 10000);
    case int:  return ~~(Math.random() * Number.MAX_SAFE_INTEGER) - ~~(Math.random() * Number.MAX_SAFE_INTEGER);
    case fn: return (...args) => args;
    case nullSymbol: return null;
    case symbolSymbol: return Symbol.for(rString());
  };


  if (g instanceof GraphQLArray) {
    return Array.from(new Array(~~(Math.random() * 10)), () => randomInstance(g.first));
  }

  if (g instanceof Union) {
    return randomInstance(randomElem(g.values));
  }

  return Object.keys(g).reduce((acc, key) => Object.assign(acc, {[key]: randomInstance(g[key])}), {});
}

// const g = graphqlify({test: 3, other: 3.5, hasName: true, nil: null, name: "james", vals: [1,2,3,4], undef: undefined, oops: [{bruh: true}], items: ["key", {noop: false}], children: {name: "Jerry"}});
// console.log(stringify(g));
// console.log(randomInstance(g));

module.exports = { graphqlify, combine, stringify, random: randomInstance, };
