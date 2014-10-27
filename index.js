var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var clientNames = [];

// use express framework to start serving pages
app.get('/', function(req, res){
  res.sendFile('index.html', { root: __dirname });
});


// check to see 
function checkAndUpdateNameList(id, name) {
	if ("undefined" === typeof clientNames[id]) {
		console.log("undefined clientNames " + id);
		clientNames[id] = name;
		updateNameList();
	}
}


// create string a return list for updating purposes
function updateNameList() {
	str = "";
        for (object in clientNames) {
          //console.log(object, clientNames[object]);
    	  str += "<li id='" + object +  "'><b>" + clientNames[object] + "</b></li>";
        }
	return str;
}

// return proper dates
function getDate() {
	// Create a date object with the current time
	var now = new Date();
 
	// Create an array with the current month, day and time
	var date = [ now.getMonth() + 1, now.getDate(), now.getFullYear() ];
 
	// Create an array with the current hour, minute and second
	var time = [ now.getHours(), now.getMinutes(), now.getSeconds() ];
 
	// Determine AM or PM suffix based on the hour
	var suffix = ( time[0] < 12 ) ? "AM" : "PM";
 
	// Convert hour from military time
	time[0] = ( time[0] < 12 ) ? time[0] : time[0] - 12;
 
	// If hour is 0, set it to 12
	time[0] = time[0] || 12;
 
	// If seconds and minutes are less than 10, add a zero
	for ( var i = 1; i < 3; i++ ) {
		if ( time[i] < 10 ) {
			time[i] = "0" + time[i];
		}
	}
 
	// Return the formatted string
	return date.join("/") + " " + time.join(":") + " " + suffix;

}


io.on('connection', function(socket){
  // iterate through all connections and update the client

  // when a socket tries to connect to main socket
  // we want to detect if the nickname is avaliable if it isn't issue a who are you command to find out
  // else we set the command and try to clean up dead connections
  io.on('connect', function(client) {
	console.log("connect unknown name " + client.nickname);
	if(typeof client.nickname === 'undefined') {
   		io.emit("who are you?", "");
	}
	else {
		clientNames[client['client']['conn']['id']] = client.nickname;
		cleanupDeadConnections();
	}
    	//console.log("connect ", clientNames);
  });

  // kill lingering dead connections that might float around the array for accurate contact keeping
  function cleanupDeadConnections() {
	for (var key in clientNames) {
		if ('undefined' === typeof clientNames[key]) {
			console.log("dead connections are ", key, clientNames[key]);
			delete clientNames[key];
		}
	}
  }

  // when you disconnection delete the list and just to be safe that we have no duplicates clean the array
  // all connections should have a name by now so any undefined values are orphan connections
  socket.on('disconnect', function() {
     	console.log('disconnecting');
    	io.emit('leave room', clientNames[socket['client']['conn']['id']] + " disconnected (" + getDate() + ")");
    	delete clientNames[socket['client']['conn']['id']];
	cleanupDeadConnections();
	io.emit('updateContactList', updateNameList());
	//console.log("disconnect ",clientNames);
  });

  // listen to socket command and set array with id and name.  This will allow us to update the 
  // array contact listing no problem
  socket.on("who are you?", function(name) {
	console.log("who are you?", name);
	clientNames[socket['client']['conn']['id']] = name;
	io.emit('updateContactList', updateNameList());
  });

  // listen to socket join room event and emit status to all connections
  socket.on("join room", function(name) {
  	io.emit('join room', name + " joined the room (" + getDate() + ")");
  });

  // update array contact with new name
  socket.on('uname', function(changeName) {
        clientNames[socket['client']['conn']['id']] = changeName;
	console.log('changing names', changeName);
  });

  // emit all connections to update their list
  socket.on('updateContactList', function(msg){
	//console.log("index updateContactList ", clientNames, clientNames.length, typeof(clientNames));
	io.emit('updateContactList', updateNameList());
  });

  // a socket has posted a message update all other connections the message
  socket.on('chat message', function(msg){
    console.log('message: ' + msg);
    io.emit('chat message', msg);
    console.log(socket['client']['conn']['id'], socket['client']['conn']['remoteAddress']);
  });

  // update all connections that a user on the list is typing
  socket.on('typing', function(user){
    console.log(user + ": typing");
    checkAndUpdateNameList(socket['client']['conn']['id'], socket.nickname);
    io.emit('typing', socket['client']['conn']['id']);
  });
});

http.listen(3000, function(){
  console.log('listening on *:3000');
});
