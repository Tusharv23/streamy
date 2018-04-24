// Module dependencies

var fs = require('fs')
  , path = require('path')
  , stream = require('stream')

  , MusicLibrary = require('./musiclibrary')
  , SocketServer = require('./socket-server')

  , express = require('express')
  , mongodb = require('mongodb')

var app = module.exports = express.createServer()
  , io = require('socket.io').listen(app);

// Configuration

app.configure(function(){
  app.set('views', __dirname + '/views');
  app.set("view options", {layout: false});

  //html rendering
  app.register('.html', {
    compile: function(str, options){
      return function(locals){
        return str;
      };
    }
  });

  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(app.router);
  app.use(express.static(__dirname + '/public'))
})

app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true }))
})

app.configure('production', function(){
  app.use(express.errorHandler())
})

//Routes

app.get('/home', function(req, res){
  res.render('index.html', {
    locals: {
      title: 'Streamy client'
    }
  })
})
app.get('/login', function(req, res){
  res.render('final.html', {
    locals: {
      title: 'Streamy client'
    }
  })
})
app.get('/register', function(req, res){
  res.render('registerfinal.html', {
    locals: {
      title: 'Streamy client'
    }
  })
})
app.get('/showdb',function(req, res){
  var MongoClient = mongodb.MongoClient;
  var url = 'mongodb://localhost:27017/roundcloud';
  MongoClient.connect(url, function(err, db){
    if(err){ console.log(err); }
    else {console.log("connected to database");}

    var collection = db.collection('user');
    collection.find().toArray(function(err, result){
      if(err){
        console.log(err);
      }
      else {
        res.send(result); 
      }
      db.close();
    })
  })
})
app.post('/login_cred', function(req, res) {
  //res.send('You sent the name "' + req.body.email + '"."'+ req.body.password +'"');
  var MongoClient = mongodb.MongoClient;
  var url = 'mongodb://localhost:27017/roundcloud';
  MongoClient.connect(url, function(err, db){
    if(err){ console.log(err); }
    else {console.log("connected to database");}

    var collection = db.collection('user');
    collection.find({email: req.body.email, password: req.body.password},{name: 1}).limit(1).toArray(function(err, result){
      if(err){
        console.log(err);
      }
      else if(result.length)
      {
        
        res.redirect('/home');
            
      }
      else{
        res.send("Invalid credentials");
      }
    })
  })
})
app.post('/register_details', function(req, res) {

  var MongoClient = mongodb.MongoClient;
  var url = 'mongodb://localhost:27017/roundcloud';
  MongoClient.connect(url, function(err, db){
    if(err){ console.log(err); }
    else {console.log("connected to database");}

    var collection = db.collection('user');

    var temp_user = { name: req.body.name, password: req.body.password, email: req.body.email};
        collection.insert([temp_user], function(err, result){
          if(err){
            console.log(err);
          }
          else{
            res.render('final.html', {
    locals: {
      title: 'Streamy client'
    }
  })
          }

    
      db.close();
    })
  })
  //res.send('You sent the name "' + req.body.name + '".');
});


//Serve streaming audio - audio src points here
app.get('/stream/:song', function(req, res) {
  var songPath = socketServer.musicLibrary.songs[req.params.song]

  fs.exists(songPath, function (exists) {
    if(!exists) {
      var msg = 'File `' + songPath + '` not found'
      console.log('\nSTREAMY:', msg)
      res.writeHead(404)
      res.end(msg)
      return
    }

    //stream song to client
    fs.stat(songPath, function (err, stats) {
      if(err) {
        console.log('\nSTREAMY: stat\'ing error:', err)
        res.writeHead(500)
        return
      }

      res.writeHead(200, { 'Content-Type': 'audio/mpeg', 'Content-Length': stats.size })
      var readStream = fs.createReadStream(songPath)

      readStream.pipe(res) //pump song to client
    })
  })
})

var PORT = 3000

app.listen(PORT)
console.log("STREAMY: listening on port", PORT)

var socketServer = new SocketServer(io)