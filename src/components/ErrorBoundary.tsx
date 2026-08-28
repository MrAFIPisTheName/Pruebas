import { Component, type ErrorInfo, type ReactNode } from "react";
import { Alert, Box, Button, Container, Stack, Typography } from "@mui/material";

interface Props {
  children: ReactNode;
  /** Se invoca cuando el usuario elige reintentar, para permitir limpiar estado externo (stores, etc). */
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  message: string | null;
}

/**
 * Última línea de defensa: cualquier excepción no controlada en el árbol de React
 * (gestos táctiles, parseos, renders) terminaba antes en una pantalla en blanco total.
 * Este boundary la intercepta y ofrece una salida sin perder los datos guardados
 * (el store persiste en localStorage, así que "Reintentar" no borra el pedido).
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: null };

  static getDerivedStateFromError(error: unknown): State {
    return { hasError: true, message: error instanceof Error ? error.message : "Error desconocido" };
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    console.error("Error no controlado capturado por ErrorBoundary:", error, info.componentStack);
  }

  handleRetry = () => {
    this.props.onReset?.();
    this.setState({ hasError: false, message: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <Container maxWidth="sm" sx={{ py: 6 }}>
          <Stack spacing={2}>
            <Alert severity="error">Ocurrió un problema inesperado en la aplicación.</Alert>
            <Typography color="text.secondary">
              Tus datos guardados no se perdieron. Podés reintentar o volver al inicio.
            </Typography>
            <Box>
              <Button variant="contained" onClick={this.handleRetry}>Reintentar</Button>
            </Box>
          </Stack>
        </Container>
      );
    }
    return this.props.children;
  }
}
