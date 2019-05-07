import { NodePath, TraverseOptions } from '@babel/traverse';
import t, { JSXOpeningElement } from '@babel/types';
import JavaScriptClass from '@languages/javascript/JavaScriptClass';
import Style from '@languages/style/Style';
import BinaryResource from '@resources/BinaryResource';
import { ResourceState } from '@resources/Resource';
import generate from '@shared/generate';
import reportError from '@shared/reportError';
import uid from '@shared/uid';
import { relative } from 'path';
import nodeNameMap from './nodeNameMap';
import platformExtensions from './platformSpecificExtensions';
import Template from './Template';

class WeixinLikeComponentOrPage extends JavaScriptClass {
  private imports: string[] = [];

  public async process() {
    await super.process();
    this.transformConfigToObject();
    this.appendWeixinLikeTransformations();
    await this.applyTransformations();
    await this.waitUntilAsyncProcessesCompleted();
    this.deriveClassTemplate();
    this.generate();
    this.deriveJSON();
  }

  private get relativePathToSourceRoot() {
    const relativePathToSourceRoot = relative(
      this.transpiler.projectSourceDirectory,
      this.rawPath
    );

    return relativePathToSourceRoot;
  }

  private get isComponent() {
    return this.relativePathToSourceRoot.startsWith('components');
  }

  private get className() {
    return this.classIdentifier.name;
  }

  private appendWeixinLikeTransformations() {
    this.appendTransformation(this.registerNativeAndRemoveImports);
    this.appendTransformation(this.processResources);
    this.appendTransformation(this.transformMapCall);
    this.appendTransformation(this.transformComponentToReactUseComponent);
    this.appendTransformation(this.transformStateJSXToReact);
    this.appendTransformation(this.replaceClassDeclaration);
  }

  private registerExport() {
    if (this.isComponent) return this.visitorsOfRegisterNativeComponent();
    return this.visitorsOfRegisterNativePage();
  }

  private registerNativeAndRemoveImports() {
    const visitors = {
      ...this.registerExport(),
      ...this.visitorsOfRegisterAttrName(),
      ...this.visitorsOfRemoveUnnecessaryImport()
    };

    this.transform(visitors);
  }

  private visitorsOfRemoveUnnecessaryImport(): TraverseOptions {
    return {
      ImportDeclaration: importPath => {
        const id = importPath.node.source.value;
        const { specifiers } = importPath.node;

        this.imports.push(id);

        if (id === '@react') {
          return importPath.remove();
        }

        if (id.endsWith('.scss')) {
          return importPath.remove();
        }

        if (id.endsWith('.less')) {
          return importPath.remove();
        }

        if (specifiers.length === 1) {
          const [specifier] = specifiers;

          if (t.isImportDefaultSpecifier(specifier)) {
            const { local } = specifier;

            if (
              t.isIdentifier(this.superClass) &&
              local.name === this.superClass.name
            ) {
              return;
            }
          }
        }

        const delayRemove = async () => {
          const { location } = await this.resolve(id, this.dir);
          const { location: componentsDir } = await this.resolve(
            '@components'
          );
          if (location.startsWith(componentsDir)) {
            importPath.remove();
          } else {
            const resource = this.transpiler.spawnResource(location);

            if (resource.state !== ResourceState.Emit) await resource.process();

            importPath.node.source.value = this.relativeOfDestDirTo(
              resource.destPath
            );
          }
        };
        this.appendAsyncProcess(delayRemove());
      }
    };
  }

  private visitorsOfRegisterNativeComponent(): TraverseOptions {
    return {
      ExportDefaultDeclaration: path => {
        path.insertBefore(
          t.expressionStatement(
            t.callExpression(t.identifier('Component'), [
              t.callExpression(
                t.memberExpression(
                  t.identifier('React'),
                  t.identifier('registerComponent')
                ),
                [this.classIdentifier, t.stringLiteral(this.className)]
              )
            ])
          )
        );
      }
    };
  }

  private visitorsOfRegisterNativePage(): TraverseOptions {
    return {
      ExportDefaultDeclaration: path => {
        path.insertBefore(
          t.expressionStatement(
            t.callExpression(t.identifier('Page'), [
              t.callExpression(
                t.memberExpression(
                  t.identifier('React'),
                  t.identifier('registerPage')
                ),
                [
                  this.classIdentifier,
                  t.stringLiteral(this.relativePathToSourceRoot)
                ]
              )
            ])
          )
        );
      }
    };
  }

