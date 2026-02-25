**Installation Python 3.11 et venv (Windows, PowerShell)**

Ce guide rapide montre comment installer Python 3.11, créer un environnement virtuel et installer les dépendances pour ce projet.

1) Télécharger et installer Python 3.11 (manuellement)

- Téléchargez l'installateur officiel depuis https://www.python.org/downloads/
- Lancez l'installateur, cochez "Add Python to PATH" et installez.

Alternativement, téléchargez puis exécutez (PowerShell) :
```powershell
Start-Process "https://www.python.org/ftp/python/3.11.6/python-3.11.6-amd64.exe"
```

2) Vérifier que Python 3.11 est disponible
```powershell
py -0p            # liste les interpréteurs Python installés
py -3.11 -V       # vérifie la version 3.11
```

3) Créer et activer un venv Python 3.11
```powershell
py -3.11 -m venv venv311
.\venv311\Scripts\Activate.ps1
```

4) Mettre à jour pip et installer les dépendances
```powershell
.\venv311\Scripts\python.exe -m pip install -U pip setuptools wheel
.\venv311\Scripts\python.exe -m pip install -r requirements.txt
```

5) Exécuter le script de génération
```powershell
.\venv311\Scripts\python.exe scripts\data_generation\generate_zones.py
```

Remarques
- Le dépôt contient déjà un script `scripts/data_generation/generate_zones.py` qui fonctionne sans `pandas` et écrit `data/raw/zones_senegal.csv`.
- Si vous préférez `conda`, créez un env conda avec `python=3.11` puis installez les dépendances.

Si vous souhaitez que j'automatise le téléchargement et l'installation de Python 3.11 ici, confirmez et j'essaierai (cela peut demander des droits d'administrateur).
