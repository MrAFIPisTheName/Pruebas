import { TextField } from "@mui/material";

export function SearchBox({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return <TextField fullWidth size="small" label="Buscar por código o nombre" value={value}
    onChange={(e) => onChange(e.target.value)} inputProps={{ "aria-label": "Buscar por código o nombre" }} />;
}