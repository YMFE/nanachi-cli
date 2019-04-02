import { warn } from '@shared/spinner';
import chalk from 'chalk';
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
  private aliasKeys: string[] = [];

  constructor(alias: InterfaceAlias = {}) {
    this.resolve = this.resolve.bind(this);
    this.resolveSync = this.resolveSync.bind(this);
    this.initAlias(alias);
  }

  public async resolve(id: string, base: string) {
    const hit = this.searchCache(id, base);

    if (hit) return hit;

    try {
      return await this.innerResolve(id, base);
    } catch (e) {
      // 默认解析失败用别名重试
    }

    const maybeAlias = this.aliasKeys.find(key => id.startsWith(key));

    if (maybeAlias) {
      const replacementRegex = new RegExp(`^${maybeAlias}`);
      const replacementId = id.replace(
        replacementRegex,
        this.searchCache(maybeAlias, base)!.location
      );

      return this.innerResolve(replacementId, base);
    }

    throw new Error(`Cannot resolve ${id} in ${base}`);
  }

  public resolveSync(id: string, base: string) {
    const hit = this.searchCache(id, base);

    if (hit) return hit;

    const resolvedId = this.resolveAlias(id, base);

    return this.innerResolveSync(resolvedId, base);
  }

  private resolveAlias(id: string, base: string) {
    const maybeAlias = this.aliasKeys.find(key => id.startsWith(key));

    if (maybeAlias) {
      const replacementRegex = new RegExp(`^${maybeAlias}`);
      const replacementId = id.replace(
        replacementRegex,
        this.searchCache(maybeAlias, base)!.location
      );

      return replacementId;
    }

    return id;
  }

  private innerResolveSync(id: string, base: string) {
    const location = resolve.sync(id, { basedir: base });
    const result = this.buildResolveResult(id, base, location);
    this.caches.push(result);
    return result;
  }

  private buildResolveResult(
    id: string,
    base: string,
    location: string,
    type: TypeResolveCache = 'resolve'
  ) {
    const resolveResult: InterfaceResolveCache = {
      id,
      base,
      location,
      type
    };

    return resolveResult;
  }

  private async innerResolve(
    id: string,
    base: string
  ): Promise<InterfaceResolveCache> {
    return new Promise((promiseResolve, reject) => {
      resolve(id, { basedir: base }, (err, location) => {
        if (err) return reject(err);

        if (location === undefined) return reject(err);

        const resolveResult = this.buildResolveResult(id, base, location);

        promiseResolve(resolveResult);

        this.caches.push(resolveResult);
      });
    });
  }

  private initAlias(alias: InterfaceAlias) {
    Object.keys(alias).forEach(key => {
      if (this.aliasKeys.find(aliasKey => aliasKey === key)) {
        return warn(
          chalk`{bold Duplicated alias ({yellow ${key}, alias of ${
            alias[key]
          }}) found.}`
        );
      }

      this.aliasKeys.push(key);
      this.caches.push(this.buildResolveResult(key, '', alias[key], 'alias'));
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
