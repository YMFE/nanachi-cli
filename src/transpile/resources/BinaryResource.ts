import fs from 'fs-extra';
import FileResource from './FileResource';
import { ResourceState } from './Resource';

class BinaryResource extends FileResource {
  public process() {
    this.state = ResourceState.Emit;
  }

  public async write() {
    await fs.ensureFile(this.destPath);

    return new Promise((resolve, reject) => {
      const readableStream = fs.createReadStream(this.rawPath);
      const writableStream = fs.createWriteStream(this.destPath);
      readableStream.pipe(writableStream);
      readableStream.on('close', () => {
        this.state = ResourceState.Emitted;
        resolve();
      });
      writableStream.on('error', () => {
        this.state = ResourceState.Error;
        reject();
      });
    });
  }
}

export default BinaryResource;
