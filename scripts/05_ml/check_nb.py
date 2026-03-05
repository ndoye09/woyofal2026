import json
p = r"c:\Users\HP\woyofal-data-platform\notebooks\05_ML_Prediction_Recharge.ipynb"
print('PATH:', p)
with open(p, 'rb') as f:
    b = f.read()
print('SIZE_BYTES:', len(b))
try:
    s = b.decode('utf-8')
except Exception as e:
    print('DECODE ERROR', e)
    raise
try:
    data = json.loads(s)
    print('JSON OK - nbformat:', data.get('nbformat'))
    print('CELLS:', len(data.get('cells', [])))
except Exception as e:
    print('JSON LOAD ERROR:', type(e).__name__, e)
    # dump start of string for debug
    print('START CHARS:', s[:200])
    raise