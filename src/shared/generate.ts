import generate, { GeneratorOptions } from '@babel/generator';
import { Node } from '@babel/types';

export default function(ast: Node, options?: GeneratorOptions) {
  return generate(ast, options).code;
}
