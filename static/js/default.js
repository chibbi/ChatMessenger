var username;

function getCookie(cname) {
  var name = cname + "=";
  var decodedCookie = decodeURIComponent(document.cookie);
  var ca = decodedCookie.split(";");
  for (var i = 0; i < ca.length; i++) {
    var c = ca[i];
    while (c.charAt(0) == " ") {
      c = c.substring(1);
    }
    if (c.indexOf(name) == 0) {
      return c.substring(name.length, c.length);
    }
  }
  return "";
}

function getUsername() {
  var person = getCookie("username");
  if (person == null || person == "") {
    setUsername();
  }
  username = person;
}

function setUsername() {
  var person = window.prompt("pls enter your Username", "Randy");
  document.cookie =
    "username=" + person + ";expires=Mon, 04 Jul 2028 22:44:25 UTC";
  if (person == null || person == "") {
    setUsername();
  }
  username = person;
}

$(function () {
  var socket = io();
  socket.emit("clientconn");
  $("form").submit(function (e) {
    e.preventDefault();
    socket.emit("chat message", $("#m").val());
    $("#m").val("");
    return false;
  });
  $("#getUs").click(function () {
    socket.emit("callusernum");
  });
  $("#setName").click(function () {
    setUsername();
    socket.emit("changename", username);
  });
  socket.on("chat message", function (msg) {
    $("#messages").append($("<li>").text(msg));
    var elem = document.getElementById("divmess");
    elem.scrollTop = elem.scrollHeight;
  });
  socket.on("restart", function () {
    socket.emit("silchangename", username);
  });
});

getUsername();
