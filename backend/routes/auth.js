const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const pool = require("../db");

const router = express.Router();

const COOKIE_NAME = "auth_token";

// ======================================================
// Función auxiliar: crear JWT
// ======================================================

function crearToken(user) {
  return jwt.sign(
    {
      id: user.id,
      username: user.username,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: "7d",
    }
  );
}

// ======================================================
// Función auxiliar: guardar JWT en cookie
// ======================================================

function guardarToken(res, token) {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

// ======================================================
// POST /api/auth/register
// ======================================================

router.post("/register", async (req, res) => {
  try {
    const { username, password } = req.body;

    // -----------------------------
    // Validación backend
    // -----------------------------

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: "El usuario y la contraseña son obligatorios.",
      });
    }

    if (typeof username !== "string" || typeof password !== "string") {
      return res.status(400).json({
        success: false,
        message: "Los datos enviados no son válidos.",
      });
    }

    const usernameClean = username.trim();

    if (usernameClean.length < 3) {
      return res.status(400).json({
        success: false,
        message: "El usuario debe tener al menos 3 caracteres.",
      });
    }

    if (usernameClean.length > 50) {
      return res.status(400).json({
        success: false,
        message: "El usuario no puede superar los 50 caracteres.",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "La contraseña debe tener al menos 8 caracteres.",
      });
    }

    // Solo permitimos letras, números, _, -, .
    if (!/^[a-zA-Z0-9_.-]+$/.test(usernameClean)) {
      return res.status(400).json({
        success: false,
        message:
          "El nombre de usuario contiene caracteres no permitidos.",
      });
    }

    // -----------------------------
    // Comprobar si existe
    // -----------------------------

    const [usuariosExistentes] = await pool.query(
      `
      SELECT id
      FROM users
      WHERE LOWER(username) = LOWER(?)
      `,
      [usernameClean]
    );

    if (usuariosExistentes.length > 0) {
      return res.status(409).json({
        success: false,
        message: "Ese nombre de usuario ya está registrado.",
      });
    }

    // -----------------------------
    // Hashear contraseña
    // -----------------------------

    const passwordHash = await bcrypt.hash(password, 12);

    // -----------------------------
    // Crear usuario
    // -----------------------------

    const [resultado] = await pool.query(
      `
      INSERT INTO users (username, password)
      VALUES (?, ?)
      `,
      [usernameClean, passwordHash]
    );

    const user = {
      id: resultado.insertId,
      username: usernameClean,
    };

    // -----------------------------
    // Crear sesión
    // -----------------------------

    const token = crearToken(user);

    guardarToken(res, token);

    return res.status(201).json({
      success: true,
      message: "Usuario registrado correctamente.",
      user: {
        id: user.id,
        username: user.username,
      },
    });
  } catch (error) {
    console.error("REGISTER ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Ha ocurrido un error en el servidor.",
    });
  }
});

// ======================================================
// POST /api/auth/login
// ======================================================

router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    // -----------------------------
    // Validación backend
    // -----------------------------

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: "Debes introducir usuario y contraseña.",
      });
    }

    if (typeof username !== "string" || typeof password !== "string") {
      return res.status(400).json({
        success: false,
        message: "Los datos enviados no son válidos.",
      });
    }

    const usernameClean = username.trim();

    if (usernameClean.length < 3) {
      return res.status(400).json({
        success: false,
        message: "El nombre de usuario no es válido.",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "La contraseña no es válida.",
      });
    }

    // -----------------------------
    // Buscar usuario
    // -----------------------------

    const [usuarios] = await pool.query(
      `
      SELECT id, username, password
      FROM users
      WHERE LOWER(username) = LOWER(?)
      `,
      [usernameClean]
    );

    // Importante:
    // No decimos si el usuario existe o no.
    if (usuarios.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Usuario o contraseña incorrectos.",
      });
    }

    const user = usuarios[0];

    // -----------------------------
    // Comparar contraseña
    // -----------------------------

    const passwordCorrecta = await bcrypt.compare(
      password,
      user.password
    );

    if (!passwordCorrecta) {
      return res.status(401).json({
        success: false,
        message: "Usuario o contraseña incorrectos.",
      });
    }

    // -----------------------------
    // Crear JWT
    // -----------------------------

    const token = crearToken(user);

    guardarToken(res, token);

    // -----------------------------
    // Respuesta
    // -----------------------------

    return res.status(200).json({
      success: true,
      message: "Inicio de sesión correcto.",
      user: {
        id: user.id,
        username: user.username,
      },
    });
  } catch (error) {
    console.error("LOGIN ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Ha ocurrido un error en el servidor.",
    });
  }
});

// ======================================================
// POST /api/auth/logout
// ======================================================

router.post("/logout", (req, res) => {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  });

  return res.status(200).json({
    success: true,
    message: "Sesión cerrada correctamente.",
  });
});

// ======================================================
// GET /api/auth/me
// ======================================================

router.get("/me", async (req, res) => {
  try {
    const token = req.cookies[COOKIE_NAME];

    if (!token) {
      return res.status(401).json({
        success: false,
        authenticated: false,
        message: "No hay una sesión activa.",
      });
    }

    // -----------------------------
    // Verificar JWT
    // -----------------------------

    let decoded;

    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      return res.status(401).json({
        success: false,
        authenticated: false,
        message: "La sesión ha expirado o no es válida.",
      });
    }

    // -----------------------------
    // Buscar usuario en BD
    // -----------------------------

    const [usuarios] = await pool.query(
      `
      SELECT id, username, created_at
      FROM users
      WHERE id = ?
      `,
      [decoded.id]
    );

    if (usuarios.length === 0) {
      return res.status(401).json({
        success: false,
        authenticated: false,
        message: "El usuario ya no existe.",
      });
    }

    const user = usuarios[0];

    return res.status(200).json({
      success: true,
      authenticated: true,
      user: {
        id: user.id,
        username: user.username,
        createdAt: user.created_at,
      },
    });
  } catch (error) {
    console.error("ME ERROR:", error);

    return res.status(500).json({
      success: false,
      authenticated: false,
      message: "Ha ocurrido un error en el servidor.",
    });
  }
});

module.exports = router;
