import { warn } from '@shared/spinner';
import Transpiler from '@transpiler/Transpiler';
import chalk from 'chalk';
import resolve from 'resolve';

type TypeResolveCache = 'alias' | 'resolve';

interface InterfaceResolveCache {
  id: string;
  base?: string;
  location: string;
  type: TypeResolveCache;
}

interface InterfaceAlias {
  [alias: string]: string;
}

class ResolveServices {
  private caches: InterfaceResolveCache[] = [];
  private aliasKeys: string[] = [];
  private transpiler: Transpiler;

  constructor(alias: InterfaceAlias = {}, transpiler: Transpiler) {
    this.resolve = this.resolve.bind(this);
    this.transpiler = transpiler;
    this.initAlias(alias);
  }

  public async resolve(id: string, base?: string) {
    const normalizedId = id.startsWith('/') ? `.${id}` : id;
    const hit = this.searchCache(normalizedId, base);

    if (hit) return hit;

    try {
      return await this.resolveImplement(normalizedId, base);
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

      return this.resolveImplement(replacementId, base);
    }

    throw new Error(`Cannot resolve ${id} in ${base}`);
  }

  public async init() {
    await this.prepareRegeneratorRuntime();
  }

  private async prepareRegeneratorRuntime() {
    const id = 'regenerator-runtime/runtime.js';
    await this.resolve(
      'regenerator-runtime/runtime.js',
      this.transpiler.transpilerRoot
    );

    this.aliasKeys.push(id);
    this.caches.find(cache => cache.id === id)!.type = 'alias';
  }

  private buildResolveResult(
    id: string,
    location: string,
    type: TypeResolveCache = 'resolve',
    base?: string
  ) {
    const resolveResult: InterfaceResolveCache = {
      id,
      base,
      location,
      type
    };

    return resolveResult;
  }

  private async resolveImplement(
    id: string,
    base?: string
  ): Promise<InterfaceResolveCache> {
    return new Promise((promiseResolve, reject) => {
      resolve(id, { basedir: base }, (err, location) => {
        if (err) return reject(err);

        if (location === undefined) return reject(err);

        const resolveResult = this.buildResolveResult(
          id,
          location,
          'resolve',
          base
        );

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
      this.caches.push(this.buildResolveResult(key, alias[key], 'alias'));
    });
  }

  private searchCache(id: string, base?: string) {
    const hit = this.caches.find(cache => cache.id === id);

    if (hit) {
      if (hit.type === 'alias') return hit;
      if (hit.base === base) return hit;
    }
  }
}

export default ResolveServices;
