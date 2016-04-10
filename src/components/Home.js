import P2P from 'socket.io-p2p';
import io from 'socket.io-client';

import React from 'react';
import ReactDOM from 'react-dom';

import _ from 'lodash';
import uuid from 'uuid';

export default class App extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      files: [],
      mySocketId: '',
      username: '',
      userEnterLeaveMessage: '',
    };
  }

  componentWillMount() {
    this.socket = io();
    this.opts = { peerOpts: { trickle: false }, autoUpgrade: false };
    this.p2psocket = new P2P(this.socket, this.opts);
    this.p2psocket.on('get-socket-id', this.onGetSocketId);
    this.p2psocket.on('user-list', this.onUserList);
    this.p2psocket.on('new-user', this.onNewUser);
    this.p2psocket.on('disconnect-user', this.onDisconnectUser);
    this.p2psocket.on('file-data', this.onFileData);
    this.p2psocket.on('give-file-back', this.onGiveFileBack);
    this.p2psocket.on('peer-file', this.onPeerFile);
  }

  onFileSubmit = (e) => {
    e.preventDefault();
    const fileInput = this.refs.fileInput;
    if (fileInput.value !== '') {
      const file = fileInput.files[0];
      const fileId = uuid.v1();
      const fileName = file.name;
      const fileSize = file.size;
      const fileType = file.type;
      this.p2psocket.emit('file-data', {
        file,
        fileId,
        fileName,
        fileSize,
        fileType,
        seederSocketId: this.state.mySocketId,
        uploadedBy: this.state.username,
        uploadedAt: new Date().toISOString().substring(0, 10),
      });
      fileInput.value = '';
    }
  };

  onFileData = (data) => {
    this.setState({
      files: [
        ...this.state.files, {
          file: data.file,
          fileId: data.fileId,
          fileName: data.fileName,
          fileSize: data.fileSize,
          fileType: data.fileType,
          seederSocketId: data.seederSocketId,
          uploadedBy: data.uploadedBy,
          uploadedAt: data.uploadedAt,
          ownFile: this.state.mySocketId === data.seederSocketId &&
            data.uploadedBy === this.state.username ? true : false,
          fileProgressValue: 0,
          chunkFileSize: 0,
          fileBuffer: [],
        },
      ],
    });
  };

  onDownload = (seederSocketId, leecherSocketId, requestedFileId) => {
    const fileObject =
      this.state.files.find(file => file.fileId === requestedFileId);
    if (fileObject.fileUrl) {
      this.refs[requestedFileId].click();
    } else {
      this.p2psocket.emit('ask-for-file', { seederSocketId, leecherSocketId, requestedFileId });
    }
  };

  onGiveFileBack = (data) => {
    let requestedFileObject = this.state.files.filter(file => file.fileId === data.requestedFileId);
    requestedFileObject = requestedFileObject[Object.keys(requestedFileObject)[0]];
    const file = new window.Blob([requestedFileObject.file]);
    const fileSize = requestedFileObject.fileSize;

    var chunkSize = 16384;
    var sliceFile = offset => {
      var reader = new window.FileReader();
      reader.onload = (() => evnt => {
        this.p2psocket.emit('peer-file', {
          file: evnt.target.result,
          fileLeecher: data.leecherSocketId,
          requestedFileObject,
        });
        if (file.size > offset + evnt.target.result.byteLength) {
          window.setTimeout(sliceFile, 0, offset + chunkSize);
        }

        this.setState({
          files: [
            Object.assign(requestedFileObject, {
              fileProgressValue: offset + evnt.target.result.byteLength,
            }),
            ...this.state.files.filter(file => file.fileId !== requestedFileObject.fileId),
          ],
        });
      })(file);

      reader.onerror = err => {
        console.error('Error while reading file', err);
      };

      var slice = file.slice(offset, offset + chunkSize);
      reader.readAsArrayBuffer(slice);
    };

    sliceFile(0);
  };

  onPeerFile = (data) => {
    const fileObject =
      this.state.files.find(file => file.fileId === data.requestedFileObject.fileId);
    this.setState({
      files: [
        Object.assign(fileObject, {
          fileBuffer: [
            ...fileObject.fileBuffer,
            data.file,
          ],
          chunkFileSize: fileObject.chunkFileSize + data.file.byteLength,
          fileProgressValue: fileObject.fileProgressValue + data.file.byteLength,
        }),
        ...this.state.files.filter(file => file.fileId !== data.requestedFileObject.fileId),
      ],
    });

    if (fileObject.chunkFileSize === fileObject.fileSize) {
      const blob = new window.Blob(fileObject.fileBuffer);
      const urlCreator = window.URL || window.webkitURL;
      const fileUrl = urlCreator.createObjectURL(blob);

      this.setState({
        files: [
          Object.assign(fileObject, {
            fileUrl,
            fileBuffer: [],
            chunkFileSize: 0,
            fileProgressValue: 0,
          }),
          ...this.state.files.filter(file => file.fileId !== fileObject.fileId),
        ],
      });

      this.refs[data.requestedFileObject.fileId].click();
    }
  };

  onGetSocketId = (socketId) => {
    this.setState({
      mySocketId: socketId,
    });
  };

  onUsername = (e) => {
    if (this.refs.username.value !== '') {
      this.setState({
        username: this.refs.username.value,
      });

      this.p2psocket.emit('new-user',
      {
        username: this.refs.username.value,
        socketId: this.state.mySocketId,
      });

      this.refs.username.value = '';
    }
  };

  onUserList = (userList) => {
    this.setState({
      userList,
    });
  };

  onNewUser = (data) => {
    this.setState({
      userList: data.userList,
    });
    if (data.newUser && data.self !== this.state.mySocketId) {
      this.setState({
        userEnterLeaveMessage: data.newUser + ' has entered WebTorrent!',
      });
    }
  };

  onDisconnectUser = (data) => {
    this.setState({
      userList: data.userList,
    });
    if (data.disconnectedUser) {
      this.setState({
        userEnterLeaveMessage: data.disconnectedUser + ' has left WebTorrent :(',
      });
    }
  };

  // Helper methods

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
    const userList = _.map(this.state.userList, (user, i) => (
      <li key={i}>
        {user.username}
      </li>
    ));
    const sortedLinks = _.sortBy(this.state.files, file => file.fileName);
    const links = _.map(sortedLinks, (file, i) => (
      <li key={i}>
        <p><b>File Name:</b> {file.fileName}</p>
        <p><b>File Size:</b> {this.roundFileSize(file.fileSize)}</p>
        <p><b>Uploaded By:</b> {file.uploadedBy}</p>
        <p><b>Uploaded At:</b> {file.uploadedAt}</p>
        <p><b>File Type:</b> {this.getFileType(file.fileType)}</p>
        <p><b>File Extension:</b> {this.getFileExtension(file.fileType)}</p>
        <progress value={file.fileProgressValue} max={file.fileSize} />
        <br/>
        {
          !file.ownFile ?
            <button
              onClick={this.onDownload.bind(
                this,
                file.seederSocketId,
                this.state.mySocketId,
                file.fileId
              )}
              className="btn">
              Download
            </button> :
            <p>This is your own file</p>
        }
        <a style={{ display: 'none' }}
          download={file.fileName}
          ref={file.fileId}
          href={file.fileUrl}></a>
        <hr />
      </li>
    ));
    return (
      <div className="container">
        {
          this.state.username ?
            null :
            <div className="row">
              <label>Enter your name: </label>
              <input type="text" ref="username"/>
              <button className="btn btn-default" onClick={this.onUsername}>Enter</button>
            </div>
        }
        <div className="row">
          <h1 className="title">WebTorrent</h1>
          <div className="col-md-6 col-sm-6 col-xs-6">
            <form action="#" onSubmit={this.onFileSubmit}>
              <label>Select file to send</label>
              <input type="file" name="filename"
                ref="fileInput" size="40" onChange={this.onFileChange} />
              <br/>
              <input className="btn btn-default" type="submit" value="Submit" />
            </form>
          </div>
          <div className="col-md-6 col-sm-6 col-xs-6">
            <h5>Who is online?</h5>
            {
              this.state.userEnterLeaveMessage ?
                <h6 style={{ color: 'green' }}>{this.state.userEnterLeaveMessage}</h6> :
                null
            }
            <ul>
              { userList }
            </ul>
          </div>
        </div>
        <div className="row">
          <h3>Download files from other peers:</h3>
          <hr/>
          {
            this.state.files.length ?
            <ul>{links}</ul> :
            <h4>
              Nobody
              <span className="glyphicon glyphicon-floppy-save"></span>
              sent you a file
              <span className="glyphicon glyphicon-folder-open"></span>
            </h4>
          }
        </div>
      </div>
    );
  }
}
