import { useState } from "react";
import {
  Alert, Box, Button, Card, CardContent, CircularProgress, Container, Divider,
  Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography
} from "@mui/material";
import { exportOrder } from "../services/excel.service";
import { isGoogleSheetsConfigured, uploadOrderToGoogleSheets } from "../services/googleSheets.service";
import { warehouseLabel } from "../constants/warehouse";
import { computeOrderLines } from "../utils/order";
import { useCatalog } from "../hooks/useCatalog";
import { useInventoryStore } from "../store/inventory.store";

type UploadState = "idle" | "loading" | "success" | "error";

export function SummaryPage({ onNewOrder }: { onNewOrder: () => void }) {
  const { warehouse, counts } = useInventoryStore();
  const catalog = useCatalog(warehouse);
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const sheetsEnabled = isGoogleSheetsConfigured();

  // Se pide un ítem cuando lo contado < mínimo; la cantidad a pedir es (máximo - contado).
  const lines = computeOrderLines(catalog, counts);
  const countedItems = Object.keys(counts).length;

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
              <TableHead><TableRow><TableCell>Código</TableCell><TableCell>Nombre</TableCell><TableCell align="right">Cantidad</TableCell></TableRow></TableHead>
              <TableBody>{lines.map((l) => <TableRow key={l.codigo}><TableCell>{l.codigo}</TableCell><TableCell>{l.nombre}</TableCell><TableCell align="right">{l.cantidad}</TableCell></TableRow>)}</TableBody>
            </Table>
          )}

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
    </Container>
  );
}
