import { useEffect, useMemo, useState } from "react";
import { Alert, Box, Button, Container, IconButton, Stack, Tooltip, Typography } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import WarehouseIcon from "@mui/icons-material/Warehouse";
import { warehouseLabel } from "../constants/warehouse";
import { ItemCard } from "../components/ItemCard";
import { ProgressBar } from "../components/ProgressBar";
import { QuantityModal } from "../components/QuantityModal";
import { SearchBox } from "../components/SearchBox";
import { useCatalog } from "../hooks/useCatalog";
import { useInventoryStore } from "../store/inventory.store";

export function InventoryPage({ onFinish, onBack }: { onFinish: () => void; onBack: () => void }) {
  const { warehouse, index, counts, setCount, setIndex } = useInventoryStore();
  const catalog = useCatalog(warehouse);
  const [search, setSearch] = useState("");
  const [quantityOpen, setQuantityOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLocaleLowerCase();
    if (!q) return catalog;
    return catalog.filter((x) => {
      // Defensivo: si algún registro del catálogo llegara sin código o nombre,
      // no debe tirar abajo el filtro (y por lo tanto toda la pantalla).
      const codigo = x.codigo ?? "";
      const nombre = x.nombre ?? "";
      return codigo.toLocaleLowerCase().includes(q) || nombre.toLocaleLowerCase().includes(q);
    });
  }, [catalog, search]);

  // Si la búsqueda (o una sesión restaurada) deja el índice fuera de rango,
  // lo corregimos en vez de quedarnos con un ítem `undefined` que rompía el render.
  const safeIndex = filtered.length === 0 ? 0 : Math.min(index, filtered.length - 1);
  useEffect(() => {
    if (filtered.length > 0 && index !== safeIndex) {
      setIndex(safeIndex);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered.length, index]);

  const item = filtered[safeIndex];
  const advance = () => {
    if (safeIndex >= filtered.length - 1) onFinish();
    else setIndex(safeIndex + 1);
  };
  const goBack = () => {
    if (safeIndex > 0) setIndex(safeIndex - 1);
  };

  if (!warehouse) return null;

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 2, sm: 4 } }}>
      <Stack spacing={2}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Tooltip title="Volver a selección de depósito">
            <IconButton onClick={onBack} aria-label="Volver a selección de depósito" edge="start">
              <WarehouseIcon />
            </IconButton>
          </Tooltip>
          <Box>
            <Typography variant="h5" fontWeight={800}>Pedido {warehouseLabel(warehouse)}</Typography>
            <Typography color="text.secondary">{filtered.length} ítems visibles</Typography>
          </Box>
        </Box>
        <SearchBox value={search} onChange={(v) => { setSearch(v); setIndex(0); }} />
        <ProgressBar current={filtered.length ? safeIndex + 1 : 0} total={filtered.length} />

        {item ? (
          <>
            <Box sx={{ maxWidth: 1000, mx: "auto", width: "100%" }}>
              <ItemCard
                key={item.codigo}
                item={item}
                warehouse={warehouse}
                count={counts[item.codigo]}
                onSkip={advance}
                onCount={() => setQuantityOpen(true)}
              />
            </Box>
            <Typography variant="body2" color="text.secondary" align="center">
              También podés tocar la tarjeta: derecha = cargar lo contado, izquierda = omitir.
            </Typography>
          </>
        ) : (
          <Alert severity="info" sx={{ maxWidth: 620, mx: "auto", width: "100%" }}>
            No se encontraron ítems para "{search}".
          </Alert>
        )}

        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} justifyContent="center">
          <Button
            variant="outlined"
            startIcon={<ArrowBackIcon />}
            disabled={safeIndex === 0 || !item}
            onClick={goBack}
          >
            Atrás
          </Button>
          {!item && search && (
            <Button variant="outlined" onClick={() => { setSearch(""); setIndex(0); }}>
              Limpiar búsqueda
            </Button>
          )}
          <Button variant="text" onClick={onFinish}>Ver resumen</Button>
        </Stack>
      </Stack>
      {item && (
        <QuantityModal open={quantityOpen} onClose={() => setQuantityOpen(false)}
          initialValue={counts[item.codigo]}
          onConfirm={(n) => { setCount(item.codigo, n); setQuantityOpen(false); advance(); }} />
      )}
    </Container>
  );
}