  private processResources() {
    const resourceProcesses = this.imports.map(async id => {
      if (id === '@react') {
        return this.injectReactLibrary();
      }

      if (id.endsWith('.scss')) {
        const { location } = await this.resolve(id, this.dir);
        const style = new Style({
          rawPath: location,
          transpiler: this.transpiler
        });
        this.transpiler.addResource(location, style);
        return style.process();
      }

      const { location: componentLocation } = await this.resolve(
        id,
        this.dir
      );

      if (this.transpiler.resources.get(componentLocation)) return;
      const javascript = this.transpiler.spawnResource(componentLocation);
      await javascript.process();
    });

    this.appendAsyncProcess(Promise.all(resourceProcesses));
  }

  private deriveClassTemplate() {
    this.configObject = this.isComponent
      ? { component: true }
      : this.configObject;

    const template = new Template({
      renderMethod: this.renderMethod,
      creator: this,
      rawPath:
        this.pathWithoutExt +
        platformExtensions[this.platform].template,
      transpiler: this.transpiler,
      configObject: this.configObject
    });

    template.process();
    template.state = ResourceState.Emit;

    this.transpiler.addResource(template.rawPath, template);
  }

  private addEventUidAndBeacon(
    path: NodePath<t.JSXAttribute>,
    eventName: string
  ) {
    const openingElement = path.findParent(t.isJSXOpeningElement)
      .node as JSXOpeningElement;
    const { name, attributes } = openingElement;
    const { platform } = this.transpiler;
    const nodeName = (name as t.JSXIdentifier).name;
    const eventAttribute = attributes.find(attribute => {
      if (t.isJSXAttribute(attribute)) {
        const { name: attributeName } = attribute;
        if (t.isJSXIdentifier(attributeName)) {
          const eventRegex = new RegExp(`^(on|catch)${eventName}$`);

          if (eventRegex.test(attributeName.name)) {
            return true;
          }
        }
      }
      return false;
    });

    switch (eventName) {
      case 'Click':
      case 'Tap':
        eventName =
          platform === 'quick' || platform === 'web' ? 'Click' : 'Tap';

        break;

      case 'ScrollToLower':
        if (eventName === 'ScrollToLower') {
          eventName = 'ScrollBottom';
        }
        break;

      case 'ScrollToUpper':
        if (eventName === 'ScrollToUpper') {
          eventName = 'ScrollTop';
        }
        break;

      case 'Change':
        if (nodeName === 'input' || nodeName === 'textarea') {
          if (platform !== 'quick') {
            eventName = 'Input';
          }
        }
        break;

      default:
        break;
    }

    (eventAttribute! as t.JSXAttribute).name = t.jsxIdentifier(
      `on${eventName}`
    );

    openingElement.attributes.push(
      t.jsxAttribute(
        t.jsxIdentifier(`data-${eventName.toLocaleLowerCase()}-uid`),
        t.stringLiteral(uid.next())
      ),
      t.jsxAttribute(
        t.jsxIdentifier('data-beacon-uid'),
        t.stringLiteral('default')
      )
    );
  }

  private replaceAttributeName(path: NodePath<t.JSXAttribute>) {
    const { node } = path.get('name');

    if (t.isJSXIdentifier(node)) {
      switch (true) {
        case node.name === 'className':
          node.name = 'class';
          break;

        case /^catch[A-Z]/.test(node.name):
          this.addEventUidAndBeacon(path, node.name.slice(5));
          break;

        case /^on[A-Z]/.test(node.name):
          this.addEventUidAndBeacon(path, node.name.slice(2));

        default:
          break;
      }
    }
  }

  private replaceAssetsPath(path: NodePath<t.JSXAttribute>) {
    const { node: attributeName } = path.get('name');
    const { node: attributeValue } = path.get('value');

    if (t.isJSXIdentifier(attributeName)) {
      if (attributeName.name === 'src') {
        if (t.isStringLiteral(attributeValue)) {
          const id = attributeValue.value;
          switch (true) {
            case /^https?:\/\//.test(attributeValue.value):
              break;

            case !id.startsWith('{{'):
              const copy = async () => {
                const { location } = await this.resolve(
                  id,
                  this.dir
                );
                const imageResource = new BinaryResource({
                  rawPath: location,
                  transpiler: this.transpiler
                });
                this.transpiler.addResource(location, imageResource);
                await imageResource.process();
                attributeValue.value = this.relativeOfSourceDirTo(location);
              };
              this.appendAsyncProcess(copy());
              break;

            default:
              break;
          }
        }
      }
    }
  }

