import { Button, Card, CardContent, FormControlLabel, Radio, RadioGroup, Typography } from "@mui/material";
import { WAREHOUSE_LABELS } from "../constants/warehouse";
import type { Warehouse } from "../types";

interface Props { value: Warehouse | null; onChange: (w: Warehouse) => void; onStart: () => void; }

const WAREHOUSE_OPTIONS = Object.keys(WAREHOUSE_LABELS) as Warehouse[];

export function WarehouseSelector({ value, onChange, onStart }: Props) {
  return (
    <Card sx={{ maxWidth: 560, width: "100%", mx: "auto" }}>
      <CardContent sx={{ p: { xs: 3, sm: 5 } }}>
        <Typography variant="h4" component="h1" fontWeight={800} gutterBottom>
          CONTROL DE DEPÓSITO
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 3 }}>
          Seleccioná el depósito para comenzar el pedido.
        </Typography>
        <RadioGroup value={value ?? ""} onChange={(e) => onChange(e.target.value as Warehouse)}>
          {WAREHOUSE_OPTIONS.map((w) => (
            <FormControlLabel key={w} value={w} control={<Radio />} label={WAREHOUSE_LABELS[w]} />
          ))}
        </RadioGroup>
        <Button fullWidth variant="contained" size="large" disabled={!value} onClick={onStart} sx={{ mt: 3 }}>
          Comenzar
        </Button>
      </CardContent>
    </Card>
  );
}