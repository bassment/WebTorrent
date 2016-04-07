import P2P from 'socket.io-p2p';
import io from 'socket.io-client';

import React from 'react';
import ReactDOM from 'react-dom';
import _ from 'lodash';

export default class App extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      files: [],
      fileProgressMax: 0,
      fileProgressValue: 0,
      fileBuffer: [],
      fileSize: 0,
    };
  }

  componentWillMount() {
    this.socket = io();
    this.opts = { peerOpts: { trickle: false }, autoUpgrade: false };
    this.p2psocket = new P2P(this.socket, this.opts);
    this.p2psocket.on('peer-file', this.onFile);
  }

  onFile = (data) => {
    this.setState({
      fileBuffer: [
        ...this.state.fileBuffer,
        data.file,
      ],
      fileSize: this.state.fileSize + data.file.byteLength,
    });

    if (this.state.fileSize === data.fileSize) {
      const blob = new window.Blob(this.state.fileBuffer, { type: data.fileType });
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
        fileBuffer: [],
        fileSize: 0,
      });
    }
  };

  onSubmit = (e) => {
    e.preventDefault();
    const fileInput = this.refs.fileInput;
    if (fileInput.value !== '') {
      const file = fileInput.files[0];
      const fileName = file.name;
      const fileSize = file.size;
      const fileType = file.type;
      const p2psocket = this.p2psocket;

      this.setState({
        fileProgressMax: fileSize,
      });

      var chunkSize = 16384;
      var sliceFile = offset => {
        var reader = new window.FileReader();
        reader.onload = (() => {
          return evnt => {
            p2psocket.emit('peer-file', {
              file: evnt.target.result,
              fileName,
              fileSize,
              fileType,
            });
            if (file.size > offset + evnt.target.result.byteLength) {
              window.setTimeout(sliceFile, 0, offset + chunkSize);
            }

            this.setState({
              fileProgressValue: offset + evnt.target.result.byteLength,
            });
          };
        })(file);

        reader.onerror = err => {
          console.error('Error while reading file', err);
        };

        var slice = file.slice(offset, offset + chunkSize);
        reader.readAsArrayBuffer(slice);
      };

      sliceFile(0);

      fileInput.value = '';
    }
  };

  onFileChange = (e) => {
    this.setState({
      fileProgressMax: 0,
      fileProgressValue: 0,
    });
  };

  roundFileSize = (fileSize) => {
    let BYTEtoKB = Number(fileSize / 1024);
    let roundedSize = _.round(BYTEtoKB, 1);
    let withKB = roundedSize + ' KBs';
    return withKB;
  };

  getFileType = fileType => {
    let fileTypeArray =  _.split(fileType, '/', 2);
    return _.head(fileTypeArray);
  };

  getFileExtension = fileType => _.split(fileType, '/', 2).pop();

  render() {
    const links = _.map(this.state.files, (file, i) => (
      <li key={i}>
        <p><b>File Name:</b> {file.fileName}</p>
        <p><b>File Size:</b> {this.roundFileSize(file.fileSize)}</p>
        <p><b>File Type:</b> {this.getFileType(file.fileType)}</p>
        <p><b>File Extension:</b> {this.getFileExtension(file.fileType)}</p>
        <span>
          <a target="_blank" href={file.fileUrl}>Open</a> | <a download href={file.fileUrl}>Download</a>
        </span>
        <hr />
      </li>
    ));
    return (
      <div className="container">
        <div className="row">
          <h1 className="title">WebTorrent</h1>
          <div className="col-md-6 col-sm-6 col-xs-6">
            <form action="#" onSubmit={this.onSubmit}>
              <label>Select file to send</label>
              <input type="file" name="filename"
                ref="fileInput" size="40" onChange={this.onFileChange} />
              <progress value={this.state.fileProgressValue} max={this.state.fileProgressMax} />
              <br/>
              <input className="btn btn-default" type="submit" value="Submit" />
            </form>
          </div>
          <div className="col-md-6 col-sm-6 col-xs-6"></div>
        </div>
        <div className="row">
          <h3>Download files from other peers:</h3>
          <hr/>
          {
            this.state.files.length ?
            <ul>{links}</ul> :
            <h4>
              Nobody <span className="glyphicon glyphicon-floppy-save"></span> sent you a file <span className="glyphicon glyphicon-folder-open"></span>
            </h4>
          }
        </div>
      </div>
    );
  }
}
