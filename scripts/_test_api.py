import urllib.request, json

urls = [
    'http://127.0.0.1:5000/api/consommation/kpis?periode=2026-01',
    'http://127.0.0.1:5000/api/consommation/evolution?limit=5',
    'http://127.0.0.1:5000/api/consommation/tranches?periode=2026-01',
]
for url in urls:
    name = url.split('/')[-1].split('?')[0]
    try:
        r = urllib.request.urlopen(url, timeout=10)
        data = json.loads(r.read())
        print(f"OK  /{name}: {str(data)[:250]}")
    except Exception as e:
        print(f"ERR /{name}: {e}")
