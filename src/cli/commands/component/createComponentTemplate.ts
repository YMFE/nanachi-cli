export default function(componentName: string) {
  return `
  import React from '@react';

  class ${componentName} extends React.Component {
      constructor(){
          super();
          this.state = {
              text: 'hello, nanachi'
          };
      }
      componentDidMount() {
          console.log('component ${componentName} did mount!');
      }
      componentWillMount() {
          console.log('component ${componentName} will mount!');
      }
      render() {
          return (
              <div>
                  {this.state.text}
              </div>
          );
      }
  }

  export default ${componentName};
  `;
}
