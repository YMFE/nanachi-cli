interface IPlatformExtension {
  template: string;
  style: string;
  script: string;
}

interface IPlatformExtensions {
  [platform: string]: IPlatformExtension;
}

const wx: IPlatformExtension = {
  template: '.wxml',
  script: '.js',
  style: '.wxss'
};

const ali: IPlatformExtension = {
  template: '.axml',
  script: '.js',
  style: '.acss'
};

const bu: IPlatformExtension = {
  template: '.swan',
  script: '.js',
  style: '.css'
};

const platformExtensions: IPlatformExtensions = {
  wx,
  ali,
  bu
};

export default platformExtensions;
