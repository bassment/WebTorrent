var PeerServer = require('peer').PeerServer;
var express = require('express');
var sassMiddleware = require('node-sass-middleware');
var port = process.env.PORT || 3000;

var app = express();
app.set('view engine', 'jade');
app.use(
  sassMiddleware({
    src: __dirname + '/sass',
    dest: __dirname + '/public/stylesheets',
    prefix:  '/stylesheets',
    debug: true,
  })
);
app.use(express.static('./public'));
app.get('/', function (req, res) {
  res.render('index');
});

var expressServer = app.listen(port);

var io = require('socket.io').listen(expressServer);

console.log('Listening on port', port);

var peerServer = new PeerServer({ port: 9000, path: '/chat' });

peerServer.on('connection', function (id) {
  io.emit('user-connected', id);
  console.log('User connected with #', id);
});

peerServer.on('disconnect', function (id) {
  io.emit('user-disconnected', id);
  console.log('User disconnected with #', id);
});
