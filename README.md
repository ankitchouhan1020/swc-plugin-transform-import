# swc-plugin-transform-import
Inspired from [babel-plugin-transform-imports](https://www.npmjs.com/package/babel-plugin-transform-imports)

## Installation

```bash
npm i -D swc-plugin-transform-import
```

## Uses with webpack-config
```javascript
// webpack.config.js

const PluginTransformImport = require('swc-plugin-transform-import').default;

module: {
    rules: [
      {
        test: /\.(ts|tsx|js|jsx)$/,
        exclude: /node_modules/,
        use: [{
          loader: 'swc-loader',
          options: {
            plugin: (m) => new PluginTransformImport({
              "lodash": {
                "transform": "lodash/${member}",
                "preventFullImport": true
              }
            }).visitProgram(m),
          }
        }]
      },
    ],
};

```


```javascript
import { Row, Grid as MyGrid } from 'react-bootstrap';
import { merge } from 'lodash';
```

...into default style imports:

```javascript
import Row from 'react-bootstrap/lib/Row';
import MyGrid from 'react-bootstrap/lib/Grid';
import merge from 'lodash/merge';
```

*Note: this plugin is not restricted to the react-bootstrap and lodash
libraries.  You may use it with any library.*

## That's stupid, why would you do that?

When SWC encounters a member style import such as:

```javascript
import { Grid, Row, Col } from 'react-bootstrap';
```

it will generate something similarish to:

```javascript
var reactBootstrap = require('react-bootstrap');
var Grid = reactBootstrap.Grid;
var Row = reactBootstrap.Row;
var Col = reactBootstrap.Col;
```

Some libraries, such as react-bootstrap and lodash, are rather large and
pulling in the entire module just to use a few pieces would cause unnecessary
bloat to your client optimized (webpack etc.) bundle.  The only way around
this is to use default style imports:

```javascript
import Grid from 'react-bootstrap/lib/Grid';
import Row from 'react-bootstrap/lib/Row';
import Col from 'react-bootstrap/lib/Col';
```

But, the more pieces we need, the more this sucks.  This plugin will allow you
to pull in just the pieces you need, without a separate import for each item.
Additionally, it can be configured to throw when somebody accidentally writes
an import which would cause the entire module to resolve, such as:

```javascript
import Bootstrap, { Grid } from 'react-bootstrap';
// -- or --
import * as Bootstrap from 'react-bootstrap';
```

## Installation

```
npm install --save-dev swc-plugin-transform-import
```


## Advanced Transformations

In cases where the provided default string replacement transformation is not
sufficient (for example, needing to execute a RegExp on the import name), you
may instead provide a path to a .js file which exports a function to run
instead.  Keep in mind that the .js file will be `require`d relative from this
plugin's path, likely located in `/node_modules/babel-plugin-transform-imports`.
You may provide any filename, as long as it ends with `.js`.

.babelrc:
```json
{
    "plugins": [
        ["transform-imports", {
            "my-library": {
                "transform": "../../path/to/transform.js",
                "preventFullImport": true
            }
        }]
    ]
}
```

/path/to/transform.js:
```js
module.exports = function(importName) {
    return 'my-library/etc/' + importName.toUpperCase();
};
```

## Options

| Name | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `transform` | `string` | yes | `undefined` | The library name to use instead of the one specified in the import statement.  ${member} will be replaced with the member, aka Grid/Row/Col/etc.  Alternatively, pass a path to a .js file which exports a function to process the transform (see Advanced Transformations) |
| `preventFullImport` | `boolean` | no | `false` | Whether or not to throw when an import is encountered which would cause the entire module to be imported. |
| `skipDefaultConversion` | `boolean` | no | `false` | When set to true, will preserve `import { X }` syntax instead of converting to `import X`. |
| `style` | `boolean` | no | `false` | When set to true, will add side effect import of transformed path concatenated with `/style`. |
