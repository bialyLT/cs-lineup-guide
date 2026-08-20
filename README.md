This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Despliegue

El backend es Django REST Framework y va a **Railway**; el frontend es Next.js y va a **Vercel**. Reutilizan la base Postgres (Neon) que ya se usa en desarrollo.

### Backend → Railway

1. Creá el servicio a partir del repo y fijá **Root Directory = `backend`**.
2. Railway detecta `requirements.txt`, `Procfile` y `runtime.txt`. El `Procfile` aplica migraciones y `collectstatic` antes de levantar Gunicorn.
3. Variables de entorno (mirá `backend/.env.example`):
   - `DJANGO_DEBUG=0`
   - `DJANGO_SECRET_KEY` (clave aleatoria)
   - `DATABASE_URL` → la misma de Neon (recomendado para conservar los datos)
   - `DJANGO_ALLOWED_HOSTS` → dominio del backend (Railway agrega `RAILWAY_PUBLIC_DOMAIN` solo)
   - `CORS_ALLOWED_ORIGINS` → `https://<frontend.vercel.app>`
   - `DJANGO_CSRF_TRUSTED_ORIGINS` → `https://<backend.up.railway.app>`
   - `GOOGLE_CLIENT_ID` y las variables `R2_*` igual que en desarrollo.

4. **Email de verificación (Brevo por API — Railway bloquea SMTP)**:
   1. Creá la cuenta en [Brevo](https://brevo.com) (plan gratis: 300 correos/día).
   2. En **SMTP & API → API Keys** generá una *API key* v3 (empieza con `xkeysib-`). El SMTP clásico no funciona desde Railway (bloquea los puertos 25/465/587).
   3. En **Senders** agregá el email desde el que vas a enviar y verificalo (te llega un mail de confirmación a esa casilla).
   4. En Railway:
      - `ANYMAIL_BREVO_API_KEY` = la API key v3 generada
      - `DEFAULT_FROM_EMAIL` = `Smokeame Ventana <tu-remitente-verificado@...>`
      - `FRONTEND_URL` = `https://<frontend.vercel.app>` (para el botón del correo)

### Frontend → Vercel

1. Importá el repo y dejá el build por defecto (`npm run build`, ya verificado).
2. Variables de entorno (mirá `.env.example`):
   - `NEXT_PUBLIC_API_URL=https://<backend.up.railway.app>/api`
   - `NEXT_PUBLIC_GOOGLE_CLIENT_ID` (el mismo de desarrollo)

### Google OAuth

En Google Cloud Console → Credenciales OAuth, agregá el origen de producción del frontend en "Orígenes de JavaScript autorizados". Si el backend usa un dominio propio, agregá su URI de redirección en "URIs de redireccionamiento autorizados".

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
