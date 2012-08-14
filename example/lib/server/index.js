var http = require('http')
  , path = require('path')
  , express = require('express')
  , gzippo = require('gzippo')
  , derby = require('derby')
  , app = require('../app')
  , serverError = require('./serverError')
  , derbyUploadMiddleware = require('derby-upload/middleware')


// SERVER CONFIGURATION //

var expressApp = express()
  , server = module.exports = http.createServer(expressApp)

derby.use(derby.logPlugin)
var store = derby.createStore({listen: server})

var ONE_YEAR = 1000 * 60 * 60 * 24 * 365
  , root = path.dirname(path.dirname(__dirname))
  , publicPath = path.join(root, 'public')

expressApp
  .use(express.favicon())
  // Gzip static files and serve from memory
  .use(gzippo.staticGzip(publicPath, {maxAge: ONE_YEAR}))
  // Gzip dynamically rendered content
  .use(express.compress())

  // Upload files straight to AWS/S3
  .use(derbyUploadMiddleware({
    path: '/testupload*' // Optional. Defaults to '*'
  , auth: {
        key: '<your aws access key>' // Required
      , secret: '<your aws secret>' // Required
      , bucket: '<your s3 bucket>' // Required
    }
  , directory: '' // Optional. Folder, for example: '/my_img_folder'
  , headers: { // Optional
      // Headers sent along to AWS, for example:
      // 'x-amz-acl': 'private'
    }
  , callbacks: { // Optional
      // Available callbacks:
      // putStream: function( err, res ) {}
      // write: function( err, res ) {}
      // pause: function( cb ) {}
      // resume: function( cb ) {}
      // end: function( cb ) {}
    }
  , formidable: { // Optional
      // Options passed to formidable through multipart
  }
  , derbyApp: app // Optional. Defaults to nothing. Convenience option for attaching a Derby route returning 200 / OK (will be triggered in case no other handling get triggered)
  , stream: false // Optional. Use streaming straight to S3 without touching disk. Note! This can severly clog your memory
  }))

  // Uncomment to add form data parsing support
  // .use(express.bodyParser())
  // .use(express.methodOverride())

  // Uncomment and supply secret to add Derby session handling
  // Derby session middleware creates req.model and subscribes to _session
  // .use(express.cookieParser())
  // .use(store.sessionMiddleware
  //   secret: process.env.SESSION_SECRET || 'YOUR SECRET HERE'
  //   cookie: {maxAge: ONE_YEAR}
  // )

  // Adds req.getModel method
  .use(store.modelMiddleware())

  // Creates an express middleware from the app's routes
  .use(app.router())
  .use(expressApp.router)
  .use(serverError(root))


// SERVER ONLY ROUTES //

expressApp.all('*', function(req) {
  throw '404: ' + req.url
})
