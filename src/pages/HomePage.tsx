import { Container } from "@mui/material";
import { WarehouseSelector } from "../components/WarehouseSelector";
import type { Warehouse } from "../types";

export function HomePage({ value, onChange, onStart }: { value: Warehouse | null; onChange: (w: Warehouse) => void; onStart: () => void }) {
  return <Container maxWidth="lg" sx={{ py: { xs: 3, sm: 6 } }}><WarehouseSelector value={value} onChange={onChange} onStart={onStart} /></Container>;
}