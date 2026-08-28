import { useEffect, useState } from "react";
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField } from "@mui/material";
import { parseQuantity } from "../utils/validation";

interface Props { open: boolean; onClose: () => void; onConfirm: (n: number) => void; initialValue?: number; }

export function QuantityModal({ open, onClose, onConfirm, initialValue }: Props) {
  const [value, setValue] = useState("");
  const [error, setError] = useState(false);
  // Si el ítem ya tenía un conteo cargado (por ejemplo, se volvió con "Atrás" a
  // revisarlo), lo mostramos precargado: "Cancelar" entonces significa "dejarlo
  // como estaba", no "vaciarlo".
  useEffect(() => {
    if (open) {
      setValue(initialValue !== undefined ? String(initialValue) : "");
      setError(false);
    }
  }, [open, initialValue]);

  const confirm = () => {
    // allowZero: contar 0 unidades es un resultado válido (ítem agotado), no un error de carga.
    const n = parseQuantity(value, { allowZero: true });
    if (n === null) { setError(true); return; }
    onConfirm(n);
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs" disableScrollLock>
      <DialogTitle>¿Cuánto contaste?</DialogTitle>
      <DialogContent>
        <TextField autoFocus fullWidth type="number" label="Cantidad contada" margin="dense"
          value={value} error={error} helperText={error ? "Ingresá un número entero mayor o igual a 0." : ""}
          onChange={(e) => { setValue(e.target.value); setError(false); }}
          inputProps={{ min: 0, step: 1 }} />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" onClick={confirm}>Confirmar</Button>
      </DialogActions>
    </Dialog>
  );
}
