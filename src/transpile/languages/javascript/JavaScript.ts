import { transformFromAstSync } from '@babel/core';
import generate from '@babel/generator';
import { parse, ParserOptions } from '@babel/parser';
import traverse, { TraverseOptions } from '@babel/traverse';
import t from '@babel/types';
import DuplexResource from '@resources/DuplexResource';
import { ResourceState } from '@resources/Resource';

type TypeAsyncTransformation = () => Promise<void>;
type TypeSyncTransformation = () => void;
type TypeTransformation = TypeAsyncTransformation | TypeSyncTransformation;

class JavaScript extends DuplexResource {
  protected ast: t.File;

  private parserOptions: ParserOptions;
  private regeneratorRequired: boolean = false;

  private transformations: TypeTransformation[] = [];
  private asyncTransformationProcesses: Array<Promise<void>> = [];

  public async prepare() {
    await this.read();
    this.initOptions();
    this.parse();
  }

  public async process() {
    await this.prepare();
    this.registerJavaScriptTransformations();
    await this.applyTransformations();
    await this.waitUntilAsyncProcessesCompleted();
  }

  public appendTransformation(transform: TypeTransformation) {
    this.transformations.push(transform);
  }

  public appendAsyncProcess(process: Promise<any>) {
    this.asyncTransformationProcesses.push(process);
  }

  public generate() {
    const { code } = generate(this.ast);
    this.utf8Content = code;
    this.state = ResourceState.Emit;
  }

  public transform(traverseOptions: TraverseOptions) {
    traverse(this.ast, traverseOptions);
  }

  public async waitUntilAsyncProcessesCompleted() {
    await Promise.all(this.asyncTransformationProcesses);
    this.emptyAsyncProcesses();
  }

  public async applyTransformations() {
    for (const transformation of this.transformations) {
      await transformation.call(this);
    }
    this.emptyTransformations();
  }

  private emptyAsyncProcesses() {
    this.asyncTransformationProcesses = [];
  }

  private emptyTransformations() {
    this.transformations = [];
  }

  private registerJavaScriptTransformations() {
    this.appendTransformation(this.locateAsyncToGenerator);
    this.appendTransformation(this.injectRegeneratorRuntimeWhenNeeded);
    this.appendTransformation(this.replaceEnv);
  }

  private replaceEnv() {
    this.transform({
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
      }
    });
  }

  private initOptions() {
    this.parserOptions = {
      sourceType: 'module',
      sourceFilename: this.rawPath,
      plugins: ['jsx', 'asyncGenerators', 'classProperties', 'objectRestSpread']
    };
  }

  private parse() {
    this.ast = parse(this.utf8Content, this.parserOptions);

    const res = transformFromAstSync(this.ast, undefined, {
      plugins: [require('@babel/plugin-transform-async-to-generator')],
      ast: true,
      code: false
    });

    this.ast = (res as any).ast;
  }

  private injectRegeneratorRuntimeWhenNeeded() {
    if (this.regeneratorRequired) {
      this.ast.program.body.unshift(
        t.importDeclaration(
          [t.importDefaultSpecifier(t.identifier('regeneratorRuntime'))],
          t.stringLiteral('regenerator-runtime/runtime.js')
        )
      );
    }
  }

  private locateAsyncToGenerator() {
    this.transform({
      FunctionDeclaration: path => {
        const id = path.node.id;

        if (id && id.name === '_asyncToGenerator') {
          this.regeneratorRequired = true;
          path.stop();
        }
      }
    });
  }
}

export default JavaScript;
