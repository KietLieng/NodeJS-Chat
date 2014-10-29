var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var clientNames = [];
var lastTyped = "";
var lastTypedTime = "";
// set threshold time for when to emit typing status
var typeThresholdTime = 2;

// use express framework to start serving pages
app.get('/', function(req, res){
	res.sendFile('index.html', { root: __dirname });
});

// setup static assets directory
app.use("/emote", express.static(__dirname + '/emote'));
app

// check to see if names is on the list.  Remove if possible
function checkAndUpdateNameList(id, name) {
	if ("undefined" === typeof clientNames[id]) {
		console.log("undefined clientNames " + id);
		clientNames[id] = name;
		console.log("set name like " + name);
		updateNameList();
	}
}


// create string and return list for updating user list
function updateNameList() {
	str = "";
	for (object in clientNames) {
		//console.log(object, clientNames[object]);
		str += "<li id='" + object +  "' class='flagoff' onclick=\"switchme(this);\">" + clientNames[object] + "</li>";
	}
	return str;
}

// return proper dates
function getDate() {
	var now = new Date();
	var date = [ now.getMonth() + 1, now.getDate(), now.getFullYear() ];
	var time = [ now.getHours(), now.getMinutes(), now.getSeconds() ];
	var suffix = ( time[0] < 12 ) ? "AM" : "PM";
	time[0] = ( time[0] < 12 ) ? time[0] : time[0] - 12;
	time[0] = time[0] || 12;
	for ( var i = 1; i < 3; i++ ) {
		if ( time[i] < 10 ) {
			time[i] = "0" + time[i];
		}
	}
	return date.join("/") + " " + time.join(":") + " " + suffix;
}

// kill lingering dead connections that might float around the array for accurate contact keeping
function cleanupDeadConnections() {
	for (var key in clientNames) {
		if ('undefined' === typeof clientNames[key]) {
			console.log("dead connections are ", key, clientNames[key]);
			delete clientNames[key];
		}
	}
}

// set last typed useg time and id
function setLastTyped(user) {
	lastTyped = user;
	lastTypedTime = getThresholdTime();
}

// reset new last typed
function resetLastTyped() {
	lastTyped = "";
	lastTypedTime = getThresholdTime();
}

// check to see if same user if it is if the time threshold has been passed
function lastTypedThreshold(user) {
	if (user != lastTyped) {
		return true;
	}
	else {  // same user so check the length of time between last threshold
		return ((getThresholdTime() - lastTypedTime) > typeThresholdTime);
	}
	return false;
}

// get time to prevent throttling
function getThresholdTime() {
	var now = new Date();
	return now.getMonth() + 1 + now.getDate() + now.getFullYear() + now.getHours() + now.getMinutes() + now.getSeconds();
}

io.on('connection', function(socket){
	// iterate through all connections and update the client

	// on wake find out who's on line
	io.emit("who are you?", "");

	// when a socket tries to connect to main socket
	// we want to detect if the nickname is avaliable if it isn't issue a who are you command to find out
	// else we set the command and try to clean up dead connections
	io.on('connect', function(client) {
  //		console.log("connect client ", client['adapter']['rooms']);
		if('undefined' === typeof client.nickname) {
//			client.emit("who are you?", "");
		}
		else {
			clientNames[client['client']['conn']['id']] = client.nickname;
			//cleanupDeadConnections();
		}
    client.emit("connected", client['client']['conn']['id']);
	//console.log("connect ", clientNames);
	});

	// when you disconnection delete the list and just to be safe that we have no duplicates clean the array
	// all connections should have a name by now so any undefined values are orphan connections
	socket.on('disconnect', function() {
		console.log('disconnecting');
  	io.emit('leave room', clientNames[socket['client']['conn']['id']] + " disconnected (" + getDate() + ")");
 		// delete clientSockets
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
		socket.nickname = name;
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

	// a socket has posted a message update all connections the message
	socket.on('chat message', function(msg){
		//console.log('message: ' + msg);
		io.emit('chat message', msg);
		console.log(socket['client']['conn']['id'], socket['client']['conn']['remoteAddress']);
		resetLastTyped();
	});

	// a socket has posted a message update all other connections besides this current connection
	socket.on('private message', function(obj){
		//console.log('private message: ', obj);
		socket.to(obj['to']).emit("private message", obj);
	});

	// a socket has posted a message update all other connections besides this current connection
	socket.on('b.chat message', function(msg){
		//console.log('b.message: ' + msg);
		socket.broadcast.emit('chat message', msg);
		console.log(socket['client']['conn']['id'], socket['client']['conn']['remoteAddress']);
		resetLastTyped();
	});

	// update all connections that a user on the list is typing
	socket.on('private typing', function( user, users){
		if (lastTypedThreshold(user)) {
			console.log(user + ": typing");
			checkAndUpdateNameList(socket['client']['conn']['id'], user);
			socket.emit('typing', socket['client']['conn']['id']);
			setLastTyped(user);
		}
//		console.log(users);
    for (var key in users) {
//			console.log("typing out to ", users[key]);
			socket.to(users[key]).emit("typing", socket['client']['conn']['id']);
		}
	});

	// update all connections that a user on the list is typing
	socket.on('typing', function(user){
		if (lastTypedThreshold(user)) {
			console.log(user + ": typing");
			checkAndUpdateNameList(socket['client']['conn']['id'], user);
			io.emit('typing', socket['client']['conn']['id']);
			setLastTyped(user);
		}
	});

	// update all connections that a user on the list is typing
	socket.on('set command', function(msg) {
		io.emit("set command", msg);
		console.log("set command", msg);
	});
});

http.listen(3000, function(){
	console.log('listening on *:3000');
});
