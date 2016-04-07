import P2P from 'socket.io-p2p';
import io from 'socket.io-client';

import React from 'react';
import ReactDOM from 'react-dom';

export default class App extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      files: [],
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
    const blob = new window.Blob([fileBytes], { type: data.fileType });
    const urlCreator = window.URL || window.webkitURL;
    const fileUrl = urlCreator.createObjectURL(blob);
    this.setState({
      files: [
        ...this.state.files, {
        fileUrl,
        fileName: data.fileName,
        fileSize: data.fileSize,
        fileType: data.fileType,
      },
    ],
    });
  };

  onSubmit = (e) => {
    e.preventDefault();
    const fileInput = this.refs.fileInput;
    if (fileInput.value !== '') {
      const fileName = fileInput.files[0].name;
      const fileSize = fileInput.files[0].size;
      const fileType = fileInput.files[0].type;
      const p2psocket = this.p2psocket;
      let reader = new window.FileReader();
      reader.onload = function (evnt) {
        p2psocket.emit('peer-file', {
          file: evnt.target.result,
          fileName,
          fileSize,
          fileType,
        });
      };

      reader.onerror = function (err) {
        console.error('Error while reading file', err);
      };

      reader.readAsArrayBuffer(fileInput.files[0]);

      fileInput.value = '';
    }
  };

  render() {
    const links = this.state.files.map((file, i) => (
      <li key={i}>
        <p><b>File Name:</b> {file.fileName}</p>
        <p><b>File Size:</b> {Number((file.fileSize / 1024).toFixed(1))} KBs</p>
        <p><b>File Type:</b> {file.fileType}</p>
        <span>
          <a target="_blank" href={file.fileUrl}>Open</a> | <a download href={file.fileUrl}>Download</a>
        </span>
        <hr />
      </li>
    ));
    return (
      <div className="container">
        <h1 className="title">Hello</h1>
        <form action="#" onSubmit={this.onSubmit}>
          <label>Select file to send</label>
          <input type="file" name="filename" ref="fileInput" size="40" />
          <progress value="1" max="100"/>
          <br/>
          <input className="btn btn-default" type="submit" value="Submit" />
        </form>
          <ul>
            { links }
          </ul>
      </div>
    );
  }
}
