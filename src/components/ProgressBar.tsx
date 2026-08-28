import { Box, LinearProgress, Typography } from "@mui/material";

export function ProgressBar({ current, total }: { current: number; total: number }) {
  const pct = total ? Math.round((current / total) * 100) : 0;
  return (
    <Box sx={{ mb: 2 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
        <Typography variant="body2">Progreso</Typography>
        <Typography variant="body2" fontWeight={700}>{pct}%</Typography>
      </Box>
      <LinearProgress variant="determinate" value={pct} />
    </Box>
  );
}