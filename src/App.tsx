import { useState } from "react";
import { Box, Chip, CssBaseline, IconButton, Stack, ThemeProvider, Tooltip, Typography, createTheme, useMediaQuery } from "@mui/material";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import LightModeIcon from "@mui/icons-material/LightMode";
import LogoutIcon from "@mui/icons-material/Logout";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import { AuthGate } from "./components/AuthGate";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { useAuthUser } from "./context/AuthContext";
import { useUserRole } from "./hooks/useUserRole";
import { displayNameFromUser, logout } from "./services/firebase";
import { HomePage } from "./pages/HomePage";
import { InventoryPage } from "./pages/InventoryPage";
import { SummaryPage } from "./pages/SummaryPage";
import { AdminCatalogPage } from "./pages/AdminCatalogPage";
import { useInventoryStore } from "./store/inventory.store";

type Page = "home" | "inventory" | "summary" | "admin-catalog";

function TopBar({
  dark, onToggleDark, onOpenAdminCatalog
}: {
  dark: boolean;
  onToggleDark: () => void;
  onOpenAdminCatalog: () => void;
}) {
  const user = useAuthUser();
  const role = useUserRole(user);
  return (
    <header style={{
      position: "sticky", top: 0, zIndex: 10,
      background: dark ? "rgba(18,18,18,0.92)" : "rgba(255,255,255,0.92)",
      willChange: "transform"
    }}>
      <Box sx={{
        maxWidth: 1000, mx: "auto", px: 2, py: 1,
        display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 1
      }}>
        {user && (
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mr: "auto" }}>
            <Typography variant="body2" color="text.secondary">
              {displayNameFromUser(user)}
            </Typography>
            {role && <Chip label={role} size="small" variant="outlined" />}
          </Stack>
        )}
        {role === "Administrador/a" && (
          <Tooltip title="Cargar lista de ítems">
            <IconButton onClick={onOpenAdminCatalog} aria-label="Cargar lista de ítems">
              <UploadFileIcon />
            </IconButton>
          </Tooltip>
        )}
        <Tooltip title={dark ? "Modo claro" : "Modo oscuro"}>
          <IconButton onClick={onToggleDark} aria-label="Cambiar modo oscuro">
            {dark ? <LightModeIcon /> : <DarkModeIcon />}
          </IconButton>
        </Tooltip>
        {user && (
          <Tooltip title="Cerrar sesión">
            <IconButton onClick={() => logout()} aria-label="Cerrar sesión">
              <LogoutIcon />
            </IconButton>
          </Tooltip>
        )}
      </Box>
    </header>
  );
}

export default function App() {
  const [page, setPage] = useState<Page>("home");
  const [dark, setDark] = useState(useMediaQuery("(prefers-color-scheme: dark)"));
  const { warehouse, setWarehouse, reset } = useInventoryStore();
  const theme = createTheme({
    palette: { mode: dark ? "dark" : "light", primary: { main: dark ? "#90caf9" : "#1565c0" } },
    shape: { borderRadius: 14 },
    typography: { fontFamily: "Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }
  });

  // Si algo se rompe a mitad de un pedido, volvemos a "home" en vez de dejar la
  // pantalla en el estado que causó el error (que probablemente vuelva a fallar).
  const recoverFromError = () => {
    reset();
    setPage("home");
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <ErrorBoundary onReset={recoverFromError}>
        <AuthGate>
          <TopBar
            dark={dark}
            onToggleDark={() => setDark((v) => !v)}
            onOpenAdminCatalog={() => setPage("admin-catalog")}
          />
          {page === "home" && <HomePage value={warehouse} onChange={setWarehouse} onStart={() => setPage("inventory")} />}
          {page === "inventory" && <InventoryPage onFinish={() => setPage("summary")} />}
          {page === "summary" && <SummaryPage onNewOrder={() => { reset(); setPage("home"); }} />}
          {page === "admin-catalog" && <AdminCatalogPage onBack={() => setPage("home")} />}
        </AuthGate>
      </ErrorBoundary>
    </ThemeProvider>
  );
}
