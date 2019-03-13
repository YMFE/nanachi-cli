export default `
import React from '@react';
class Fs extends React.Component {
    constructor(){
        super();
        this.state = {
            text: 'hello, nanachi'
        };
    }
    componentDidMount() {
        console.log('page did mount!');
    }
    componentWillMount() {
        console.log('page will mount!');
    }
    render() {
        return (
            <div>
                {this.state.text}
            </div>
        );
    }
}
export default Fs;
`;
