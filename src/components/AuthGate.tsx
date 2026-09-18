import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import {
  Alert, Box, Button, Card, CardContent, Checkbox, CircularProgress, FormControlLabel,
  IconButton, InputAdornment, TextField, Typography
} from "@mui/material";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import type { User } from "firebase/auth";
import { AuthContext } from "../context/AuthContext";
import { isAuthConfigured, loginWithUsername, subscribeToAuthState } from "../services/firebase";

export function AuthGate({ children }: { children: ReactNode }) {
  // `checked` distingue "todavía no sabemos si hay sesión" de "sabemos que no hay":
  // sin esto, se ve un parpadeo del formulario de login incluso cuando la persona
  // ya estaba logueada (Firebase tarda un instante en confirmar la sesión guardada).
  const [checked, setChecked] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  // Por defecto la sesión se cierra sola al cerrar la app (persistencia de sesión).
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToAuthState((u) => {
      setUser(u);
      setChecked(true);
    });
    return unsubscribe;
  }, []);

  if (!checked) {
    return (
      <Box sx={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <CircularProgress />
      </Box>
    );
  }

  if (user) {
    return <AuthContext.Provider value={user}>{children}</AuthContext.Provider>;
  }

  if (!isAuthConfigured()) {
    return (
      <Box sx={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", p: 2 }}>
        <Alert severity="error" sx={{ maxWidth: 420 }}>
          La app no está configurada correctamente (falta configuración de autenticación).
          Contactá a quien la administra.
        </Alert>
      </Box>
    );
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await loginWithUsername(username, password, rememberMe);
      // No hace falta tocar `user` acá: subscribeToAuthState lo actualiza solo
      // apenas Firebase confirma el login. Sí limpiamos la contraseña del estado:
      // este componente no se desmonta al loguearse (sigue montado por si se
      // cierra sesión más adelante), así que sin esto quedaría en memoria y
      // reaparecería precargada en el campo la próxima vez que se viera el form.
      setPassword("");
      setShowPassword(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo iniciar sesión.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", p: 2 }}>
      <Card sx={{ maxWidth: 380, width: "100%" }}>
        <CardContent sx={{ p: { xs: 3, sm: 4 } }} component="form" onSubmit={submit}>
          <Typography variant="h5" fontWeight={800} gutterBottom>Acceso restringido</Typography>
          <Typography color="text.secondary" sx={{ mb: 3 }}>
            Ingresá tu usuario y contraseña para continuar.
          </Typography>
          <TextField
            autoFocus
            fullWidth
            label="Usuario"
            margin="normal"
            value={username}
            onChange={(e) => { setUsername(e.target.value); setError(null); }}
            inputProps={{ autoCapitalize: "none", autoCorrect: "off", "aria-label": "Usuario" }}
          />
          <TextField
            fullWidth
            type={showPassword ? "text" : "password"}
            label="Contraseña"
            margin="normal"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError(null); }}
            inputProps={{ "aria-label": "Contraseña" }}
            slotProps={{
              input: {
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                      edge="end"
                      tabIndex={-1}
                    >
                      {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                    </IconButton>
                  </InputAdornment>
                )
              }
            }}
          />
          <FormControlLabel
            sx={{ mt: 1 }}
            control={
              <Checkbox
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
            }
            label="Mantener sesión iniciada"
          />
          {error && <Alert severity="error" sx={{ mt: 1 }}>{error}</Alert>}
          <Button
            type="submit"
            fullWidth
            variant="contained"
            size="large"
            disabled={loading || !username || !password}
            sx={{ mt: 3 }}
          >
            {loading ? <CircularProgress size={22} color="inherit" /> : "Ingresar"}
          </Button>
        </CardContent>
      </Card>
    </Box>
  );
}
