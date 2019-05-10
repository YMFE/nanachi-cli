interface IPlatformSpecificRuntimeName {
  [platform: string]: string;
}

export const platformDisplay: IPlatformSpecificRuntimeName = {
  wx: '微信小程序',
  ali: '支付宝小程序',
  bu: '百度小程序',
  quick: '快应用'
};

const platformSpecificRuntimeName: IPlatformSpecificRuntimeName = {
  wx: 'ReactWX.js',
  ali: 'ReactAli.js',
  bu: 'ReactBu.js',
  quick: 'ReactQuick.js'
};

export default platformSpecificRuntimeName;
