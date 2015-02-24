/////////////////////////////////////////////////////////////////////////////////////////////////////
// Date: Feb, 2014
// Author: Kiet Lieng
// chatfunction is a class that contains all functions needed to serve a proper chac room using only
// node.js and express script
/////////////////////////////////////////////////////////////////////////////////////////////////////

// sets the trim switch variable
function setTrimSwitch() {
  if ($("#trimBtn").attr("class") == "trimoff") {
    trimSwitch = false;
  }
  else {
    trimSwitch = true;
  }
}

// toggle text title if we have an incoming message but current window is not focused
function toggleText() {
  if (incomingMessages) {
    if (false == windowFocus) {
      if (incomingMessages) {
        if (away[0] == document.title) {
          $(document).prop('title', away[1]);
        }
        else {
          $(document).prop('title', away[0]);
        }
      }
    }
    else {
      incomingMessages = 0;
      if (document.title != currentTitle) {
        document.title = currentTitle;
      }
    }
  }
  setTimeout( toggleText, pingLength);
}
/*
* add message to end top or bottom of page depending on orientation
* @param msg the message you want to append 
*/
function appendToMessage(msg) {
  if (appendOrientation == "top") {
    $("#messages").prepend(msg);
  }
  else {
    $("#messages").append(msg);
  }
  if (!windowFocus) {
    incomingMessages++;
  }
}

/* 
 * For each user in the room toggle privacy setting on and off
 * @param obj contains the current node being clicked on
 * red is flag on
 * black is regular
 */
function togglePrivate(obj) {
  if ($(obj).attr("class") == "flagoff") {
    // only change if it's not me
    if ($(obj).attr("id") != myID) {
      $(obj).attr("class", "flagon");
      privateChatList.push($(obj).attr("id"));
    }
  }
  else {
    index = $.inArray($(obj).attr("id"), privateChatList);
    if (index) {
      privateChatList.splice(index, 1);
    }
    $(obj).attr("class", "flagoff btn");
  }
}

// Grab handle name of the current window
function grabHandle() {
  return $('#uname').val();
}

function makeBold(content) {
  return "<b>" + content + "</b>";
}

// checks to see if trimming is needed based on the max list element check
function trimList() {
  while ($("#messages li").length > liMax) {
    if (trimOrientation == "top") {
      $("#messages li").first().remove();
    }
    else {
      $("#messages li").last().remove();
    }
  }
}

/*
 *  update status of the user currently typing
 *  @param user: 
 */
function updateTypeStatus(user) {
  var currentUserName = "";
  $( "#contactlist li" ).each(function( index ) {
    if (user == $(this).attr('id')) {
      currentUserName = $(this).text();
      // identify ourself and set name with currentName
      if (currentUserName == currentName) {
        setTimeout(function() {
          $("#" + user).html( makeBold(currentName));
          delete typingList[user];
        }, pingLength);
      }
      else {
        // set the users next name
        setTimeout(function() {
          $("#" + user).html( makeBold(currentUserName));
          delete typingList[user];
        }, pingLength);
      }
  $(this).html( makeBold($(this).text() + " (typing)"));	
  //alert($(this).text() + " " + $(this).attr('id'));
    }
  });
}

// return proper dates
function getDate() {
  // Create a date object with the current time
  var now = new Date();
  // Create an array with the current month, day and time
  // var date = [ now.getMonth() + 1, now.getDate(), now.getFullYear() ];
  var date = [ now.getMonth() + 1, now.getDate() ];
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
  return " (" + date.join("/") + " " + time.join(":") + " " + suffix + ") ";
}

// want the scroller to hug the bottom of the pages
function hugBottom() {
  if (trimSwitch) {
    trimList();
  }
  $("#messages").animate({ scrollTop: $("#messages").height() }, "slow");
  //console.log( $("#messages").height());
}

// first text within string at any position
function textContains(msg, searchStr) {
  return (msg.toLowerCase().indexOf(searchStr) >= 0);
}

// find text at the start of string to find out set commands
function isSetCommand(msg, searchStr) {
  return (msg.toLowerCase().indexOf(searchStr) == 0);
}

// support set commands such as title and trout :)
function isValidSetCommand(msg) {
  return isSetCommand(msg, "/title") || isSetCommand(msg, "/trout");
}

// find emoticon commands
function isEmoticon(msg) {
  return isSetCommand(msg, ":)") || isSetCommand(msg, ":(");
}

// find if the string contains an image link
function isPicture(msg) {
  return (textContains(msg, ".jpg") ||
      textContains(msg, ".jpeg") ||
      textContains(msg, ".png") ||
      textContains(msg, ".gif") ||
      textContains(msg, ".tiff") ||
      textContains(msg, ".jtiff"));
}

// mass replace of emoticons with proper images
function replaceWithEmoticon(content) {
  currentUrl = window.location.href.replace();
  content = content.replace(":(", "<img src='" + emoteDir + "sad.png' />");
  content = content.replace(":)", "<img src='" + emoteDir + "happy.png' />");
  content = content.replace(" :\/ ", "<img src='" + emoteDir + "annoyed.png' />");
  content = content.replace(" :| ", "<img src='" + emoteDir + "straight.png' />");
  return content;
}

// disassemble sentence and put them back together with hyperlink / image link
function makeHyperLink(msg) {
  msgArray = msg.split(" ");
  finalMsg = "";
  $.each(msgArray, function( key, value) {
    if (value.toLowerCase().indexOf("http") == 0) {
      if (isPicture(value)) {
        finalMsg += "<img src='" + value + "' />";
      }
      else {
        finalMsg += "<a href='" + value + "' target='newlink'>" + value + "</a> ";
      }
    }
    else if (isEmoticon(value)) {
      finalMsg += replaceWithEmoticon(value);
    }
    else {
      finalMsg += value + " ";
    }
  });
  return finalMsg.trim();
}

// finds command and update the list
function findAndSetCommand(msg) {
  msgArray = msg.split(" ");
  index = 0;
  finalMsg = "";
  $.each(msgArray, function( key, value) {
    if (0 == index++) {
      // skip
    }
    else {
      finalMsg += value + " ";
    }
  });
  finalMsg.trim();
  if (msgArray[0] == "/title") {
    $(document).prop('title', defaultTitle + ": " + finalMsg);
    currentTitle = document.title;
    appendToMessage($('<li class="chatStatus3">').html("Room is now called: " + finalMsg + getDate()));
    hugBottom();
  }
  else if (msgArray[0] == "/trout") {
    appendToMessage($('<li class="chatStatus4">').html("SLAP " + finalMsg + getDate()));
    hugBottom();
  }
}

// checks to see if privacy is checked
function hasPrivateCheck() {
  // clean up chatlist
  privateChatList = [];
  hasChecks = false;
  $("#contactlist li" ).each(function( index, value) {
    if ("flagon" == $(this).attr('class')) {
      privateChatList.push($(this).attr('id'));
      hasChecks = true;
    }
  });
  return hasChecks;
}
function findPrivateChatUser(userID) {
  // console.log(privateChatList);
  for (var key in privateChatList) {
    // console.log("users ",userID, privateChatList[key]);
    if (userID == privateChatList[key]) {
      console.log("found", userID, privateChatList[key]);
      return true;
    }
  }
  return false;
}

function persistPrivateChatStatus() {
  $("#contactlist li" ).each(function( index, value) {
    if (findPrivateChatUser($(this).attr('id'))) {
      $(this).attr('class', "flagon");
    }
  });
}
