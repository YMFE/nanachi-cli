import { File } from '@babel/types';
import ReadableResource from './ReadableResource';
import WritableResource from './WritableResource';

class SourceCodeResource extends ReadableResource {
  public sourceCode: string;
  public ast: File;
  public sourceMap: object;
  public writableResource: WritableResource;
}

export default SourceCodeResource;
