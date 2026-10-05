require("dotenv").config();

const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

const authRoutes = require("./routes/auth");

const app = express();

const PORT = process.env.PORT || 3000;

// ======================================================
// Seguridad
// ======================================================

app.use(helmet());

// ======================================================
// CORS
// ======================================================

app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
  })
);

// ======================================================
// Body parser
// ======================================================

app.use(express.json({ limit: "10kb" }));

app.use(cookieParser());

// ======================================================
// Rate limit para autenticación
// ======================================================

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message:
      "Demasiados intentos. Espera unos minutos antes de volver a intentarlo.",
  },
});

// ======================================================
// Rutas
// ======================================================

app.use("/api/auth", authLimiter, authRoutes);

// ======================================================
// Health check
// ======================================================

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "API funcionando correctamente.",
  });
});

// ======================================================
// Ruta 404
// ======================================================

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Ruta no encontrada.",
  });
});

// ======================================================
// Error global
// ======================================================

app.use((err, req, res, next) => {
  console.error(err);

  res.status(500).json({
    success: false,
    message: "Error interno del servidor.",
  });
});

// ======================================================
// Start
// ======================================================

app.listen(PORT, () => {
  console.log(`🚀 API ejecutándose en http://localhost:${PORT}`);
});