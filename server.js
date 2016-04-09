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

io.on('connection', function (socket) {
  socket.on('peer-file', function (data) {
    socket.broadcast.emit('peer-file', data);
  });

  socket.emit('get-socket-id', socket.id);

  socket.on('file-data', function (data) {
    socket.nsp.emit('file-data', data);
  });

  socket.on('ask-for-file', function (socketId) {
    io.to(socketId).emit('give-file-back');
  });
});
