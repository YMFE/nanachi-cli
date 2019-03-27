import resolve from 'resolve';

type TypeResolveCache = 'alias' | 'resolve';

interface InterfaceResolveCache {
  id: string;
  base: string;
  location: string;
  type: TypeResolveCache;
}

interface InterfaceAlias {
  [alias: string]: string;
}

class ResolveServices {
  private caches: InterfaceResolveCache[] = [];

  constructor(alias: InterfaceAlias = {}) {
    this.resolve = this.resolve.bind(this);
    this.initAlias(alias);
  }

  public async resolve(
    id: string,
    base: string
  ): Promise<InterfaceResolveCache> {
    return new Promise((promiseResolve, reject) => {
      const hit = this.searchCache(id, base);

      if (hit) return promiseResolve(hit);

      resolve(id, { basedir: base }, (err, location) => {
        if (err) return reject(err);

        if (location === undefined) return reject(err);

        const resolveResult: InterfaceResolveCache = {
          id,
          base,
          location,
          type: 'resolve'
        };

        promiseResolve(resolveResult);

        this.caches.push(resolveResult);
      });
    });
  }

  private initAlias(alias: InterfaceAlias) {
    Object.keys(alias).forEach(key => {
      this.caches.push({
        id: key,
        base: '',
        location: alias[key],
        type: 'alias'
      });
    });
  }

  private searchCache(id: string, base: string) {
    const hit = this.caches.find(cache => cache.id === id);

    if (hit) {
      if (hit.type === 'alias') return hit;
      if (hit.base === base) return hit;
    }
  }
}

export default ResolveServices;
