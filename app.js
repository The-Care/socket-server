"use strict";

const express      = require("express");
const app          = express();
const http         = require("http").Server(app);
const io           = require("socket.io")(http);
const port         = process.env.PORT || 3700;
const cors         = require("cors");
const logger       = require("morgan");
const cookieParser = require("cookie-parser");

app.use(cors());
app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// app.use("/", (req, res) => {
//   console.log("use", req.body);
//   app.get("/", (request, response) => {
//     return response.sendFile(__dirname + "/index.html");
//   });

//   app.post("/", (request, response) => {
//     console.log(request.body);

//     return response.send("OK")
//     // return response.sendFile(__dirname + "/index.html");
//   });
//   // app.post("/city"   , main.get_city);
// });

app.post("/push", (req, res) => {
  console.log("post ::", req.body);

  io.to("" + req.body.store).emit("" + req.body.store, req.body);

  return res.send("sended");
});

io.on("connection", (socket) => {
  console.log("join new client", socket);

  socket.on("connecting", (info) => {
    console.log("join ::", info);
    console.log("join ::", info.store_id);

    socket.join("" + info.store_id);

    // io.emit("connected", "you're connected, " + info.store_id);
    io.to("" + info.store_id).emit("connected", "success");
  });

  socket.on("send_notif", (to) => {
    console.log("send_notif : ", to);
    to = "" + to;
    // io.emit(to, "notif")
    io.to(to).emit(to, "haai");
    io.to(to).emit(to, "success notif_to_" + to);

    console.log(emit, "emit");
    // io.emit("connected", "you're connected, " + info.store_id);
  });

  // socket.on('chat message', msg => {
  //   console.log("@on : chat message");
  //   io.emit('chat message', msg);
  // });

  // socket.on('join', store => {
  //   console.log("@on : join ::", store);
  //   // io.emit('chat message', msg);
  //   socket.join("notif_to_" + store);
  // });

  // socket.on('login', msg => {
  //   console.log("@on : login");
  //   io.emit('login', msg);
  // });

  // socket.on('notification', msg => {
  //   console.log("@on : notification");
  //   io.emit('notification', msg);
  // });

  socket.on("disconnect", (msg) => {
    console.log("@on : logout", msg);
    // io.emit('logout', msg);
  });
});

http.listen(port, () => {
  console.log(`Socket.IO server running at http://localhost:${port}/`);
});
