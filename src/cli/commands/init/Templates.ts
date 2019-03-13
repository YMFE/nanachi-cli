import { start, stop } from '@shared/spinner';
import axios from 'axios';
import chalk from 'chalk';
import DEFAULT_TEMPLATES from './defaultTemplates';

interface InterfaceTemplateItem {
  id: string;
  name: string;
  description: string;
  repositoryUrl: string;
  checkout: string;
}

export interface InterfaceTemplates {
  [template: string]: InterfaceTemplateItem;
}

class Templates {
  private static remoteTemplatesUrl: string =
    'https://raw.githubusercontent.com/YMFE/nanachi-templates/master/templates.json';
  private static fetchingRemoteTemplatesTimeout: number = 3000;
  public templates: InterfaceTemplates = DEFAULT_TEMPLATES;

  public async retrieveRemoteTemplates() {
    start(
      chalk`{bold Retrieving remote templates from {cyan.underline ${
        Templates.remoteTemplatesUrl
      }}}`
    );

    try {
      const { data } = await axios.get(Templates.remoteTemplatesUrl, {
        timeout: Templates.fetchingRemoteTemplatesTimeout
      });

      this.templates = {
        ...this.templates,
        ...data
      };
      stop(chalk`{green.bold Using latest remote templates.}`);
    } catch (e) {
      stop(
        chalk`{yellow.bold Unable to retrieve remote templates({underline ${
          Templates.remoteTemplatesUrl
        }}), using offline templates.}`
      );
    }
  }
}

export default Templates;
