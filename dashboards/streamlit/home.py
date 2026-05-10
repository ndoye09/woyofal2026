# Launcher safe filename for Streamlit (loads the emoji-named main page)
import io, sys, os
base_dir = os.path.dirname(__file__)
path = os.path.join(base_dir, '🏠_Accueil.py')
if not os.path.exists(path):
    raise FileNotFoundError(f"Main page not found: {path}")
with io.open(path, 'r', encoding='utf-8') as f:
    code = f.read()
exec(compile(code, path, 'exec'), globals())
