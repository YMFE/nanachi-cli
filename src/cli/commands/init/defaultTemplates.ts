import { InterfaceTemplatesManager } from './TemplatesManager';

const DEFAULT_TEMPLATES: InterfaceTemplatesManager = {
  qunar: {
    id: 'qunar',
    name: '去哪儿',
    description: '去哪儿网默认模板',
    repositoryUrl: 'https://github.com/YMFE/nanachi-template-qunar.git',
    checkout: 'master'
  },
  music: {
    id: 'music',
    name: '音乐应用',
    description: '网易云音乐风格音乐应用',
    repositoryUrl: 'https://github.com/YMFE/nanachi-template-music.git',
    checkout: 'master'
  },
  merchant: {
    id: 'merchant',
    name: '在线商户',
    description: '类拼多多在线商户应用',
    repositoryUrl: 'https://github.com/YMFE/nanachi-template-merchant.git',
    checkout: 'master'
  },
  hello: {
    id: 'hello',
    name: '基础',
    description: '纯净模板',
    repositoryUrl: 'https://github.com/YMFE/nanachi-template-hello.git',
    checkout: 'master'
  }
};

export default DEFAULT_TEMPLATES;
