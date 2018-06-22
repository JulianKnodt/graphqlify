# @tomzer0/graphqlify

Turn a javascript object into a object with types,
then into a graphql string.

## Installation

`npm i @tomzer0/graphqlify`

## Usage

```js
const { graphqlify, stringify, combine, random } = require('@tomzer0/graphqlify');

const restResult1 = {...};
const restResult2 = {...};

// not necessary
const generalResult = combine(
  graphqlify(restResult1), 
  graphqlify(restResult2),
);

console.log(stringify(generalResult));
```

- `graphqlify(Object):` Convert a javascript object into a template. Returns a Template.
- `combine(...GraphQLObject):` Combine multiple templates together to form one result. Returns a Template.
- `random(GraphQLObject):` Populates a template with random instances. Returns an object.
- `stringify(GraphQLObject):` Converts a template into graphql SDL. Returns a String.

### Example

```js
const g = graphqlify({test: 3, hasName: true, name: "james", vals: [1,2,3,4], oops: [{bruh: true}], items: ["key", {noop: false}], children: {name: "Jerry"}});
console.log(stringify(g));
```

Then pipe it to a file.

`node stringifyingFile.js > GQLType.graphql`


## License
MIT
