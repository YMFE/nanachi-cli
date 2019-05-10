import Transpiler from '@transpiler/Transpiler';
import chalk from 'chalk';
import resolve from 'resolve';
import platformSpecificRuntimeName from './platformSpecificRuntimeName';

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
    this.setAlias(alias);
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
    await this.prepareReactRuntime();
  }

  public setAlias(alias: InterfaceAlias) {
    Object.keys(alias).forEach(key => {
      if (this.aliasKeys.find(aliasKey => aliasKey === key)) {
        // tslint:disable-next-line: no-console
        return console.log(
          chalk`
{bold Duplicated alias:
    ({yellow ${key} --> ${alias[key]}})
The following alias has been set:
    ({green ${key} --> ${this.searchCache(key)!.location}})}`
        );
      }

      this.aliasKeys.push(key);
      this.caches.push(this.buildResolveResult(key, alias[key], 'alias'));
    });
  }

  private async prepareRegeneratorRuntime() {
    const id = 'regenerator-runtime/runtime.js';
    await this.resolve(id, this.transpiler.transpilerRoot);

    this.aliasKeys.push(id);
    this.caches.find(cache => cache.id === id)!.type = 'alias';
  }

  private async prepareReactRuntime() {
    const id = `nanachi-runtime/runtime/${
      platformSpecificRuntimeName[this.transpiler.platform]
    }`;
    await this.resolve(id, this.transpiler.transpilerRoot);

    this.aliasKeys.push(id);
    this.caches.find(cache => cache.id === id)!.type = 'alias';
    this.caches.find(cache => cache.id === id)!.id = '@react';
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

  private searchCache(id: string, base?: string) {
    const hit = this.caches.find(cache => cache.id === id);

    if (hit) {
      if (hit.type === 'alias') return hit;
      if (hit.base === base) return hit;
    }
  }
}

export default ResolveServices;
