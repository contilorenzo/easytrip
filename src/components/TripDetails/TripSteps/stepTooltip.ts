// Spazio a sinistra delle tappe riservato al tooltip delle azioni (modifica / elimina).
// Il tooltip esce dalla card e su Android i tocchi fuori dai bordi del contenitore non arrivano: per questo la colonna
// delle tappe e ogni tappa si allargano a sinistra di questo valore (con un margine negativo) e lo recuperano con un
// margine interno uguale, così il layout visibile non cambia ma l'area toccabile comprende il tooltip.
export const STEP_TOOLTIP_SPACE = 46

// Distanza tra il tooltip e la card (il tooltip è largo STEP_TOOLTIP_SPACE - STEP_TOOLTIP_GAP)
export const STEP_TOOLTIP_GAP = 12
