import { transformFromAstSync } from '@babel/core';
import generate from '@babel/generator';
import { parse, ParserOptions } from '@babel/parser';
import traverse, { TraverseOptions } from '@babel/traverse';
import t from '@babel/types';
import SourceCodeResource from '@resources/SourceCodeResource';

class JavaScript extends SourceCodeResource {
  private parserOptions: ParserOptions;
  private traverseOptions: TraverseOptions = {};
  private regeneratorRuntimeInjected: boolean = false;
  private regeneratorRequired: boolean = false;

  public async beforeTranspile() {
    await super.load();
    this.initOptions();
    this.parse();
    this.replaceEnvironment();
    this.injectRegeneratorRuntime();
  }

  public registerTraverseOption(options: TraverseOptions) {
    this.traverseOptions = { ...this.traverseOptions, ...options };
  }

  public resetTraverseOptions() {
    this.traverseOptions = {};
  }

  public traverse() {
    traverse(this.ast, this.traverseOptions);
  }

  public generate() {
    // this.removeDeadCode();
    const { code } = generate(this.ast);
    this.setContent(code);
    this.emit = true;
    this.emitted = false;
  }

  private removeDeadCode() {
    const res = transformFromAstSync(this.ast, undefined, {
      // plugins: [[require('babel-plugin-danger-remove-unused-import'), {ignore: ['react']}]],
      ast: true
    });
    this.ast = res!.ast!;
  }

  private replaceEnvironment() {
    this.registerReplaceEnvironment();
    this.traverse();
    this.traverseOptions = {};
  }

  private initOptions() {
    this.parserOptions = {
      sourceType: 'module',
      sourceFilename: this.rawPath,
      plugins: ['jsx', 'asyncGenerators', 'classProperties', 'objectRestSpread']
    };
  }

  private parse() {
    this.ast = parse(this.sourceCode, this.parserOptions);

    const res = transformFromAstSync(this.ast, undefined, {
      plugins: [require('@babel/plugin-transform-async-to-generator')],
      ast: true,
      code: false
    });

    this.ast = res!.ast!;
  }

  private injectRegeneratorRuntime() {
    if (!this.regeneratorRequired) return;
    if (this.regeneratorRuntimeInjected) return;

    this.ast.program.body.unshift(
      t.importDeclaration(
        [t.importDefaultSpecifier(t.identifier('regeneratorRuntime'))],
        t.stringLiteral('regenerator-runtime/runtime.js')
      )
    );
  }

  private registerReplaceEnvironment() {
    this.registerTraverseOption({
      MemberExpression: path => {
        const { object, property } = path.node;

        if (t.isIdentifier(property, { name: 'ANU_ENV' })) {
          if (t.isMemberExpression(object)) {
            const { object: subObject, property: subProperty } = object;

            if (t.isIdentifier(subProperty, { name: 'env' })) {
              if (t.isIdentifier(subObject, { name: 'process' })) {
                path.replaceWith(t.stringLiteral('wx'));
              }
            }
          }
        }

        if (t.isIdentifier(property, { name: 'BUILD_ENV' })) {
          if (t.isMemberExpression(object)) {
            const { object: subObject, property: subProperty } = object;

            if (t.isIdentifier(subProperty, { name: 'env' })) {
              if (t.isIdentifier(subObject, { name: 'process' })) {
                path.replaceWith(t.stringLiteral('beta'));
              }
            }
          }
        }
      },
      ImportDeclaration: path => {
        const id = path.node.source.value;

        if (id === 'regenerator-runtime/runtime.js') {
          this.regeneratorRuntimeInjected = true;
        }
      },
      FunctionDeclaration: path => {
        const id = path.node.id;

        if (id && id.name === '_asyncToGenerator') {
          this.regeneratorRequired = true;
        }
      }
    });
  }
}

export default JavaScript;