  private replaceStyle(path: NodePath<t.JSXAttribute>) {
    const { node: attributeName } = path.get('name');
    const { node: attributeValue } = path.get('value');

    if (t.isJSXIdentifier(attributeName)) {
      if (attributeName.name === 'style') {
        if (t.isJSXExpressionContainer(attributeValue)) {
          const { expression } = attributeValue;

          switch (true) {
            case t.isIdentifier(expression) ||
              t.isMemberExpression(expression) ||
              t.isObjectExpression(expression):
              path
                .get('value')
                .replaceWith(
                  t.jsxExpressionContainer(
                    t.callExpression(
                      t.memberExpression(
                        t.identifier('React'),
                        t.identifier('toStyle')
                      ),
                      [
                        expression as t.Identifier,
                        t.memberExpression(
                          t.thisExpression(),
                          t.identifier('props')
                        ),
                        t.stringLiteral(uid.next())
                      ]
                    )
                  )
                );

              break;

            default:
              if (t.isStringLiteral(expression)) return;
              if (t.isCallExpression(expression)) {
                if (t.isMemberExpression(expression.callee)) {
                  if (
                    t.isIdentifier(expression.callee.object, {
                      name: 'React'
                    })
                  ) {
                    return;
                  }
                }
              }

              this.state = ResourceState.Error;
              this.error = new Error(
                `Props "style"'s value's type should be one of ` +
                  `Identifier, MemberExpression or ObjectExpression,` +
                  ` got "${generate(expression)}" at line ${
                    expression.loc ? expression.loc.start.line : 'unknown'
                  }`
              );
              reportError(this);
              break;
          }
        }
      }
    }
  }

  private visitorsOfRegisterAttrName(): TraverseOptions {
    return {
      JSXAttribute: path => {
        this.replaceAttributeName(path);
        this.replaceAssetsPath(path);
        this.replaceStyle(path);
      },
      JSXElement: path => {
        const openingElement = path.get('openingElement');
        const closingElement = path.get('closingElement');
        const openingNode = openingElement.get('name').node;

        if (t.isJSXIdentifier(openingNode)) {
          const openingNodeName = openingNode.name;
          const mappedOpeningNodeName = nodeNameMap(openingNodeName);

          openingNode.name = mappedOpeningNodeName;
          this.replacingClosingElementWithName(
            closingElement,
            mappedOpeningNodeName
          );
        }
      }
    };
  }

  private transformComponentToReactUseComponent() {
    this.transform({
      JSXElement: path => {
        this.transformIfNodeIsComponent(path);
      }
    });
  }

  private transformIfNodeIsComponent(path: NodePath<t.JSXElement>) {
    const {
      node: {
        openingElement,
        openingElement: { attributes },
        closingElement
      }
    } = path;

    if (t.isJSXOpeningElement(openingElement)) {
      if (t.isJSXIdentifier(openingElement.name)) {
        const rawName = openingElement.name.name;

        if (/^[A-Z]/.test(rawName)) {
          const useComponentNode = t.jsxMemberExpression(
            t.jsxIdentifier('React'),
            t.jsxIdentifier('useComponent')
          );

          openingElement.name = useComponentNode;

          if (closingElement) {
            closingElement.name = useComponentNode;
          }

          const callback = path.findParent(t.isCallExpression);
          let instanceUidValue: t.Node;

          if (callback) {
            const { params } = (callback as any).node.arguments[0];
            const [, indexNode] = params;

            instanceUidValue = t.binaryExpression(
              '+',
              t.stringLiteral(uid.next()),
              t.identifier(indexNode.name)
            );
          } else {
            instanceUidValue = t.stringLiteral(uid.next());
          }

          attributes.push(
            t.jsxAttribute(
              t.jsxIdentifier('data-instance-uid'),
              t.jsxExpressionContainer(instanceUidValue)
            )
          );

          attributes.push(
            t.jsxAttribute(t.jsxIdentifier('is'), t.stringLiteral(rawName))
          );
        }
      }
    }
  }

  private replacingClosingElementWithName(
    closingElement: NodePath<t.JSXClosingElement | null>,
    name: string
  ) {
    if (t.isJSXClosingElement(closingElement)) {
      const closingNode = closingElement.node;

      if (t.isJSXClosingElement(closingNode)) {
        const closingName = closingNode.name;

        if (t.isJSXIdentifier(closingName)) {
          closingName.name = name;
        }
      }
    }
  }
}

export default WeixinLikeComponentOrPage;
