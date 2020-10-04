var OV;
var session;
var OPENVIDU_SERVER_URL = "https://localhost:4443";
var OPENVIDU_SERVER_SECRET = "123456";
var SOCKET_IO_URL = "http://localhost:3000";
var client;
function loadStyle(e) {
    var t = document.createElement("link");
    t.type = "text/css", t.rel = "stylesheet", t.readyState ? t.onreadystatechange = function () {
        "loaded" != t.readyState && "complete" != t.readyState || (t.onreadystatechange = null)
    } : t.onload = function () { }, t.href = e, document.getElementsByTagName("head")[0].appendChild(t)
}

function loadScript(e, t) {
    var o = document.createElement("script");
    o.type = "text/javascript", o.readyState ? o.onreadystatechange = function () {
        "loaded" != o.readyState && "complete" != o.readyState || (o.onreadystatechange = null, t())
    } : o.onload = function () {
        t()
    }, o.src = e, document.getElementsByTagName("head")[0].appendChild(o)
}
document.onreadystatechange = function (e) {
    "complete" === document.readyState && (console.log("hi, inside document.onreadystatechange function"), window.jQuery ? console.log("JQuery is already loaded") : (console.log("jQuery is not loaded"), loadScript("https://ajax.googleapis.com/ajax/libs/jquery/3.3.1/jquery.min.js", () => { loadScript("https://cdnjs.cloudflare.com/ajax/libs/socket.io/2.3.1/socket.io.js", loadChatWindow), console.log("Socket Io is added now") }), console.log("JQuery is added now")))
}, window.onload = function (e) {
    console.log("hi, inside window.onload function")
}, window.onbeforeunload = function () {
    if (session) session.disconnect()
}, window.onclose = function (e) {
    console.log("bye");
    localStorage.removeItem('client');
};

