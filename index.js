var app = require("express")();
var http = require("http").createServer(app);
var io = require("socket.io")(http);
var fs = require("fs");
var readline = require("readline");
var readLastLine = require("read-last-line");

var port = 3000;
var dirname = "/mnt/LinuxStorage/Syncthing/GithubRepos/ChatMessenger/";
var logs = dirname + "/data/server.log";
var messages = dirname + "/data/messages.log";
var servername = "SERVER ::: ";
var islogging = true;

var usernumber = 0;
var usernamedb = {};
var usernamedbfile = dirname + "/data/username.json";;
var useripdb = [];
var useripdbfile = dirname + "/data/userip.json";;
var bannedipdb = [];
var bannedipdbfile = dirname + "/data/bannedip.json";;
var activeipdb = [];

app.get("/", (req, res) => {
    res.sendFile(dirname + "static/index.html");
});
app.get("/css/default.css", (req, res) => {
    res.sendFile(dirname + "static/css/default.css");
});
app.get("/js/default.js", (req, res) => {
    res.sendFile(dirname + "static/js/default.js");
});

io.on("connection", (socket) => {
    /* CONNECTION */
    addIp(socket.handshake.address);
    usernumber++;
    console.log(usernumber);

    socket.emit("restart");
    printlog("New user connected (" + socket.handshake.address + ")",);

    /* CONNECT */
    socket.on("clientconn", () => {
        socket.broadcast.emit("chat message", servername + "Someone joined");
        readLastLine.read(messages, 25).then(function (lines) {
            var lastM = lines.split("'");
            for (var i = 0; i <= lastM.length; i++) {
                if (i % 2 && lastM[i] != undefined) {
                    socket.emit("chat message", lastM[i]);
                }
            }
        }).catch(function (err) {
            console.log(err.message);
        });;
    });
    /* DISCONNECT */
    socket.on("disconnect", () => {
        console.log(addTimeStamp("user disconnected"));
        io.emit("chat message", servername + "Someone disconnected");
        usernumber--;
        console.log(usernumber);
    });
    /* MESSAGE */
    socket.on("chat message", (msg) => {
        var sendable = "message";
        if (isBanned(socket.handshake.address)) { sendable = "banned" };
        if (hasBadLetters(msg)) { sendable = "bad msg" };
        var temp = isCommand(msg, socket.handshake.address, sendable);
        var output = temp[1];
        sendable = temp[0];
        switch (sendable) {
            case "message":
                msg = addTimeStamp(usernamedb[socket.handshake.address] + ": " + msg);
                console.log(msg);
                fs.appendFile(messages, "'" + msg + "'\n", "binary", (err) => {
                    if (err) throw err;
                });
                io.emit("chat message", msg);
                break;
            case "temp":
                msg = usernamedb[socket.handshake.address] + ": " + msg;
                console.log(addTimeStamp(msg));
                io.emit("chat message", msg);
                break;
            case "does":
                msg = usernamedb[socket.handshake.address] + " " + msg;
                console.log(addTimeStamp(msg));
                io.emit("chat message", msg);
                break;
            case "command":
                msg = usernamedb[socket.handshake.address] + " wrote: " + msg;
                console.log(addTimeStamp(msg));
                msg = usernamedb[socket.handshake.address] + " got: " + output;
                io.emit("chat message", msg);
                break;
            case "banned":
                msg = usernamedb[socket.handshake.address] +
                    " wrote: '" +
                    msg +
                    "' IP BANNED"
                console.log(addTimeStamp(msg));
                socket.emit(
                    "chat message",
                    servername + "you are BANNED"
                );
                break;
            case "bad msg":
                usernamedb[socket.handshake.address] + " wrote: '" + msg + "' DENIED"
                socket.emit(
                    "chat message",
                    servername + "you are NOT ALLOWED to SEND THAT"
                );
                break;
        }
    });
    /* USERLIST */
    socket.on("callusernum", () => {
        console.log(socket.handshake.address + " pressed getUsers");
        var i = 1;
        activeipdb.forEach((ip) => {
            var name = usernamedb[ip];
            io.emit("chat message", servername + "user [" + i + "]: " + name);
            i++;
        });
    });
    /* NAMECHANGE */
    socket.on("changename", (msg) => {
        printlog(socket.handshake.address + " changes Names to: " + msg);
        usernamedb[socket.handshake.address] = msg;
        socket.emit("chat message", "changed username to: " + msg);
    });
    /* SILENT NAMECHANGE */
    socket.on("silchangename", (msg) => {
        printlog(socket.handshake.address + " changes Names to: " + msg);
        usernamedb[socket.handshake.address] = msg;
    });
});

