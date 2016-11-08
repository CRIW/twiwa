//var jsdom = require("jsdom");

var Twit = require('twit')

var fs = require('fs');

var express = require('express');
var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);

var port = 3000;
server.listen(port);
console.log('Accepting connections on port ' + port);

app.use('/static', express.static(__dirname + '/static'));

app.get('/', function(req, res){
  res.sendFile(__dirname + '/static/index.html');
});


app.get('/tweet/:id', function(req,res){

});

app.get('/profileimg/:id', function(req, res){

});

app.get('/image/:id', function(req, res){

});



var adsConfig = JSON.parse(fs.readFileSync('ads.json', 'utf-8'));
var ads = fs.readdirSync(__dirname + adsConfig.dir).filter(function(file){
  return /.jpg/.test(file) || /.png/.test(file) || /.jpeg/.test(file);
});

app.get('/ad/:id', function(req, res){
  var id = req.params.id;
  if(ads[id]){
    res.sendFile(__dirname + "/" + adsConfig.dir + '/' + ads[id])
  }else{
    res.sendStatus(404);
  }
});


var connectedClients = [];

io.on('connection', function (socket) {
  cachedTweets.forEach(function(tw){
    socket.emit('tweet', tw);
  });
  cachedImages.forEach(function(tw){
    socket.emit('photo', tw);
  });

  //connectedClients.push(socket);
  //socket.emit('news', { hello: 'world' });

  /*socket.on('disconnect', function () {
    connectedClients
  });*/
});

var credentials = JSON.parse(fs.readFileSync('secrets.json'));


var T = new Twit({
    consumer_key: credentials.consumer_key,
    consumer_secret: credentials.consumer_secret,
    access_token: credentials.access_token_key,
    access_token_secret: credentials.access_token_secret
});


function fixTweetText(text){
  text = text.replace(/\&amp\;/g, '&');//Replace ampersands with *real* ampersands
  text = text.replace(/http(s?):\/\/.+/, ''); //Strip links
  return text;
}

//var stream = T.stream('statuses/sample');

var cachedTweets = [];
var MAX_CACHED_TWEETS = 100;
var cachedImages = [];
var MAX_CACHED_IMAGES = 10;
var cacheFull = false;

var twfn = function(tweet){
  //console.log(tweet);
  if(tweet.retweeted_status || tweet.possibly_sensitive){
    return; //No retweets;
  }

  var tw = {
  'text':  fixTweetText(tweet.text),
  'name': tweet.user.name,
  'handle': tweet.user.screen_name,
  'profileimg': tweet.user.profile_image_url
  };
  if(tweet.entities.media){
    tweet.entities.media.forEach(function(media){
      if(media.type == 'photo'){
        tw.image_url = media.media_url;
        cachedImages.push(tw);
        if(cachedImages.length > MAX_CACHED_IMAGES){
          cachedImages.shift();
          if(cachedImages.length > (MAX_CACHED_IMAGES -1) && cachedTweets.length > (MAX_CACHED_TWEETS -1) && (!cacheFull)){
            cacheFull = true;
            console.log('Tweet and image cache filled');
          }
        }
        io.emit('photo', tw)
      }else{
        console.log('different media: ' + media.type + " url = " + media.media_url);
      }
    });
  }else{
    cachedTweets.push(tw);
    if(cachedTweets.length > MAX_CACHED_TWEETS){
      cachedTweets.shift();
    }
    io.emit('tweet', tw);
  }
};

var tags = ['#ElectionNight', '#Election2016'];
var tags2 = ['#CAUWahlnacht'];
var stream = T.stream('statuses/filter', {track: tags, language: ['de', 'en']});
var stream2 = T.stream('statuses/filter', {track: tags2});
console.log('Stream connected');
var drosselkom = function(tweet){
  twfn(tweet);
  return;
  if(Math.random() > 0.3){
    twfn(tweet);
  }
};
stream.on('tweet', twfn);
stream2.on('tweet', twfn);


var displayAd = function(){
  //Select ad
  var selectedAd = parseInt(Math.random() * ads.length);
  var tw = {
    'text':  null,
    'name': "DEBUGNAME",
    'user': "DEBUGUSER",
    'ad': true,
    'image_url': '/ad/' + selectedAd
  };
  io.emit('photo', tw);
}

var AD_FREQUENCY = 5 * 60;

setInterval(displayAd, AD_FREQUENCY * 1000);

var debug = function(){
  ads.forEach(function(ad, i){
    var tw = {
    'text':  null,
    'name': "DEBUGNAME",
    'user': "DEBUGUSER"
    };
    tw.image_url = ad;
    setTimeout(function(){io.emit('photo', tw);}, 1000 * i);
  });
}