var loadChatWindow = function () {
    console.log("hi, inside loadChatWindow function");

    void 0 !== $.fn.popover ? console.log("bootstrap is already loaded") : (console.log("bootstrap is not loaded"), loadStyle("https://maxcdn.bootstrapcdn.com/bootstrap/4.1.3/css/bootstrap.min.css"), console.log("bootstrap is added dynamially"));
    $("body").append(`<div class="chatbox chatbox--tray chatbox--empty"><div class="chatbox__title"><h5><a href="#">Virtual Agent</a></h5><button class="chatbox__title__tray"><span></span></button><button class="chatbox__title__close"><span><svg viewBox="0 0 12 12" width="12px" height="12px"><line stroke="#FFFFFF" x1="11.75" y1="0.25" x2="0.25" y2="11.75"></line><line stroke="#FFFFFF" x1="11.75" y1="11.75" x2="0.25" y2="0.25"></line>     </svg>     </span>     </button>     \x3c!-- close button ends --\x3e     </div>     <div class="chatbox__body" id="chatbox_body_content">     </div>     <form class="chatbox__credentials">     <div class="form-group">     <label for="inputName">Name:</label>     <input type="text" class="form-control" id="inputName" required>     </div>     <div class="form-group">     <label for="inputEmail">Email:</label>     <input type="text" class="form-control" id="inputEmail" required>     </div>     <button type="submit" class="btn btn-success btn-block">Enter Chat</button>     </form>     <input type="hidden" id="chat_context" name="conversation_id" value="{}">     <input type="text" id="user_input" name="user_input" class="chatbox__message" placeholder="Write here"></input>     </div>`);
    $("body").append(`<div id="join">
                        <h1>Join a video session</h1>
                        <form onsubmit="joinSession(); return false">
                            <p>
                                <input type="submit" value="JOIN">
                            </p>
                        </form>
                        </div>
                        <div id="session" style="display: none;">
                            <h1 id="session-header"></h1>
                            <input type="button" onclick="leaveSession()" value="LEAVE">
                            <div>
                                <div id="publisher"><h3>YOU</h3></div>
                                <div id="subscriber"><h3>OTHERS</h3></div>
                            </div>
                        </div>`);

    var o = $(".chatbox"),
        e = $(".chatbox__title"),
        t = $(".chatbox__title__close"),
        a = $(".chatbox__credentials");

    var socket = io(SOCKET_IO_URL);

    socket.on('new message', (data) => {
        var agent = '<span class="agentIntroText">' + data.username + "</span>";
        $("#chatbox_body_content").append(agent)
        var msg = '<p class="agentText">' + data.message + "</p>";
        $("#chatbox_body_content").append(msg), $("#user_input").val(""), $("#chatbox_body_content").scrollTop(1e10)
    });

    var clientStore = localStorage.getItem("client");
    debugger;
    if (clientStore && clientStore != null) {
        client = JSON.parse(clientStore);
        socket.emit('add user', client.clientId);
        o.removeClass("chatbox--empty");
        $("#user_input").focus();
    }


    function joinSession() {
        debugger;
        var mySessionId = `${client.clientId}`;

        OV = new OpenVidu();
        session = OV.initSession();

        session.on("streamCreated", function (event) {
            session.subscribe(event.stream, "subscriber");
        });

        getToken(mySessionId).then(token => {
            session.connect(token)
                .then(() => {
                    $("#session-header").innerText = mySessionId;
                    $("#join").hide();
                    $("#session").show();
                    socket.emit('new message', `new call sessionid:${mySessionId}`);
                    var publisher = OV.initPublisher("publisher");
                    session.publish(publisher);
                })
                .catch(error => {
                    console.log("There was an error connecting to the session:", error.code, error.message);
                });
        });

    }

    function leaveSession() {
        session.disconnect();
        $("#join").show();
        $("#session").hide();
    }

    function getToken(mySessionId) {
        return createSession(mySessionId).then(sessionId => createToken(sessionId));
    }

    function createSession(sessionId) {
        return new Promise((resolve, reject) => {
            $.ajax({
                type: "POST",
                url: OPENVIDU_SERVER_URL + "/api/sessions",
                data: JSON.stringify({ customSessionId: sessionId }),
                headers: {
                    "Authorization": "Basic " + btoa("OPENVIDUAPP:" + OPENVIDU_SERVER_SECRET),
                    "Content-Type": "application/json"
                },
                success: response => resolve(response.id),
                error: (error) => {
                    if (error.status === 409) {
                        resolve(sessionId);
                    } else {
                        console.warn('No connection to OpenVidu Server. This may be a certificate error at ' + OPENVIDU_SERVER_URL);
                        if (window.confirm('No connection to OpenVidu Server. This may be a certificate error at \"' + OPENVIDU_SERVER_URL + '\"\n\nClick OK to navigate and accept it. ' +
                            'If no certificate warning is shown, then check that your OpenVidu Server is up and running at "' + OPENVIDU_SERVER_URL + '"')) {
                            location.assign(OPENVIDU_SERVER_URL + '/accept-certificate');
                        }
                    }
                }
            });
        });
    }

    function createToken(sessionId) { // See https://docs.openvidu.io/en/stable/reference-docs/REST-API/#post-apitokens
        return new Promise((resolve, reject) => {
            $.ajax({
                type: "POST",
                url: OPENVIDU_SERVER_URL + "/api/tokens",
                data: JSON.stringify({ session: sessionId }),
                headers: {
                    "Authorization": "Basic " + btoa("OPENVIDUAPP:" + OPENVIDU_SERVER_SECRET),
                    "Content-Type": "application/json"
                },
                success: response => resolve(response.token),
                error: error => reject(error)
            });
        });
    }

    function n(e) {
        var t = '<p class="userText">' + e + "</p>";
        $("#chatbox_body_content").append(t), $("#user_input").val(""), $("#chatbox_body_content").scrollTop(1e10)
    }

    function s(e, t) {
        //Send message to socket io server
        socket.emit('new message', e);
    }
    e.on("click", function () {
        o.toggleClass("chatbox--tray"), o.hasClass("chatbox--closed") && (o.removeClass("chatbox--closed"), o.addClass("chatbox--tray"))
    }), t.on("click", function (e) {
        e.stopPropagation(), o.addClass("chatbox--closed")
    }), o.on("transitionend", function () { }), a.on("submit", function (e) {
        e.preventDefault(), o.removeClass("chatbox--empty");
        var name = $("#inputName").val();
        var email = $("#inputEmail").val();

        var clientId = Date.now();
        client = { 'clientId': clientId, 'name': name, 'email': email };
        localStorage.setItem(`client`, JSON.stringify(client));
        socket.emit('add user', `${clientId}`);
        s("My name is " + name), $("#user_input").focus()
    }), $("#user_input").keypress(function (e) {
        if (13 == (e.keyCode ? e.keyCode : e.which)) {
            var t = $("#user_input").val();
            $("#chat_context").val();
            n(t), s(t)
        }
    });
    var l = function () {
        if (sessionStorage.getItem("session")) var e = sessionStorage.getItem("session");
        else {
            var t = Math.floor(1e3 * Math.random() + 1),
                o = Date.now(),
                a = new Date,
                n = new Array(7);
            n[0] = "Sunday", n[1] = "Monday", n[2] = "Tuesday", n[3] = "Wednesday", n[4] = "Thursday", n[5] = "Friday", n[6] = "Saturday";
            var s = t + n[a.getDay()] + o;
            sessionStorage.setItem("session", s), e = sessionStorage.getItem("session")
        }
        return e
    }();
    $(document).on("click", ".suggestions span", function () {
        var e = this.innerText;
        n(e), s(e), $(".suggestions").remove()
    })
};