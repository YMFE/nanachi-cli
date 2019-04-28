import { transformFromAstSync } from '@babel/core';
import { NodePath } from '@babel/traverse';
import t from '@babel/types';
import nodeNameMap from '@platforms/WeixinLike/nodeNameMap';
import Template from '@platforms/WeixinLike/Template';
import DuplexResource from '@resources/DuplexResource';
import { ResourceState } from '@resources/Resource';
import generate from '@shared/generate';
import reportError from '@shared/reportError';
import { transformArrowFunctionToBindFunction } from '@shared/transform';
import uid from '@shared/uid';
import { relative } from 'path';
import JavaScript from './JavaScript';

class Stateless extends JavaScript {
  private renderMethod: t.FunctionDeclaration;
  private configObject: any = { component: true };

  public async prepare() {
    await super.prepare();
  }

  public register() {
    // this.registerAttrName();
    this.registerTransformStateless();
    this.registerRemoveImport();
    this.registerComponent();
  }

  public async process() {
    await this.prepare();
    this.register();
    // this.injectReactLibrary();
    this.generate();
    this.deriveTemplate();
    // this.deriveJSON();
  }

  private registerRemoveImport() {
    this.transform({
      ImportDeclaration: path => {
        path.remove();
      }
    });
  }

  private registerComponent() {
    this.transform({
      ExportDefaultDeclaration: path => {
        const { declaration } = path.node;
        let { id } = declaration as t.FunctionDeclaration;

        if (id == null) {
          id = t.identifier('Stateless');
        }

        const name = id.name;
        path.insertBefore(declaration);
        path.insertBefore(
          t.expressionStatement(
            t.callExpression(t.identifier('Component'), [
              t.callExpression(
                t.memberExpression(
                  t.identifier('React'),
                  t.identifier('registerComponent')
                ),
                [id, t.stringLiteral(name)]
              )
            ])
          )
        );
        path.node.declaration = id;
      }
    });
  }

  private registerTransformStateless() {
    this.transform({
      FunctionDeclaration: {
        enter: path => {
          const { id } = path.node;

          if (id !== null) {
            const { name } = id;
            const regexStartsWithCapitalizedLetter = /^[A-Z]/;

            if (regexStartsWithCapitalizedLetter.test(name)) {
              this.renderMethod = path.node;
            }
          }
        },
        exit: path => {
          // this.transformArrayMap(path);
          // this.transformReact(path);
        }
      }
    });
  }

  private deriveTemplate() {
    const template = new Template({
      renderMethod: this.renderMethod,
      creator: this,
      rawPath: this.pathWithoutExt + '.wxml',
      transpiler: this.transpiler,
      configObject: this.configObject
    });

    template.process();

    this.transpiler.addResource(template.rawPath, template);
  }
}

export default Stateless;
