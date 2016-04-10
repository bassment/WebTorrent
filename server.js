var express = require('express');
var app = express();
var sassMiddleware = require('node-sass-middleware');
var port = process.env.PORT || 3000;

var server = require('http').Server(app);
var p2pserver = require('socket.io-p2p-server').Server;
var io = require('socket.io')(server);

app.use(
  sassMiddleware({
    src: __dirname + '/sass',
    dest: __dirname + '/public/stylesheets',
    prefix:  '/stylesheets',
    debug: true,
  })
);
app.use(express.static('./public'));
io.use(p2pserver);

app.set('view engine', 'jade');
app.get('/', function (req, res) {
  res.render('index');
});

server.listen(port);
console.log('Listening on port', port);

var userList = [];
io.on('connection', function (socket) {
  socket.emit('get-socket-id', socket.id);

  socket.nsp.emit('user-list', userList);

  socket.on('new-user', function (data) {
    userList.push({ username: data.username, socketId: data.socketId });
    socket.nsp.emit('new-user', { userList, newUser: data.username, self: data.socketId });
  });

  socket.on('disconnect', function () {
    var disconnectedUser =
      userList
        .filter(user => user.socketId === socket.id)
        .reduce((username, user) => user.username, '');
    userList = userList.filter(user => user.socketId !== socket.id);
    socket.nsp.emit('disconnect-user', { userList, disconnectedUser });
  });

  socket.on('file-data', function (data) {
    socket.nsp.emit('file-data', data);
  });

  socket.on('ask-for-file', function (data) {
    io.to(data.seederSocketId)
      .emit('give-file-back',
      {
        leecherSocketId: data.leecherSocketId,
        requestedFileId: data.requestedFileId,
      }
    );
  });

  socket.on('peer-file', function (data) {
    io.to(data.fileLeecher).emit('peer-file', data);
  });
});
