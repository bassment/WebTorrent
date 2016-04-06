var express = require('express');
var sassMiddleware = require('node-sass-middleware');

express()
  .set('view engine', 'jade')
  .use(
    sassMiddleware({
      src: __dirname + '/sass',
      dest: __dirname + '/public/stylesheets',
      prefix:  '/stylesheets',
      debug: true,
    })
 )
  .use(express.static('./public'))
  .get('/', function (req, res) {
    res.render('index');
  })
  .listen(3000, function () {
    console.log('Listening on port localhost:3000');
  });
