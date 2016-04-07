import P2P from 'socket.io-p2p';
import io from 'socket.io-client';

import React from 'react';
import ReactDOM from 'react-dom';

export default class App extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      fileUrl: '',
      fileName: '',
    };
  }

  componentWillMount() {
    this.socket = io();
    this.opts = { peerOpts: { trickle: false }, autoUpgrade: false };
    this.p2psocket = new P2P(this.socket, this.opts);
    this.p2psocket.on('peer-file', this.onFile);
  }

  onFile = (data) => {
    const fileBytes = new Uint8Array(data.file);
    const blob = new window.Blob([fileBytes], { type: 'audio/mp3' });
    const urlCreator = window.URL || window.webkitURL;
    const fileUrl = urlCreator.createObjectURL(blob);
    this.setState({
      fileUrl,
      fileName: 'New file',
    });
  };

  onSubmit = (e) => {
    e.preventDefault();
    let fileInput = this.refs.fileInput.value;
    let p2psocket = this.p2psocket;
    if (fileInput !== '') {
      let reader = new window.FileReader();
      reader.onload = function (evnt) {
        p2psocket.emit('peer-file', { file: evnt.target.result });
      };

      reader.onerror = function (err) {
        console.error('Error while reading file', err);
      };

      reader.readAsArrayBuffer(this.refs.fileInput.files[0]);
    }

    fileInput = '';
  };

  render() {
    return (
      <div className="container">
        <h1 className="title">Hello</h1>
        <form action="#" onSubmit={this.onSubmit}>
          <label>Select file to send</label>
          <input type="file" name="filename" ref="fileInput" size="40" />
          <br/>
          <input className="btn btn-default" type="submit" value="Submit" />
        </form>
        <ul>
          <li>
            <a target="_blank" href={this.state.fileUrl}>
              {this.state.fileName}
            </a>
          </li>
        </ul>
      </div>
    );
  }
}
