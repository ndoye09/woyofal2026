# Woyofal API (Flask)

Lancer localement:

```bash
cd api/flask
python app.py
```

Docker (build + run):

```bash
docker build -t woyofal_api:latest .
docker run -p 5000:5000 woyofal_api:latest
```

Dépendances: voir `requirements.txt`