http.listen(port, () => {
    console.log("listening on *:" + port);
});

function addIp(addr) {
    var exists = false;
    for (var i = 0; i <= useripdb.length; i++) {
        if (useripdb[i] == addr) {
            exists = true;
        }
    }
    if (!exists) {
        useripdb.push(addr);
        fs.writeFile(useripdbfile, JSON.stringify(useripdb), (err) => {
            if (err) throw err;
        });
    }
    var exists = false;
    for (var i = 0; i <= activeipdb.length; i++) {
        if (activeipdb[i] == addr) {
            exists = true;
        }
    }
    if (!exists) {
        activeipdb.push(addr);
    }
}

function isCommand(msg, ip, sendable) {
    if (msg.includes("!temp")) {
        return ["temp", msg];
    }
    if (msg.includes("!d")) {
        return ["does", msg];
    }
    switch (msg) {
        case "!getIP":
            return ["command", ip];
            break;
    }
    return [sendable, "No Command"];
}

function hasBadLetters(msg) {
    if (
        msg.includes("SERVER") ||
        msg.replace(/^\s+|\s+$/g, "") == "" ||
        msg == "test"
    ) {
        return true;
    }
}

function isBanned(addr) {
    for (var i = 0; i <= bannedipdb.length; i++) {
        if (bannedipdb[i] == addr) {
            return true;
        }
    }
}

function addTimeStamp(text) {
    var curdate = new Date();
    text =
        ("0" + curdate.getDate()).slice(-2) +
        "-" +
        ("0" + (curdate.getMonth() + 1)).slice(-2) +
        "-" +
        curdate.getFullYear() +
        "_" +
        ("0" + curdate.getHours()).slice(-2) +
        ":" +
        ("0" + curdate.getMinutes()).slice(-2) +
        ":" +
        ("0" + curdate.getSeconds()).slice(-2) +
        " :: " +
        text;
    return text;
}

function printlog(text) {
    text = addTimeStamp(text);
    if (islogging) {
        fs.appendFile(logs, "'" + text + "'\n", "utf8", (err) => {
            if (err) throw err;
        });
    }
    console.log(text);
}

function saveDB() {
    fs.writeFile(bannedipdbfile, JSON.stringify(bannedipdb), (err) => {
        if (err) throw err;
    });
    fs.writeFile(useripdbfile, JSON.stringify(useripdb), (err) => {
        if (err) throw err;
    });
    fs.writeFile(usernamedbfile, JSON.stringify(usernamedb), (err) => {
        if (err) throw err;
    });
    printlog("saved Databases");
}

function loadDB() {
    fs.readFile(bannedipdbfile, (err, data) => {
        if (err) throw err;
        console.log("data:" + data);
        bannedipdb = data;
    });
    fs.readFile(useripdbfile, (err, data) => {
        if (err) throw err;
        console.log("data:" + data);
        for(var ip in data) {
            if(ip.hasOwnProperty(String)) {
                useripdb = ip;
                console.log("IP:" + ip);
            }
        }
    });
    fs.readFile(usernamedbfile, (err, data) => {
        if (err) throw err;
        console.log("data:" + data);
        usernamedb = JSON.parse(data);
    });
    printlog("reloaded Databases");
    setTimeout(show, 100);
    setInterval(saveDB, 60000);
}

loadDB();

function show() {
    console.log("names:" + usernamedb);
    console.log("ip:" + useripdb);
    console.log("banned:" + bannedipdb);
}