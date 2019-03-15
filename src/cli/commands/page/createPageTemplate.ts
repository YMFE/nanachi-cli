export default function() {
  return `
    import React from '@react';

    class Page extends React.Component {
        constructor(){
            super();
            this.state = {
                text: 'hello, nanachi'
            };
        }
        componentDidMount() {
            console.log('Page did mount!');
        }
        componentWillMount() {
            console.log('Page will mount!');
        }
        render() {
            return (
                <div>
                    {this.state.text}
                </div>
            );
        }
    }

    export default Page;
    `;
}
