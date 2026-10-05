import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { SplashScreen } from "@capacitor/splash-screen";
import "./AppLoadingScreen.css";

/** Full-screen frontend loading view shown until the initial session check ends. */
export default function AppLoadingScreen() {
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      void SplashScreen.hide().catch((error: unknown) => {
        // The frontend remains usable even if native splash dismissal fails.
        console.warn("No se pudo ocultar el splash nativo:", error);
      });
    }
  }, []);

  return (
    <main className="app-loading-screen" role="status" aria-live="polite">
      <div className="loading-brand" aria-label="Mi Garage">
        <div className="brand-mark" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <span>Mi Garage</span>
      </div>
      <p className="loading-message">Cargando tus vehiculos...</p>
      <div className="loading-indicator" aria-hidden="true" />
    </main>
  );
}
