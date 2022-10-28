"use strict";

const express      = require("express");
const app          = express();
const http         = require("http").Server(app);
const io           = require("socket.io")(http, { cors: { origin: "*" }});
const port         = process.env.PORT || 3700;
const cors         = require("cors");
const logger       = require("morgan");
const cookieParser = require("cookie-parser");
const pdf          = require("pdf-creator-node")

const {Printer} = require("./src/plugins/cups-printer/dist/printer");

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

app.post("/sticker", async (req, res) => {
  let total_qty = 0;

  req.body.basket.forEach(item => {
    total_qty += +item.qty;
  });

  for (let index = 0; index < req.body.basket.length; index++) {
    const product = req.body.basket[index];
    const options = {
      height: "1.2 in",
      width: "1.5 in",
      orientation: "horizontal",
      border: "1mm"
    }
    const list_modifier = product.modifiers.map(_ => {
      return `<div style="padding-left: 10px; font-size: 6px; font-family: system-ui;">⊙ ${_.type} - ${_.detail.name}</div>`
    });

    for (let _index = 0; _index < product.qty; _index++) {
      const doc = {
        html: `
          <div style="font-family: system-ui;">
            <div style="font-size: 12px; font-weight: 600; padding-bottom: 2px;">${product.order_number}<div>
            <div style="font-family: system-ui; font-size: 8px; font-weight: 500">${product.product_name}</div>
            <div style="font-family: system-ui; font-size: 6px; font-weight: 500">${product.variant.n} - ${product.option.n}</div>
            <div>${list_modifier.join("")}</div>
  
            <div style="font-size: 6px; position: fixed; bottom: 8px; right: 3px;">
              <span>${index + _index + 1}</span> / <span>${total_qty}</span>
            </div>
          </div>
        `,
        data: {},
        path: "/home/posinfinite/Documents/assets/sticker.pdf",
        type: ""
      }
      await pdf.create(doc, options);

      const obj = await Printer.find(x => x.name.startsWith(req.body.printer_name));
      await obj.print('/home/posinfinite/Documents/assets/sticker.pdf');
    }
  }
})

app.post("/push", (req, res) => {
  console.log("post ::", req.body);

  io.to("tc-connect").emit("tc-connect", req.body);

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
