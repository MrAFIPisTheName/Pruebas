import { useMemo, useState } from "react";
import {
  Alert, Box, Button, Card, CardContent, CircularProgress, Container,
  FormControl, InputLabel, MenuItem, Select, Typography
} from "@mui/material";
import type { SelectChangeEvent } from "@mui/material";
import { WAREHOUSE_LABELS } from "../constants/warehouse";
import { useAuthUser } from "../context/AuthContext";
import { displayNameFromUser, replaceCatalog, CatalogUploadError } from "../services/firebase";
import { useCatalog } from "../hooks/useCatalog";
import { catalogsAreIdentical, parseCatalogFile, CatalogParseError } from "../utils/catalogImport";
import type { InventoryItem, Warehouse } from "../types";

const WAREHOUSE_OPTIONS = Object.keys(WAREHOUSE_LABELS) as Warehouse[];

type UploadState = "idle" | "uploading" | "success" | "error";

export function AdminCatalogPage({ onBack }: { onBack: () => void }) {
  const user = useAuthUser();
  const [parsedItems, setParsedItems] = useState<InventoryItem[] | null>(null);
  const [skippedRows, setSkippedRows] = useState(0);
  const [selectedWarehouse, setSelectedWarehouse] = useState<Warehouse | "">("");
  const [parseError, setParseError] = useState<string | null>(null);
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  // Catálogo actualmente activo para el depósito elegido (el mismo que usa el
  // resto de la app: datos del build, o los de Firestore si ya se reemplazaron
  // antes). Sirve para detectar si el archivo subido es igual o distinto.
  const currentItems = useCatalog(selectedWarehouse || null);

  const isIdentical = useMemo(() => {
    if (!parsedItems || !selectedWarehouse) return null;
    return catalogsAreIdentical(parsedItems, currentItems);
  }, [parsedItems, currentItems, selectedWarehouse]);

  const resetFileState = () => {
    setParsedItems(null);
    setSkippedRows(0);
    setParseError(null);
    setUploadState("idle");
    setUploadError(null);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // permite volver a elegir el mismo archivo si hace falta
    if (!file) return;
    resetFileState();
    setFileName(file.name);
    try {
      const result = await parseCatalogFile(file);
      setParsedItems(result.items);
      setSkippedRows(result.skippedRows);
      if (result.detectedWarehouse) {
        setSelectedWarehouse(result.detectedWarehouse);
      }
    } catch (err) {
      setParseError(err instanceof CatalogParseError ? err.message : "No se pudo procesar el archivo.");
    }
  };

  const handleWarehouseChange = (e: SelectChangeEvent) => {
    setSelectedWarehouse(e.target.value as Warehouse);
    setUploadState("idle");
    setUploadError(null);
  };

  const handleConfirm = async () => {
    if (!parsedItems || !selectedWarehouse) return;
    setUploadState("uploading");
    setUploadError(null);
    try {
      await replaceCatalog(selectedWarehouse, parsedItems, displayNameFromUser(user) || "desconocido");
      setUploadState("success");
    } catch (err) {
      setUploadState("error");
      setUploadError(err instanceof CatalogUploadError ? err.message : "No se pudo guardar la lista nueva.");
    }
  };

  return (
    <Container maxWidth="sm" sx={{ py: { xs: 2, sm: 4 } }}>
      <Card>
        <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
          <Typography variant="h5" fontWeight={800} gutterBottom>Cargar lista de ítems</Typography>
          <Typography color="text.secondary" sx={{ mb: 3 }}>
            Subí un Excel de "Depot Checklist" para reemplazar la lista de un depósito.
          </Typography>

          <Button variant="outlined" component="label" fullWidth sx={{ mb: 2 }}>
            {fileName ?? "Elegir archivo Excel"}
            <input type="file" accept=".xlsx,.xls" hidden onChange={handleFileChange} />
          </Button>

          {parseError && <Alert severity="error" sx={{ mb: 2 }}>{parseError}</Alert>}

          {parsedItems && (
            <>
              <Typography sx={{ mb: 1 }}>
                Se leyeron <strong>{parsedItems.length}</strong> ítems del archivo.
                {skippedRows > 0 && ` (${skippedRows} fila(s) se salteó/aron por estar incompleta(s).)`}
              </Typography>

              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel id="warehouse-select-label">Depósito de destino</InputLabel>
                <Select
                  labelId="warehouse-select-label"
                  label="Depósito de destino"
                  value={selectedWarehouse}
                  onChange={handleWarehouseChange}
                >
                  {WAREHOUSE_OPTIONS.map((w) => (
                    <MenuItem key={w} value={w}>{WAREHOUSE_LABELS[w]}</MenuItem>
                  ))}
                </Select>
              </FormControl>

              {selectedWarehouse && isIdentical === true && (
                <Alert severity="info" sx={{ mb: 2 }}>
                  Esta lista es idéntica a la que ya está cargada para {WAREHOUSE_LABELS[selectedWarehouse]}.
                  No hay nada para reemplazar.
                </Alert>
              )}

              {selectedWarehouse && isIdentical === false && uploadState !== "success" && (
                <Alert severity="warning" sx={{ mb: 2 }}>
                  Esta lista es distinta a la que está cargada actualmente para {WAREHOUSE_LABELS[selectedWarehouse]}.
                  Confirmá para reemplazarla.
                </Alert>
              )}

              {uploadState === "success" && (
                <Alert severity="success" sx={{ mb: 2 }}>
                  Lista reemplazada correctamente para {selectedWarehouse && WAREHOUSE_LABELS[selectedWarehouse]}.
                </Alert>
              )}
              {uploadState === "error" && uploadError && (
                <Alert severity="error" sx={{ mb: 2 }}>{uploadError}</Alert>
              )}

              <Button
                variant="contained"
                fullWidth
                disabled={!selectedWarehouse || isIdentical !== false || uploadState === "uploading" || uploadState === "success"}
                onClick={handleConfirm}
                startIcon={uploadState === "uploading" ? <CircularProgress size={16} color="inherit" /> : undefined}
              >
                {uploadState === "uploading" ? "Guardando..." : "Confirmar y reemplazar"}
              </Button>
            </>
          )}

          <Box sx={{ mt: 3 }}>
            <Button variant="text" onClick={onBack}>Volver</Button>
          </Box>
        </CardContent>
      </Card>
    </Container>
  );
}
