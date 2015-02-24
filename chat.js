////////////////////////////////////////////////////////////////
// Client side chat code to take care of variables concerning 
// chat status and events such as chat room commands, emoticons
////////////////////////////////////////////////////////////////

// create socket instance that will be used to connect to the main IO Socket server
var socket = io();
// will keep track of if we should update status of typing
var typingList = [];
// your current ID if you have any.  Needed to update status.
var myID = "";
// ping length before going back to regular status
var pingLength = 2000;
// name: to take care of name changes during the typing cooldown status phase
var currentName = "";
// max li possible before trimming will occur
var liMax = 50;
// trim switch to turn on or off
var trimSwitch = true;
// trim orientation from the to or from the bottom
var trimOrientation = "top";
// to append at the top or at the bottom
var appendOrientation = "bottom";
// default title of chat room currently in
var defaultTitle = "Anon Chat";
// emoticon directory on the server 
var emoteDir = "emote/";
// keep track of private chatlist if we have enabled private chat
var privateChatList = [];
// private label
var privateLabel = "%%PRIVATE%%";
// window focus
var windowFocus = false;
// current title
var currentTitle = document.title;

// away message when you are away from your chat window
var away = [];
away[0] = "You have ...";
away[1] = "New message ...";
// incoming messages
var incomingMessages = 0;

// if the default name is set that means this is the first instance.
// Rename the title with anon and a random number
if ("anon" == $('#uname').val()) {
  $('#uname').val("anon-" + Math.ceil(Math.random() * 1000));
}

toggleText();

/*
* Socket.IO listening and send event requests.  The socket IO basically has 2 functions of note, at 
* least on the client side.  on and emit function.
* on functions: are listening events broadcast by the server to do some update.  This would be server
* messages sent, title changes emoticon inserts
* emit functions: are send events from your browser to the server because you are performing some event.
*/
socket.nickname = currentName = $('#uname').val();
// tell the server your nickname / handler
socket.emit('uname', socket.nickname);
// tell the server you have joined the room
socket.emit('join room', socket.nickname);
// tell the server you want an updated contactList of everyone in the chat room
socket.emit('updateContactList', socket.nickname);	

// set click event for clearing message
$(".clearBtn").click(function() {
  $("#messages").html("");
});

// set click event for trim button
$("#trimBtn").click(function() {
  if ($(this).attr("class") == "trimoff") {
    $(this).attr("class", "trimon btn");
  }
  else {
    $(this).attr("class", "trimoff btn");
  }
setTrimSwitch();
});

// toggles windowFocus variable for away message
$(window).focus(function() {
  windowFocus = true;
  $(document).prop('title', currentTitle);				
}).blur(function() {
  windowFocus = false;
});

/*
 *  Submit form function takes care of events that are emitted to the server (remember most emit functions don't prompt the server no broadcast to everyone and yourself).  
 *  An example is sending a message to the server.  During submit we have the message and do not need to wait for a relay broadcast.  We will manually update our browser 
 *  list
 */
$('form').submit(function() {
  msg = $('#sendArea').val()
  if (msg) {
    // check to see if we have a valid command in the message.  If so emit a set command
    if (isValidSetCommand(msg)) {
      socket.emit('set command', msg);
    }
    else if (hasPrivateCheck()) {
      // if we have anybody on privacy chat.  Create the privacy listing and emit private message
      for (var key in privateChatList) {
        socket.emit('private message', { 
          from: grabHandle(),
          to: privateChatList[key],
          msg: msg });
      }
      appendToMessage($('<li class="myText chatStatus52">').html( makeHyperLink(msg) + " <span class='chatName'>:" + privateLabel + " " + grabHandle() + getDate() + "</span>"));	
    }
    else {
      // this is a regular message emit our message but also update our message manually
      appendToMessage($('<li class="myText">').html( makeHyperLink(msg) + " :<span class='chatName'>" + grabHandle() + getDate() + "</span>"));	
      socket.emit('b.chat message', "<span class='chatName'>" + getDate() + grabHandle() + "</span>: " + msg);
    }
    hugBottom();
    $('#sendArea').val('');
  }
  return false;
});

// when we are changing our name we will also be sending the server and notifying them that about the name change
// This should prompt the server to broadcast an updated list of contacts.  to everyone except this instance
$('#uname').change(function() {
  socket.nickname = currentName = $('#uname').val();
  socket.emit('uname', socket.nickname);
  socket.emit('updateContactList', socket.nickname);
});

// emit a send respons for broadcasting
$('#sendArea').keypress(function() {
  if (hasPrivateCheck()) {
    socket.emit('private typing', grabHandle(), privateChatList);
  }
  else {
    socket.emit('typing', grabHandle());
  }
});

// update ID on request
socket.on('connected', function(msg) {
  myID = msg;
});

// find a command to execute in chat room
socket.on('set command', function(msg) {
  findAndSetCommand(msg);
});

// orginary chat message
socket.on('chat message', function(msg){
  appendToMessage($('<li>').html(makeHyperLink(msg)));
  hugBottom();
});

// if the message is private change the text style format of the code when a private message is set
socket.on('private message', function(obj){
  appendToMessage($('<li class="chatStatus51">').html(makeHyperLink("<span class='chatName'>" + getDate() + obj['from'] + " " + privateLabel + ":</span> " + obj['msg'])));
  hugBottom();
});

// update contact list from main socket
socket.on('updateContactList', function(myList){
  // console.log("update contact list");
  $('#contactlist').html(myList);
  persistPrivateChatStatus();
  //alert("socket updatecontactlist");
});

// if user is already typing don't update the list
socket.on('typing', function(user) {
  //$('#contactlist').html();
  if (user in typingList) {
    // do nothing
  }
  else {
    typingList[user] = 1;
    updateTypeStatus(user);
  }
});

// set the ID for uniqueness sakes
socket.on("connection id", function(id) {
  myID = id;
});

// Get the names of current handler.  Broadcast who you are and tell the central server
socket.on("who are you?", function() {
  socket.emit("who are you?", grabHandle());
});

// Announce when someone just joined a room
socket.on('join room', function(msg){
  appendToMessage($('<li class="chatStatus1">').html( msg));
  hugBottom();
});

// Announce when someone is leaving a room
socket.on('leave room', function(msg){
  appendToMessage($('<li class="chatStatus2">').html( msg));
  hugBottom();
});
