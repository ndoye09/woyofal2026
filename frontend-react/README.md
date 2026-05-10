# Frontend React - Woyofal

Setup local:

```bash
cd frontend-react
npm install
npm run dev
```

Build Docker image:

```bash
docker build -t woyofal_frontend:latest .
docker run -p 5173:80 woyofal_frontend:latest
```

Le frontend attend l'API sur `VITE_API_URL` (voir `.env`).
