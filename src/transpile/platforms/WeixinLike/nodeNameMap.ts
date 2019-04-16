import blockElements from './blockElements';
import builtInElements from './builtInElements';
import inlineElements from './inlineElements';

function transform(nodeName: string) {
  switch (true) {
    case builtInElements[nodeName]:
    case /^[A-Z]/.test(nodeName):
      return nodeName;

    case inlineElements[nodeName]:
      return 'text';

    case blockElements[nodeName]:
      return 'view';

    default:
      return 'view';
  }
}

export default transform;
