/**
 * URL del link de donación de Mercado Pago.
 *
 * Creala en tu cuenta de Mercado Pago (Cobrar → Link de pago → "El comprador
 * elige el monto") y configurala con la variable NEXT_PUBLIC_DONATION_URL en
 * el deploy (Vercel) y en src/.env.local. Mientras esté vacía, el botón "Donar"
 * no se muestra.
 */
export const DONATION_URL = process.env.NEXT_PUBLIC_DONATION_URL ?? "";
