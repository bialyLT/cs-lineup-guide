/**
 * URL del link de donación de Mercado Pago.
 *
 * Creala en tu cuenta de Mercado Pago (Cobrar → Link de pago → "El comprador
 * elige el monto") y configurala con la variable NEXT_PUBLIC_DONATION_URL en
 * el deploy (Vercel) y en src/.env.local. Incluí siempre el esquema
 * (https://); si lo omitís, lo agregamos acá para evitar que el navegador lo
 * resuelva como ruta relativa del sitio. Mientras esté vacía, el botón
 * "Donar" no se muestra.
 */
const rawDonationUrl = process.env.NEXT_PUBLIC_DONATION_URL ?? "";

export const DONATION_URL = /^https?:\/\//i.test(rawDonationUrl)
  ? rawDonationUrl
  : rawDonationUrl
    ? `https://${rawDonationUrl}`
    : "";
