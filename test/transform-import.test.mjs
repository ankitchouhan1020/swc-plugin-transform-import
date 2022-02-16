import { strict as assert } from 'assert';
import expect from 'expect';

import { transformSync } from '@swc/core';

import PluginImport from '../lib/index.js';

describe('PluginImport', function () {
  it('should separate import declaration for named import', function () {
    const opts = {
      "react-bootstrap": {
        "transform": "react-bootstrap/lib/${member}",
        "preventFullImport": false
      },
    }

    const output = transformSync(`
      import Bootstrap, { Grid } from 'react-bootstrap';
    `, {
      plugin(m) {
        return new PluginImport.default(opts).visitProgram(m);
      },
    });

    assert.equal(output.code, `
      import Bootstrap from 'react-bootstrap';
      import Grid from 'react-bootstrap/lib/Grid';
    `.trimStart().replace(/^\s+/mg, ''));
  });

  it('should preventing full import', function () {
    const options = {
      "react-bootstrap": {
        "transform": "react-bootstrap/lib/${member}",
        "preventFullImport": true
      },
    }

    const output = () => transformSync(`
    import Bootstrap, { Row, Grid as MyGrid } from 'react-bootstrap';
  `, {
      plugin(m) {
        return new PluginImport.default(options).visitProgram(m);
      },
    });

    expect(output).toThrow('swc-plugin-transform-imports: Import of entire module react-bootstrap not allowed due to preventFullImport setting');
  });


  it('should preserve name spaced import', function () {
    const opts = {
      "react-bootstrap": {
        "transform": "react-bootstrap/lib/${member}",
        "preventFullImport": false
      },
      "lodash": {
        "transform": "lodash/${member}",
      }
    }

    const output = transformSync(`
      import {Row, Grid as MyGrid } from 'react-bootstrap';
      import { merge } from 'lodash';
      import React from 'react';
      import isEmpty from 'lodash/isEmpty';
    `, {
      plugin(m) {
        return new PluginImport.default(opts).visitProgram(m);
      },
    });

    assert.equal(output.code, `
    import Row from 'react-bootstrap/lib/Row';
    import MyGrid from 'react-bootstrap/lib/Grid';
    import merge from 'lodash/merge';
    import React from 'react';
    import isEmpty from 'lodash/isEmpty';
    `.trimStart().replace(/^\s+/mg, ''));
  });

  it('should transform import path using function', function () {
    const opts = {
      "react-bootstrap": {
        "transform": (importName) => "react-bootstrap/lib/" + importName.toLowerCase(),
        "preventFullImport": false
      }
    }

    const output = transformSync(`
      import {Row, Grid as MyGrid } from 'react-bootstrap';

    `, {
      plugin(m) {
        return new PluginImport.default(opts).visitProgram(m);
      },
    });

    assert.equal(output.code, `
    import Row from 'react-bootstrap/lib/row';
    import MyGrid from 'react-bootstrap/lib/grid';
    `.trimStart().replace(/^\s+/mg, ''));
  });

  it('should skip default conversion', function () {
    const opts = {
      "react-bootstrap": {
        "transform": "react-bootstrap/lib/${member}",
        "skipDefaultConversion": true
      },
    }

    const output = transformSync(`
      import {Row, Grid as MyGrid } from 'react-bootstrap';
    `, {
      plugin(m) {
        return new PluginImport.default(opts).visitProgram(m);
      },
    });

    assert.equal(output.code, `
    import Row from 'react-bootstrap/lib/Row';
    import { Grid as MyGrid } from 'react-bootstrap/lib/Grid';
    `.trimStart().replace(/^\s+/mg, ''));
  });

  it('shouldn\'t change any import', function () {
    const output = transformSync(`
      import { Row, Grid as MyGrid } from 'react-bootstrap';
    `, {
      plugin(m) {
        return new PluginImport.default().visitProgram(m);
      },
    });

    assert.equal(output.code, `
    import { Row, Grid as MyGrid } from 'react-bootstrap';
    `.trimStart().replace(/^\s+/mg, ''));
  });
  
  it('should import style', function () {
    const opts = {
      "antd": {
        "transform": "antd/es/${member}",
        "style": true
      },
    }

    const output = transformSync(`
      import { Button } from 'antd';
    `, {
      plugin(m) {
        return new PluginImport.default(opts).visitProgram(m);
      },
    });

    assert.equal(output.code, `
      import Button from 'antd/es/Button';
      import 'antd/es/Button/style';
    `.trimStart().replace(/^\s+/mg, ''));
  });
});