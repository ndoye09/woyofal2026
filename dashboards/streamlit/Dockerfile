FROM python:3.10-slim
WORKDIR /app
RUN apt-get update && apt-get install -y gcc postgresql-client && rm -rf /var/lib/apt/lists/*
COPY requirements_dashboard.txt .
RUN pip install --no-cache-dir -r requirements_dashboard.txt
COPY . .
EXPOSE 8501
CMD ["streamlit","run","Accueil.py","--server.port=8501","--server.address=0.0.0.0"]
