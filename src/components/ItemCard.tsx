import { useEffect, useRef, useState } from "react";
import { Box, Card, CardContent, Chip, Stack, Typography } from "@mui/material";
import { WAREHOUSE_LABELS } from "../constants/warehouse";
import type { InventoryItem, Warehouse } from "../types";

interface Props {
  item: InventoryItem;
  warehouse: Warehouse;
  count: number | undefined;
  /** Swipe/click izquierda: omitir este ítem sin registrar conteo. */
  onSkip: () => void;
  /** Swipe/click derecha: abrir el modal para cargar la cantidad contada. */
  onCount: () => void;
}

const SWIPE_THRESHOLD = 90;
const FLY_OUT_DISTANCE = 480;
const FLY_OUT_MS = 140;

export function ItemCard({ item, warehouse, count, onSkip, onCount }: Props) {
  const startX = useRef<number | null>(null);
  const pointerIdRef = useRef<number | null>(null);
  const settledRef = useRef(false);
  const timeoutRef = useRef<number | null>(null);
  const [offsetX, setOffsetX] = useState(0);
  const [dragging, setDragging] = useState(false);

  // Si el ítem cambia (siguiente tarjeta), aseguramos que no quede arrastre "colgado"
  // de la tarjeta anterior. Esto complementa el `key` que se pasa desde InventoryPage.
  useEffect(() => {
    startX.current = null;
    pointerIdRef.current = null;
    settledRef.current = false;
    setOffsetX(0);
    setDragging(false);
  }, [item.codigo]);

  // Evita "setState en componente desmontado" si el usuario navega durante la animación de salida.
  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const releaseCapture = (target: HTMLDivElement) => {
    const pointerId = pointerIdRef.current;
    if (pointerId === null) return;
    try {
      if (target.hasPointerCapture?.(pointerId)) {
        target.releasePointerCapture(pointerId);
      }
    } catch {
      // Algunos navegadores móviles lanzan si el pointerId ya no es válido; no debe romper la app.
    }
    pointerIdRef.current = null;
  };

  const settle = () => {
    if (settledRef.current) return; // evita doble disparo (pointerup + pointercancel duplicados)
    settledRef.current = true;

    if (Math.abs(offsetX) < SWIPE_THRESHOLD) {
      setOffsetX(0);
      settledRef.current = false;
      return;
    }
    const direction = offsetX > 0 ? 1 : -1;
    setOffsetX(direction * FLY_OUT_DISTANCE);
    timeoutRef.current = window.setTimeout(() => {
      try {
        if (direction > 0) onCount();
        else onSkip();
      } finally {
        setOffsetX(0);
        settledRef.current = false;
        timeoutRef.current = null;
      }
    }, FLY_OUT_MS);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Ignoramos un segundo dedo u otros punteros mientras ya hay un gesto en curso.
    if (pointerIdRef.current !== null) return;
    // Solo el botón principal para mouse (evita clic derecho/medio iniciando un "swipe").
    if (e.pointerType === "mouse" && e.button !== 0) return;

    startX.current = e.clientX;
    pointerIdRef.current = e.pointerId;
    settledRef.current = false;
    setDragging(true);
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Si falla la captura seguimos igual: el drag funciona con los handlers del propio elemento,
      // solo se pierde el seguimiento fuera de los límites de la tarjeta.
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (startX.current === null || pointerIdRef.current !== e.pointerId) return;
    setOffsetX(e.clientX - startX.current);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (pointerIdRef.current !== null && pointerIdRef.current !== e.pointerId) return;
    releaseCapture(e.currentTarget);
    startX.current = null;
    setDragging(false);
    settle();
  };

  const decisionOpacity = Math.min(Math.abs(offsetX) / 140, 1);
  const needsOrder = count !== undefined && count < item.minimo;

  return (
    <Box sx={{ position: "relative", width: "100%", maxWidth: 620, mx: "auto", userSelect: "none" }}>
      <Box
        sx={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: offsetX >= 0 ? "flex-start" : "flex-end",
          px: 3,
          pointerEvents: "none",
          opacity: decisionOpacity,
          zIndex: 0
        }}
      >
        <Chip
          label={offsetX >= 0 ? "CONTAR" : "OMITIR"}
          color={offsetX >= 0 ? "primary" : "default"}
          sx={{ fontWeight: 800, fontSize: "1rem", py: 2.5 }}
        />
      </Box>

      <Card
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        sx={{
          position: "relative",
          zIndex: 1,
          cursor: dragging ? "grabbing" : "grab",
          touchAction: "pan-y",
          transform: `translateX(${offsetX}px) rotate(${offsetX * 0.035}deg)`,
          transition: dragging ? "none" : "transform 140ms ease-out",
          boxShadow: dragging ? 10 : 4,
          overflow: "visible"
        }}
      >
        <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
            <Chip label={WAREHOUSE_LABELS[warehouse]} size="small" />
          </Stack>

          <Typography variant="overline" color="text.secondary">
            Código
          </Typography>
          <Typography variant="h5" fontWeight={800} sx={{ wordBreak: "break-word", mb: 1.5 }}>
            {item.codigo}
          </Typography>

          <Typography variant="overline" color="text.secondary">
            Nombre
          </Typography>
          <Typography variant="body1" sx={{ mb: 3, lineHeight: 1.45 }}>
            {item.nombre}
          </Typography>

          <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
            <Chip label={`Mínimo: ${item.minimo}`} />
            <Chip label={`Máximo: ${item.maximo}`} />
            {item.bin && <Chip label={`Bin: ${item.bin}`} variant="outlined" />}
          </Stack>

          {count !== undefined ? (
            <Box sx={{ mt: 2 }}>
              <Chip
                color={needsOrder ? "warning" : "success"}
                label={needsOrder ? `Contado: ${count} (se va a pedir)` : `Contado: ${count}`}
              />
            </Box>
          ) : null}

          <Typography
            variant="body2"
            color="text.secondary"
            align="center"
            sx={{ mt: 4 }}
          >
            Deslizá ← para omitir · Deslizá → para cargar lo contado
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}
