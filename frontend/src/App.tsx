import { useEffect, useState } from "react";
import "./App.css";
import AppLoadingScreen from "./AppLoadingScreen";

const API_URL = "http://localhost:3000";

type User = {
  id: number;
  username: string;
};

type AlertType = "success" | "error";
type AuthMode = "login" | "register";

function App() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [authMode, setAuthMode] = useState<AuthMode>("login");

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  const [alert, setAlert] = useState<{
    type: AlertType;
    message: string;
  } | null>(null);

  const [user, setUser] = useState<User | null>(null);

  // =====================================================
  // Comprobar si ya existe una sesión
  // =====================================================

  async function comprobarSesion(): Promise<User | null> {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch(`${API_URL}/api/auth/me`, {
        method: "GET",
        credentials: "include",
        signal: controller.signal,
      });
      const data = await response.json();

      if (response.ok && data.authenticated) {
        return data.user as User;
      }
    } catch (error) {
      console.error("Error comprobando sesi\u00f3n:", error);
    } finally {
      window.clearTimeout(timeoutId);
    }

    return null;
  }

  useEffect(() => {
    let active = true;

    void comprobarSesion().then((sessionUser) => {
      if (active) {
        setUser(sessionUser);
        setCheckingSession(false);
      }
    });

    return () => {
      active = false;
    };
  }, []);

  // =====================================================
  // Validación frontend
  // =====================================================

  function validarFormulario(): boolean {
    setAlert(null);

    const usernameClean = username.trim();

    if (!usernameClean) {
      setAlert({
        type: "error",
        message: "Introduce tu nombre de usuario.",
      });

      return false;
    }

    if (usernameClean.length < 3) {
      setAlert({
        type: "error",
        message: "El usuario debe tener al menos 3 caracteres.",
      });

      return false;
    }

    if (usernameClean.length > 50) {
      setAlert({
        type: "error",
        message: "El usuario no puede superar los 50 caracteres.",
      });

      return false;
    }

    if (!/^[a-zA-Z0-9_.-]+$/.test(usernameClean)) {
      setAlert({
        type: "error",
        message:
          "El usuario solo puede contener letras, números, puntos, guiones y guiones bajos.",
      });

      return false;
    }

    if (!password) {
      setAlert({
        type: "error",
        message: "Introduce tu contraseña.",
      });

      return false;
    }

    if (password.length < 8) {
      setAlert({
        type: "error",
        message: "La contraseña debe tener al menos 8 caracteres.",
      });

      return false;
    }

    return true;
  }

  // =====================================================
  // LOGIN
  // =====================================================

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    // Limpiar alerta anterior
    setAlert(null);

    // Primera capa de seguridad: frontend
    if (!validarFormulario()) {
      return;
    }

    setLoading(true);

    try {
      const isRegistering = authMode === "register";
      const response = await fetch(`${API_URL}/api/auth/${isRegistering ? "register" : "login"}`, {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        // MUY IMPORTANTE:
        // permite que el navegador reciba la cookie
        // HttpOnly creada por Node.js.
        credentials: "include",

        body: JSON.stringify({
          username: username.trim(),
          password,
        }),
      });

      let data;

      try {
        data = await response.json();
      } catch {
        throw new Error("El servidor devolvió una respuesta inválida.");
      }

      // ================================================
      // LOGIN INCORRECTO
      // ================================================

      if (!response.ok) {
        setAlert({
          type: "error",
          message:
            data?.message ||
            "No se ha podido iniciar sesión. Comprueba tus credenciales.",
        });

        return;
      }

      // ================================================
      // LOGIN CORRECTO
      // ================================================

      setUser(data.user);
      setPassword("");
      setAlert({
        type: "success",
        message: data.message || (isRegistering ? "Cuenta creada correctamente." : "Inicio de sesi\u00f3n correcto."),
      });

      if (!isRegistering) {
        setTimeout(() => {
          window.location.href = "/dashboard";
        }, 700);
      }
    } catch (error) {
      console.error(`${authMode.toUpperCase()} ERROR:`, error);

      setAlert({
        type: "error",
        message:
          "No se ha podido conectar con el servidor. Comprueba que el backend esté funcionando.",
      });
    } finally {
      setLoading(false);
    }
  }

  // =====================================================
  // LOGOUT
  // =====================================================

  async function handleLogout() {
    try {
      await fetch(`${API_URL}/api/auth/logout`, {
        method: "POST",
        credentials: "include",
      });

      setUser(null);

      setAlert({
        type: "success",
        message: "Sesión cerrada correctamente.",
      });
    } catch (error) {
      console.error("LOGOUT ERROR:", error);

      setAlert({
        type: "error",
        message: "No se pudo cerrar la sesión.",
      });
    }
  }

  // =====================================================
  // Loading inicial
  // =====================================================

  if (checkingSession) {
    return <AppLoadingScreen />;
  }

  // =====================================================
  // Usuario autenticado
  // =====================================================

  if (user) {
    return (
      <main className="login-page">
        <div className="background">
          <div className="glow glow-one"></div>
          <div className="glow glow-two"></div>
          <div className="grid"></div>
        </div>

        <section className="authenticated-card">
          <div className="success-icon">
            <svg viewBox="0 0 24 24" fill="none">
              <path
                d="M5 12L10 17L19 7"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          <span className="authenticated-label">Sesión activa</span>

          <h1>
            ¡Hola, <strong>{user.username}</strong>!
          </h1>

          <p>Has iniciado sesión correctamente en tu cuenta.</p>

          <div className="authenticated-actions">
            <button
              className="login-button"
              onClick={() => {
                window.location.href = "/dashboard";
              }}
            >
              Ir al dashboard
            </button>

            <button className="logout-button" onClick={handleLogout}>
              Cerrar sesión
            </button>
          </div>

          {alert && (
            <div className={`alert ${alert.type}`}>
              <AlertIcon type={alert.type} />
              <span>{alert.message}</span>
            </div>
          )}
        </section>
      </main>
    );
  }

  // =====================================================
  // LOGIN
  // =====================================================

  return (
    <main className="login-page">
      {/* Fondo decorativo */}
      <div className="background">
        <div className="glow glow-one"></div>
        <div className="glow glow-two"></div>
        <div className="grid"></div>
      </div>

      <section className="login-container">
        {/* ==============================================
            PANEL IZQUIERDO
        ============================================== */}

        <div className="login-showcase">
          <div className="brand">
            <div className="brand-mark">
              <span></span>
              <span></span>
              <span></span>
            </div>

            <span>Mi Garage</span>
          </div>

          <div className="showcase-content">
            <span className="eyebrow">
              <span className="status-dot"></span>
              Plataforma segura
            </span>

            <h1>
              Todo lo que necesitas,
              <strong> en un solo lugar.</strong>
            </h1>

            <p>
              Gestiona tu cuenta, accede a tus proyectos y mantén todo
              organizado desde una experiencia rápida y sencilla.
            </p>

            <div className="stats">
              <div>
                <strong>24/7</strong>
                <span>Disponible</span>
              </div>

              <div className="stat-divider"></div>

              <div>
                <strong>100%</strong>
                <span>Seguro</span>
              </div>

              <div className="stat-divider"></div>

              <div>
                <strong>+10K</strong>
                <span>Usuarios</span>
              </div>
            </div>
          </div>

          <div className="showcase-footer">
            <div className="avatars">
              <div>JD</div>
              <div>MR</div>
              <div>AL</div>
              <div>+</div>
            </div>

            <span>Únete a nuestra comunidad</span>
          </div>
        </div>

        {/* ==============================================
            PANEL LOGIN
        ============================================== */}

        <div className="login-card-wrapper">
          <div className="login-card">
            <div className="mobile-brand">
              <div className="brand-mark">
                <span></span>
                <span></span>
                <span></span>
              </div>

              <span>Mi Garage</span>
            </div>

            <div className="login-header">
              <div className="welcome-icon">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M20 21V19C20 16.7909 18.2091 15 16 15H8C5.79086 15 4 16.7909 4 19V21"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />

                  <circle
                    cx="12"
                    cy="7"
                    r="4"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  />
                </svg>
              </div>

              <h2>{authMode === "login" ? "Bienvenido de nuevo" : "Crea tu cuenta"}</h2>

              <p>{authMode === "login" ? "Introduce tus credenciales para continuar" : "Regístrate para empezar a utilizar Mi Garage"}</p>
            </div>

            {/* ==========================================
                ALERTA
            ========================================== */}

            {alert && (
              <div className={`alert ${alert.type}`}>
                <AlertIcon type={alert.type} />

                <span>{alert.message}</span>

                <button
                  type="button"
                  onClick={() => setAlert(null)}
                  aria-label="Cerrar alerta"
                >
                  ×
                </button>
              </div>
            )}

            <form onSubmit={handleSubmit} className="login-form" noValidate>
              {/* ========================================
                  USERNAME
              ======================================== */}

              <div className="field">
                <label htmlFor="username">Nombre de usuario</label>

                <div className="input-wrapper">
                  <svg className="input-icon" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M20 21V19C20 16.7909 18.2091 15 16 15H8C5.79086 15 4 16.7909 4 19V21"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                    />

                    <circle
                      cx="12"
                      cy="7"
                      r="4"
                      stroke="currentColor"
                      strokeWidth="1.8"
                    />
                  </svg>

                  <input
                    id="username"
                    name="username"
                    type="text"
                    placeholder="Introduce tu usuario"
                    autoComplete="username"
                    value={username}
                    onChange={(e) => {
                      setUsername(e.target.value);

                      if (alert) {
                        setAlert(null);
                      }
                    }}
                    disabled={loading}
                  />
                </div>
              </div>

              {/* ========================================
                  PASSWORD
              ======================================== */}

              <div className="field">
                <div className="label-row">
                  <label htmlFor="password">Contraseña</label>

                  {authMode === "login" && <a
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();

                      setAlert({
                        type: "error",
                        message:
                          "La recuperación de contraseña todavía no está configurada.",
                      });
                    }}
                  >
                    ¿Has olvidado tu contraseña?
                  </a>}
                </div>

                <div className="input-wrapper">
                  <svg className="input-icon" viewBox="0 0 24 24" fill="none">
                    <rect
                      x="4"
                      y="10"
                      width="16"
                      height="11"
                      rx="2"
                      stroke="currentColor"
                      strokeWidth="1.8"
                    />

                    <path
                      d="M8 10V7C8 4.79086 9.79086 3 12 3C14.2091 3 16 4.79086 16 7V10"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                    />
                  </svg>

                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Introduce tu contraseña"
                    autoComplete={authMode === "register" ? "new-password" : "current-password"}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);

                      if (alert) {
                        setAlert(null);
                      }
                    }}
                    disabled={loading}
                  />

                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={loading}
                    aria-label={
                      showPassword ? "Ocultar contraseña" : "Mostrar contraseña"
                    }
                  >
                    {showPassword ? (
                      <svg viewBox="0 0 24 24" fill="none">
                        <path
                          d="M3 3L21 21"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                        />

                        <path
                          d="M10.58 10.58C10.21 10.95 10 11.46 10 12C10 13.1 10.9 14 12 14C12.54 14 13.05 13.79 13.42 13.42"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                        />

                        <path
                          d="M9.88 5.09C10.57 4.89 11.28 4.8 12 4.8C17.25 4.8 20.5 12 20.5 12C20.5 12 19.15 14.99 16.45 16.7"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                        />

                        <path
                          d="M6.61 6.61C4.35 8.2 3.5 10.12 3.5 12C3.5 12 6.75 19.2 12 19.2C13.27 19.2 14.46 18.88 15.5 18.38"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                        />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" fill="none">
                        <path
                          d="M3 12C3 12 6.5 5 12 5C17.5 5 21 12 21 12C21 12 17.5 19 12 19C6.5 19 3 12 3 12Z"
                          stroke="currentColor"
                          strokeWidth="1.8"
                        />

                        <circle
                          cx="12"
                          cy="12"
                          r="3"
                          stroke="currentColor"
                          strokeWidth="1.8"
                        />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* ========================================
                  REMEMBER
              ======================================== */}

              {authMode === "login" && <label className="remember">
                <input type="checkbox" disabled={loading} />

                <span className="custom-checkbox"></span>

                <span>Recordarme en este dispositivo</span>
              </label>}

              {/* ========================================
                  LOGIN BUTTON
              ======================================== */}

              <button
                type="submit"
                className={`login-button ${loading ? "loading" : ""}`}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="spinner"></span>
                    {authMode === "register" ? "Creando cuenta..." : "Iniciando sesi\u00f3n..."}
                  </>
                ) : (
                  <>
                    {authMode === "register" ? "Crear cuenta" : "Iniciar sesi\u00f3n"}
                    <svg viewBox="0 0 24 24" fill="none">
                      <path
                        d="M5 12H19"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />

                      <path
                        d="M13 6L19 12L13 18"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </>
                )}
              </button>
            </form>

              {authMode === "login" && <div className="divider">
              <span>o continúa con</span>
              </div>}

            {authMode === "login" && <button
              className="social-login"
              type="button"
              onClick={() => {
                setAlert({
                  type: "error",
                  message:
                    "El inicio de sesión con Google todavía no está configurado.",
                });
              }}
            >
              <svg viewBox="0 0 24 24" fill="none">
                <path
                  d="M21.8 12.2C21.8 11.5 21.7 10.8 21.6 10.2H12V14H17.4C17.2 15.2 16.5 16.3 15.5 17V19.5H18.8C20.7 17.8 21.8 15.2 21.8 12.2Z"
                  fill="currentColor"
                />

                <path
                  d="M12 22C14.7 22 17 21.1 18.8 19.5L15.5 17C14.6 17.6 13.4 18 12 18C9.4 18 7.2 16.2 6.4 13.8H3V16.4C4.7 19.7 8.1 22 12 22Z"
                  fill="currentColor"
                />

                <path
                  d="M6.4 13.8C6.2 13.2 6.1 12.6 6.1 12C6.1 11.4 6.2 10.8 6.4 10.2V7.6H3C2.4 8.9 2 10.4 2 12C2 13.6 2.4 15.1 3 16.4L6.4 13.8Z"
                  fill="currentColor"
                />

                <path
                  d="M12 6C13.5 6 14.9 6.5 16 7.6L18.9 4.7C17 2.9 14.7 2 12 2C8.1 2 4.7 4.3 3 7.6L6.4 10.2C7.2 7.8 9.4 6 12 6Z"
                  fill="currentColor"
                />
              </svg>
              Continuar con Google
            </button>}

            <p className="register">
              {authMode === "login" ? "\u00bfTodav\u00eda no tienes una cuenta?" : "\u00bfYa tienes una cuenta?"}
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  setAuthMode(authMode === "login" ? "register" : "login");
                  setAlert(null);
                  setPassword("");
                  setShowPassword(false);
                }}
              >
                {authMode === "login" ? "Crear una cuenta" : "Iniciar sesi\u00f3n"}
              </a>
            </p>

            <div className="security">
              <svg viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 3L20 6V11C20 16 16.5 19.5 12 21C7.5 19.5 4 16 4 11V6L12 3Z"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinejoin="round"
                />

                <path
                  d="M9 12L11 14L15 10"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Tus datos están protegidos y cifrados
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

// =====================================================
// Icono de alertas
// =====================================================

function AlertIcon({ type }: { type: AlertType }) {
  if (type === "success") {
    return (
      <svg viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />

        <path
          d="M8 12L10.5 14.5L16 9"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />

      <path
        d="M12 8V13"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />

      <circle cx="12" cy="16" r="1" fill="currentColor" />
    </svg>
  );
}

export default App;
