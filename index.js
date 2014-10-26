var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var clientNames = [];

app.get('/', function(req, res){
  res.sendFile('index.html', { root: __dirname });
});

function findClientsSocket(roomId, namespace) {
    var res = []
    , ns = io.of(namespace ||"/");    // the default namespace is "/"

    if (ns) {
        for (var id in ns.connected) {
            if(roomId) {
                var index = ns.connected[id].rooms.indexOf(roomId) ;
                if(index !== -1) {
                    res.push(ns.connected[id]);
                }
            } else {
                res.push(ns.connected[id]);
            }
        }
    }
    return res;
}

function updateNameList() {
	str = "";
        for (object in clientNames) {
          //console.log(object, clientNames[object]);
    	  str += "<li>" + clientNames[object] + "</li>";
        }
	return str;
}

io.on('connection', function(socket){
  io.on('connect', function(client) {
    clientNames[client['client']['conn']['id']] = client.nickname;
    console.log("connect ", clientNames);
  });
 
  socket.on('disconnect', function() {
     	console.log('disconnecting');
    	io.emit('chat message', clientNames[socket['client']['conn']['id']] + " disconnected");
    	delete clientNames[socket['client']['conn']['id']];
	io.emit('updateContactList', updateNameList());
	console.log("disconnect ",clientNames);
  });
 
  socket.on('uname', function(changeName) {
        clientNames[socket['client']['conn']['id']] = changeName;
	console.log('changing names ?', changeName);
  });

  socket.on('updateContactList', function(msg){
	//console.log("index updateContactList ", clientNames, clientNames.length, typeof(clientNames));
	io.emit('updateContactList', updateNameList());
  });

  socket.on('chat message', function(msg){
    console.log('message: ' + msg);

    //console.log("socket uname is " + socket.nickname); 
    io.emit('chat message', msg);
    console.log(socket['client']['conn']['id']);
    console.log(socket['client']['conn']['remoteAddress']);
  });

  socket.on('typing', function(msg){
    console.log(msg);
  });
    
});

http.listen(3000, function(){
  console.log('listening on *:3000');
});
