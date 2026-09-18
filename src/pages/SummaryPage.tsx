import { useMemo, useState } from "react";
import {
  Alert, Autocomplete, Box, Button, Card, CardContent, CircularProgress, Container,
  Dialog, DialogActions, DialogContent, DialogTitle, Divider, IconButton, Stack,
  Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import { exportOrder } from "../services/excel.service";
import { isGoogleSheetsConfigured, uploadOrderToGoogleSheets } from "../services/googleSheets.service";
import { warehouseLabel } from "../constants/warehouse";
import { computeOrderLines } from "../utils/order";
import { parseQuantity } from "../utils/validation";
import { useCatalog } from "../hooks/useCatalog";
import { useInventoryStore } from "../store/inventory.store";
import type { InventoryItem, OrderLine } from "../types";

type UploadState = "idle" | "loading" | "success" | "error";

// Quién puede editar la cantidad de una línea: una calculada automáticamente
// (ajusta un override, sin tocar el cálculo original) o una agregada a mano.
type EditTarget = { codigo: string; source: "auto" | "manual" };

export function SummaryPage({ onNewOrder }: { onNewOrder: () => void }) {
  const { warehouse, counts } = useInventoryStore();
  const catalog = useCatalog(warehouse);
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const sheetsEnabled = isGoogleSheetsConfigured();

  // Se pide un ítem cuando lo contado <= mínimo; la cantidad a pedir es (máximo - contado).
  const autoLines = useMemo(() => computeOrderLines(catalog, counts), [catalog, counts]);
  const countedItems = Object.keys(counts).length;

  // Ediciones manuales sobre el cálculo automático (por código) y líneas agregadas
  // a mano, aparte: así una corrección de último momento no se pierde si el
  // catálogo se actualiza en segundo plano (ver useCatalog).
  const [overrides, setOverrides] = useState<Record<string, number>>({});
  const [manualLines, setManualLines] = useState<OrderLine[]>([]);

  const lines: OrderLine[] = useMemo(() => {
    const auto = autoLines.map((l) => ({ ...l, cantidad: overrides[l.codigo] ?? l.cantidad }));
    return [...auto, ...manualLines];
  }, [autoLines, overrides, manualLines]);

  const [editTarget, setEditTarget] = useState<EditTarget | null>(null);
  const [editValue, setEditValue] = useState("");
  const [editError, setEditError] = useState(false);

  const [addOpen, setAddOpen] = useState(false);
  const [addItem, setAddItem] = useState<InventoryItem | null>(null);
  const [addValue, setAddValue] = useState("");
  const [addError, setAddError] = useState(false);

  const usedCodes = useMemo(() => new Set(lines.map((l) => l.codigo)), [lines]);
  const addableItems = useMemo(() => catalog.filter((i) => !usedCodes.has(i.codigo)), [catalog, usedCodes]);

  const openEdit = (line: OrderLine, source: EditTarget["source"]) => {
    setEditTarget({ codigo: line.codigo, source });
    setEditValue(String(line.cantidad));
    setEditError(false);
  };

  const confirmEdit = () => {
    if (!editTarget) return;
    const n = parseQuantity(editValue);
    if (n === null) { setEditError(true); return; }
    if (editTarget.source === "auto") {
      setOverrides((prev) => ({ ...prev, [editTarget.codigo]: n }));
    } else {
      setManualLines((prev) => prev.map((l) => (l.codigo === editTarget.codigo ? { ...l, cantidad: n } : l)));
    }
    setEditTarget(null);
  };

  const confirmAdd = () => {
    if (!addItem) return;
    const n = parseQuantity(addValue);
    if (n === null) { setAddError(true); return; }
    setManualLines((prev) => [...prev, { codigo: addItem.codigo, nombre: addItem.nombre, cantidad: n }]);
    setAddOpen(false);
    setAddItem(null);
    setAddValue("");
    setAddError(false);
  };

  const handleUpload = async () => {
    if (!warehouse || lines.length === 0 || uploadState === "loading") return;
    setUploadState("loading");
    setUploadError(null);
    try {
      await uploadOrderToGoogleSheets(warehouse, lines);
      setUploadState("success");
    } catch (err) {
      // Cualquier falla (login cancelado, sin permiso, sin red, mal configurado) se
      // muestra como mensaje y nunca deja a la página en un estado roto.
      setUploadState("error");
      setUploadError(err instanceof Error ? err.message : "Error inesperado al subir el pedido.");
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 2, sm: 4 } }}>
      <Card sx={{ maxWidth: 1000, mx: "auto" }}>
        <CardContent sx={{ p: { xs: 2, sm: 4 } }}>
          <Typography variant="h4" fontWeight={800} gutterBottom>Resumen</Typography>
          <Typography color="text.secondary" sx={{ mb: 1 }}>Pedido {warehouseLabel(warehouse)}</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            {countedItems} ítems contados · {lines.length} necesitan reposición
          </Typography>
          {lines.length === 0 ? <Alert severity="info">No hay ítems por pedir según lo contado.</Alert> : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Código</TableCell>
                  <TableCell>Nombre</TableCell>
                  <TableCell align="right">Cantidad</TableCell>
                  <TableCell align="right" />
                </TableRow>
              </TableHead>
              <TableBody>
                {autoLines.map((l) => {
                  const cantidad = overrides[l.codigo] ?? l.cantidad;
                  return (
                    <TableRow key={l.codigo}>
                      <TableCell>{l.codigo}</TableCell>
                      <TableCell>{l.nombre}</TableCell>
                      <TableCell align="right">{cantidad}</TableCell>
                      <TableCell align="right">
                        <IconButton
                          size="small"
                          aria-label={`Editar cantidad de ${l.nombre}`}
                          onClick={() => openEdit({ ...l, cantidad }, "auto")}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {manualLines.map((l) => (
                  <TableRow key={l.codigo}>
                    <TableCell>{l.codigo}</TableCell>
                    <TableCell>{l.nombre}</TableCell>
                    <TableCell align="right">{l.cantidad}</TableCell>
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        aria-label={`Editar cantidad de ${l.nombre}`}
                        onClick={() => openEdit(l, "manual")}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          <Box sx={{ mt: 2 }}>
            <Button size="small" startIcon={<AddIcon />} onClick={() => setAddOpen(true)} disabled={!warehouse}>
              Agregar ítem
            </Button>
          </Box>

          {uploadState === "success" && (
            <Alert severity="success" sx={{ mt: 2 }}>Pedido subido a Google Sheets correctamente.</Alert>
          )}
          {uploadState === "error" && uploadError && (
            <Alert severity="error" sx={{ mt: 2 }}>{uploadError}</Alert>
          )}

          <Divider sx={{ my: 3 }} />
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <Button fullWidth variant="contained" disabled={!lines.length} onClick={() => exportOrder(warehouse!, lines)}>Descargar Excel</Button>
            {sheetsEnabled && (
              <Button
                fullWidth
                variant="outlined"
                disabled={!lines.length || uploadState === "loading"}
                onClick={handleUpload}
                startIcon={uploadState === "loading" ? <CircularProgress size={16} /> : undefined}
              >
                {uploadState === "loading" ? "Subiendo..." : "Subir a Google Sheets"}
              </Button>
            )}
            <Button fullWidth variant="text" onClick={onNewOrder}>Nuevo pedido</Button>
          </Stack>
          {!sheetsEnabled && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="caption" color="text.secondary">
                La subida a Google Sheets no está configurada en este despliegue.
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>

      <Dialog open={editTarget !== null} onClose={() => setEditTarget(null)}>
        <DialogTitle>Editar cantidad a pedir</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            type="number"
            label="Cantidad a pedir"
            margin="dense"
            value={editValue}
            error={editError}
            helperText={editError ? "Ingresá un número entero mayor a 0." : ""}
            onChange={(e) => { setEditValue(e.target.value); setEditError(false); }}
            inputProps={{ min: 1, step: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditTarget(null)}>Cancelar</Button>
          <Button variant="contained" onClick={confirmEdit}>Guardar</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={addOpen} onClose={() => setAddOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Agregar ítem al pedido</DialogTitle>
        <DialogContent>
          <Autocomplete
            options={addableItems}
            getOptionLabel={(item) => `${item.codigo} — ${item.nombre}`}
            value={addItem}
            onChange={(_e, value) => setAddItem(value)}
            renderInput={(params) => <TextField {...params} label="Ítem" margin="dense" autoFocus />}
          />
          <TextField
            fullWidth
            type="number"
            label="Cantidad a pedir"
            margin="dense"
            value={addValue}
            error={addError}
            helperText={addError ? "Ingresá un número entero mayor a 0." : ""}
            onChange={(e) => { setAddValue(e.target.value); setAddError(false); }}
            inputProps={{ min: 1, step: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddOpen(false)}>Cancelar</Button>
          <Button variant="contained" disabled={!addItem} onClick={confirmAdd}>Agregar</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
