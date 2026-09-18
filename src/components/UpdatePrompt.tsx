import { Button, IconButton, Snackbar } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { useRegisterSW } from "virtual:pwa-register/react";

/**
 * Avisa cuando hay una versión nueva de la app disponible, sin forzar nada:
 * si nadie toca "Actualizar", el conteo en curso sigue sin interrupciones y
 * la versión nueva se aplica sola recién la próxima vez que se abra la app.
 */
export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker
  } = useRegisterSW();

  return (
    <Snackbar
      open={needRefresh}
      message="Hay una versión nueva de la app disponible."
      action={
        <>
          <Button color="inherit" size="small" onClick={() => updateServiceWorker(true)}>
            Actualizar
          </Button>
          <IconButton
            size="small"
            color="inherit"
            aria-label="Cerrar aviso de actualización"
            onClick={() => setNeedRefresh(false)}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </>
      }
    />
  );
}
