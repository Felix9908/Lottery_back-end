const express = require("express");
const cors = require("cors");
const mysql2 = require("mysql2");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const upload = multer({ dest: "uploads/" });
const fs = require("fs");

const app = express();
app.use(express.json());
app.use(cors());
const keys = require("./settings/keys");
const secret_key = keys.key;
app.use(express.static("uploads"));


const port = 4000;

// Configuración de la base de datos
const db = mysql2.createPool({
  host: "localhost",
  user: "root",
  password: "",
  database: "lottery",
});

verifyToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (token == null) return res.sendStatus(403);
  jwt.verify(token, "secret_key", (err, user) => {
    if (err) return res.sendStatus(404);
    req.user = user;
    next();
  });
};

// Ruta para el inicio de sesión
app.post("/login", (req, res) => {
  const username = req.body.username;
  const password = req.body.password;
  if (!username || !password) {
    res.status(400).send("No se encontraron usuario o contraseña");
  }
  db.execute(
    `select * from users where username = ? and password = ?`,
    [username, password],
    (err, data) => {
      if (err) {
        console.log(err);
      } else if(data.length > 0) {
        const payload = {
          check: true,
          data: data,
        };
        jwt.sign(payload, secret_key, (err, token) => {
          if (err) {
            console.log(err);
          } else {
            res.send({
              msg: "AUTEMTICACION EXITOSA",
              token: token,
              userData: data,
            });
          }
        });
      }else{
        res.status(200).send("user or password incorrect")
      }
    }
  );
});

app.put("/logout",  function (req, res) {
  const authHeader = req.headers["authorization"];
  jwt.sign(authHeader, "secret_key", { expiresIn: 1 }, (logout, err) => {
    if (logout) {
      res.send({ msg: "Has sido desconectado" });
    } else {
      res.send({ msg: "Error" });
    }
  });
});

// Crear oferta
app.post(
  "/addOffer",
  upload.single("image"),
  function (req, res, next) {
    const imageFile = req.file;
    const { offerName, description } = req.body;

    // Verificar que se proporcionaron todos los datos necesarios
    if (!imageFile || !offerName || !description) {
      return res.status(400).json({ error: "Todos los campos son requeridos" });
    }

    const { filename, path } = imageFile;

    // Consulta SQL corregida
    const sql =
      "INSERT INTO offers (productName, nameImg, imagePath, description) VALUES (?, ?, ?, ?)";

    const values = [offerName, filename, path, description];

    db.query(sql, values, function (err, result) {
      if (err) {
        console.error("Error al insertar datos en la tabla SQL:", err);
        return res
          .status(500)
          .json({ error: "Error al insertar datos en la tabla SQL" });
      } else {
        return res
          .status(200)
          .json({ message: "Producto subido exitosamente" });
      }
    });
  }
);

app.post("/createUser", (req, res) => {
  const { username, full_name, telephone_number, email, password, priv } =
    req.body;

  // Validación de campos
  if (!username || !full_name || !email || !password || !priv) {
    return res.status(400).json({ error: "Todos los campos son requeridos" });
  }

  // Crear una nueva entrada de usuario en la base de datos
  const newUser = {
    username,
    full_name,
    telephone_number,
    email,
    password, // Recuerda almacenar contraseñas de forma segura
    priv,
  };

  // Insertar newUser en la base de datos (debe implementarse la lógica de conexión a la base de datos)
  // Ejemplo con MySQL
  db.query("INSERT INTO usuarios SET ?", newUser, (err, result) => {
    if (err) {
      console.error("Error al insertar usuario en la base de datos:", err);
      return res.status(500).json({ error: "Error al crear el usuario" });
    } else {
      return res.status(201).json({ message: "Usuario creado exitosamente" });
    }
  });
});

// Ruta para obtener todas las ofertas
app.get("/getOffers", (req, res) => {
  // Consulta SQL para seleccionar todas las ofertas
  const sql = "SELECT * FROM offers";

  // Ejecutar la consulta en la base de datos
  db.query(sql, (err, results) => {
    if (err) {
      console.error("Error al obtener las ofertas:", err);
      res.status(500).json({ error: "Error al obtener las ofertas" });
    } else {
      // Enviar los resultados como respuesta en formato JSON
      res.status(200).json(results);
    }
  });
});

app.listen(port, () =>
  console.log(`El servodor esta activo en el puerto ${port}`)
);
