"use strict";

const express = require("express");
const app = express();
const http = require("http").Server(app);
const io = require("socket.io")(http, { cors: { origin: "*" } });
const port = process.env.PORT || 3700;
const cors = require("cors");
const logger = require("morgan");
const cookieParser = require("cookie-parser");
const pdf = require("pdf-creator-node")
const ptp = require("pdf-to-printer")
const htmlPdf = require("html-pdf");
const fs = require("fs");

const { Printer } = require("./src/plugins/cups-printer/dist/printer");

app.use(cors());
app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

app.post("/create-trx", async (req, res) => {
  try {
    console.log(JSON.stringify(req.body, 0, 2));
  
    return res.send("OK");
  } catch (error) {
    console.log(error);

    return res.send("FAILED!")
  }
});

app.post("/clean-sticker", async (req, res) => {
  try {
    const files = await fs.readdirSync(req.body.settings);
  
    console.log(JSON.stringify(files, 0, 2));

    files.forEach(_ => fs.rmSync(`${req.body.settings}${_}`))
  
    return res.send("OK");
  } catch (error) {
    console.log(error);

    return res.send("FAILED!")
  }
});

app.post("/create-sticker", async (req, res) => {
  try {
    let total_qty = 0;
    let page = 0;
    const files = [];
    const settings = req.body.settings;

    req.body.basket.forEach(item => {
      total_qty += +item.qty;
    });

    for (let index = 0; index < req.body.basket.length; index++) {
      let is_novar_noopt = false;
      const product = req.body.basket[index];
      const modifier_ids = [];

      if (!product.hasOwnProperty("options")) {
        console.log("need to inject")
        const modifiers = [];

        for (let __index = 0; __index < product.modifiers.length; __index++) {
          const modifier = product.modifiers[__index];
          
          modifier.id = modifier.detail.id;
          modifier.name = modifier.detail.name;
          modifiers.push(modifier);
        }

        product.name      = product.product_name;
        product.options   = product.option.name;
        product.variant   = product.variant.name;
        product.modifiers = modifiers;
      }

      if (product.variant === "-") {
        product.variant = "";
      }

      if (product.options === "-") {
        product.options = "";
      }

      if (!product.variant.length && !product.options.length) {
        is_novar_noopt = true;
      }

      // console.log(JSON.stringify(product, 0, 2))

      const list_modifier = product.modifiers.map(_ => {
        console.log("modifier >> ", _)
        modifier_ids.push(_.id);

        return `<div style="font-size: 8px; font-family: Arial, Helvetica, sans-serif;">${_.qty} x ${_.type} - ${_.name}</div>`
      });

      for (let _index = 0; _index < product.qty; _index++) {
        page += 1;
        files.push({
	        index,
          file : `${settings.pdf_path}${product.order_number}-${product.name}-${product.variant}-${product.options}-${modifier_ids.join("-")}-${index}-${_index}.pdf`,
          html : `
            <div style="font-weight: 500; font-family: Arial, Helvetica, sans-serif; height: 2.5cm;">
              <div style="position: absolute; top: 8px; font-size: ${settings.font.header}px; font-weight: 600; width: 100%; border-bottom: 1px solid lightgrey;">
                ${product.order_number}
              </div>
              <div style="position: absolute; bottom: 6px; font-size: ${settings.font.content};">
                ${page} of ${total_qty}
              </div>

              <div style="padding-top: 14px; font-size: ${settings.font.content}px; font-weight: 600">${product.name}</div>
              <div style="font-size: ${settings.font.content}px; font-weight: 500">${product.variant}${is_novar_noopt ? "" : " - "}${product.options}</div>
              <div>${list_modifier.join("")}</div>
            </div>
          `,
        });
      }
    }

    for (let index = 0; index < files.length; index++) {
      const { file, html } = files[index];
      const is_exist = await fs.existsSync(file);

      console.log("is_exist >> ", is_exist);

      if (!is_exist) {
        await htmlPdf.create(html, {
          height      : settings.height + "mm",
          width       : settings.width + "mm",
          orientation : "horizontal",
          border      : "0"
        }).toFile(file, async (err) => {
            console.log("err create pdf", err);
          });
      }
    }

    const file_results = files.map(({ index, file }) => ({ index, file }));

    return res.json(file_results);
  } catch (error) {
    console.log("error create sticker >> ", error);

    return res.status(400).send("FAILED");
  }
});

async function print_sticker(req) {
  try {
    let total_qty = 0;
    let page = 0;
    const date = new Date().toLocaleString();
    const fulldate = get_date(date) + date.slice(10);

    req.body.basket.forEach(item => {
      total_qty += +item.qty;
    });

    for (let index = 0; index < req.body.basket.length; index++) {
      const product = req.body.basket[index];
      const options = {
        height: "3cm",
        width: "4cm",
        orientation: "horizontal",
        border: "0"
      }
      const list_modifier = product.modifiers.map(_ => {
        console.log("modifier >> ", _)
        return `<div style="font-size: 8px; font-family: Arial, Helvetica, sans-serif;">⊙ ${_.type} - ${_.detail.name || _.name}</div>`
      });

      for (let _index = 0; _index < product.qty; _index++) {
        page += 1
        const doc = {
          html: `
          <div style="font-weight: 500; font-family: Arial, Helvetica, sans-serif; height: 2.5cm;">
            <div style="position: absolute; top: 8px; font-size: 10px; font-weight: 600; width: 100%; border-bottom: 1px solid lightgrey;">
              ${product.order_number}
            </div>
            <div style="position: absolute; bottom: 4px; font-size: 9px;">
              ${page} of ${total_qty}
            </div>

            <div style="padding-top: 14px; font-size: 10px; font-weight: 600">${product.product_name}</div>
            <div style="font-size: 10px; font-weight: 500">${product.variant.n} - ${product.option.n || product.options}</div>
            <div>${list_modifier.join("")}</div>
          </div>
        `,
          data: {},
          path: "./sticker.pdf",
          type: ""
        }
        await pdf.create(doc, options);

        await ptp.print("./sticker.pdf", {
          printer: req.body.printer_name,
          orientation : "landscape",
          scale: "noscale",
        });

        // const obj = await Printer.find(x => x.name.startsWith(req.body.printer_name));
        // await obj.print('./sticker.pdf');
      }
    }

    return true;
  } catch (error) {
    console.log(error);

    return false;
  }
}

app.post("/sticker", async (req, res) => {
  try {
    print_sticker(req);

    return res.send("OK");
  } catch (error) {
    console.log(error);

    return res.send(String(error));
  }
})

function get_date(params) {
  const [_month, _date, _year] = params.slice(0, 10).split("/");
  const mm = +_month < 10 ? '0' + _month : _month;
  const dd = +_date < 10 ? '0' + _date : _date;

  return dd + "/" + mm + "/" + _year;
}

app.post("/push", (req, res) => {
  try {
    console.log("post ::", req.body);

    io.to("tc-connect").emit("tc-connect", req.body);

    return res.send("sended");
  } catch (error) {
    console.log(error);

    return res.send(String(error));
  }
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
  console.clear();
  console.log(`Socket.IO server running at http://localhost:${port}/`);
});
