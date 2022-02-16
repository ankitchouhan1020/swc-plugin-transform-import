import {
  ImportDeclaration,
  ModuleItem,
} from '@swc/core';
import Visitor from '@swc/core/Visitor';

export interface SubOpts {
    /**
     * The library name to use instead of the one specified in the import statement.
     */
    transform: string;
    /**
     * Whether or not to throw when an import is encountered which would cause the entire module to be imported.
     */
    preventFullImport: boolean;
    /**
     * When set to true, will preserve import { X } syntax instead of converting to import X.
     */
    skipDefaultConversion: boolean;
    /**
     * When set to true, will add side effect import from transformed path concatenated with `/style`
     */
    style: boolean;
}

export interface Opts {
    [key: string]: SubOpts;
}

const DEFAULT_OPTS: Omit<SubOpts, 'transform'> = {
    preventFullImport: false,
    skipDefaultConversion: false,
    style: false,
}

function barf(msg: String) {
    throw new Error('swc-plugin-transform-imports: ' + msg);
}


function transformImportPath(transformOption: any, importName: string) {
    if (!transformOption) return;

    const isFunction = typeof transformOption === 'function';

    // If transformOption is a function or defined in a JS file.
    if (/\.js$/i.test(transformOption) && !/[\$\{\}]/.test(transformOption) || isFunction) {
        let transformFn;

        try {
            transformFn = isFunction ? transformOption : require(transformOption);
        } catch (error) {
            barf('failed to require transform file ' + transformOption);
        }

        if (typeof transformFn !== 'function') {
            barf('expected transform function to be exported from ' + transformOption);
        }

        return transformFn(importName);
    }

    const transformedImport = transformOption.replace(/\$\{\s?member\s?\}/ig, importName);
    return transformedImport;
}

class PluginTransformImport extends Visitor {
    private opts: Opts = {};

    constructor(opts: Opts = {}) {
        super();

        // Add default options to the every opts object.
        for (const key of Object.keys(opts)) {
            this.opts[key] = {
                ...DEFAULT_OPTS,
                ...opts[key],
            }
        }
    }

    visitModuleItems(nodes: ModuleItem[]): ModuleItem[] {
        const { opts } = this;
        const transformedNodes: ModuleItem[] = [];

        // Return if options are not provided.
        if (Object.keys(opts).length === 0) {
            return nodes;
        }

        for (const node of nodes) {
            const { type } = node;

            const isValidTranformCandidate = type === 'ImportDeclaration' && (node.source.value in opts);

            if (!isValidTranformCandidate) {
                transformedNodes.push(node);
                continue;
            }

            // node has properties 'source' and 'specifiers' attached.
            // node.source is the library/module name, aka 'react-bootstrap'.
            // node.specifiers is an array of ImportSpecifier | ImportDefaultSpecifier | ImportNamespaceSpecifier
            const { source, specifiers } = node;

            const { preventFullImport, skipDefaultConversion, transform, style } = opts[source.value];
            const isDefaultImportExist = specifiers.some(specifier => specifier.type === 'ImportDefaultSpecifier');

            //      import * as name from 'module'; (ImportNamespaceSpecifier)
            //      import name from 'module'; (ImportDefaultSpecifier)
            if (isDefaultImportExist && preventFullImport) {
                barf('Import of entire module ' + source.value + ' not allowed due to preventFullImport setting');
            }

            // Going through each specifier and transforming the import path.
            // aka Row, Grid, { Grid as MyGrid}..
            for (const specifier of specifiers) {
                const { type, local } = specifier;
                const doesImportedValueExist = type === 'ImportSpecifier' && specifier?.imported?.value;
                const actualImportVariable = doesImportedValueExist ? specifier?.imported?.value : local.value;
                const shouldSkipDefaultConversion = skipDefaultConversion && doesImportedValueExist;

                // Swap out the import with one that doesn't include member imports.
                // Member imports should each get their own import line
                // transform this:
                //      import Bootstrap, { Grid } from 'react-bootstrap';
                // into this:
                //      import Bootstrap from 'react-bootstrap';
                //      import Grid from 'react-bootstrap/lib/Grid';

                // Create a new Import Declaration node for each named import
                if (type === 'ImportSpecifier') {
                    const newSpecifier = {
                        ...specifier,
                        ...(shouldSkipDefaultConversion ? {} : {
                            imported: null,
                            type: "ImportDefaultSpecifier",
                        }),
                    }

                    const value = transformImportPath(transform, actualImportVariable || '');
                    const copyNode = {
                        ...node,
                        source: {
                            ...source,
                            value,
                        },
                        specifiers: [newSpecifier],
                        type: "ImportDeclaration",
                    } as ImportDeclaration;

                    transformedNodes.push(copyNode);

                    if (style) {                        
                        const styleNode = {
                            ...node,
                            source: {
                                ...source,
                                value: `${value}/style`,
                            },
                            specifiers: [],
                            type: "ImportDeclaration",
                        } as ImportDeclaration;
                        
                        transformedNodes.push(styleNode);
                    }

                } else if (type === 'ImportDefaultSpecifier') {
                    const nameImportsFilteredNode = {
                        ...node,
                        specifiers: [specifier],
                    } as ImportDeclaration;

                    transformedNodes.push(nameImportsFilteredNode);
                }
            }
        }

        // If import declaration is a candidate for transformation
        // We push all the new import declarations to the transformedNodes array.
        // Else we push the original node to the transformedNodes array.
        return transformedNodes;
    }
}

export default PluginTransformImport;