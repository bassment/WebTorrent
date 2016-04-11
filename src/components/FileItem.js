import React from 'react';

import _ from 'lodash';

export default class FileItem extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      newFileName: '',
      newFileDescription: '',
    };
  }

  setNewFileName = (e) => {
    this.setState({
      newFileName: e.target.value,
    });
  };

  setNewFileDescription = (e) => {
    this.setState({
      newFileDescription: e.target.value,
    });
  };

  // Helper Methods

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

  render () {
    const file = this.props.file;
    return (
      <li>
        {file.ownFile ? <h5 style={{ color: 'green' }}>This is your own file</h5> : null }
        {
          !file.currentlyEditingName ?
            <p><b>File Name:</b> {file.suggestedFileName}</p> :
              <p>
                <b>New File Name: </b>
                <input type="text" autoFocus
                  onChange={this.setNewFileName}
                  defaultValue={file.suggestedFileName}/>
              </p>
        }
        {
          !file.currentlyEditingDescription ?
            <p><b>File Description:</b> {file.fileDescription}</p> :
              <p>
                <b>New Description: </b>
                <input type="text" autoFocus
                  ref="newFileDescription"
                  onChange={this.setNewFileDescription}
                  defaultValue={file.fileDescription}/>
              </p>
        }
        <p><b>Original File Name: </b>{file.fileName}</p>
        <p><b>File Size: </b>{this.roundFileSize(file.fileSize)}</p>
        <p><b>Uploaded By: </b>{file.uploadedBy}</p>
        <p><b>Uploaded At: </b>{file.uploadedAt}</p>
        <p><b>File Type: </b>{this.getFileType(file.fileType)}</p>
        <p><b>File Extension: </b>{this.getFileExtension(file.fileType)}</p>
        {
          !file.ownFile ?
            <div>
              <progress value={file.fileProgressValue} max={file.fileSize} />
            </div> :
              null
        }
        <br/>
        {
          !file.ownFile ?
            <button
              className="btn"
              onClick={this.props.onDownload.bind(
                this,
                file.seederSocketId,
                this.props.mySocketId,
                file.fileId
            )}>
              Download
            </button> :
              !file.currentlyEditingName && !file.currentlyEditingDescription ?
                <div>
                  {
                    file.fileLeechers ?
                      file.fileLeechers.map((leecher, i) => (
                        <h5 key={i}>
                          <span style={{ color: 'purple' }}>{leecher} </span>
                          downloading/downloaded your file
                        </h5>
                      )) :
                      null
                  }
                  <button
                    onClick={this.props.onEditFileName.bind(
                      this,
                      file.fileId
                  )}
                    className="btn action-button">
                    Edit Name
                  </button>
                  <button
                    onClick={this.props.onEditFileDescription.bind(
                      this,
                      file.fileId
                  )}
                    className="btn action-button">
                    Edit Description
                  </button>
                </div> :
                  <button
                    onClick={this.props.onEditFileSave.bind(
                      this,
                      this.state.newFileName !== '' ?
                        this.state.newFileName : file.suggestedFileName,
                      this.state.newFileDescription !== '' ?
                        this.state.newFileDescription : file.fileDescription,
                      file.fileId
                  )}
                    className="btn action-button">
                    Save
                  </button>
        }
      </li>
    );
  }
}
