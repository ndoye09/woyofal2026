"""Test direct de l'API OpenRouter — teste les fallbacks."""
import sys
import os
from pathlib import Path
from dotenv import load_dotenv
import requests

load_dotenv(dotenv_path=Path('api/flask/.env'))
key = os.getenv('OPENROUTER_API_KEY', '').strip()
print(f"Cle: {len(key)} chars")

MODELS = [
    'meta-llama/llama-3.3-70b-instruct:free',
    'meta-llama/llama-3.1-8b-instruct:free',
    'meta-llama/llama-3.2-3b-instruct:free',
    'meta-llama/llama-3.2-1b-instruct:free',
    'google/gemma-2-9b-it:free',
    'google/gemma-3-27b-it:free',
    'microsoft/phi-3-mini-128k-instruct:free',
    'microsoft/phi-3.5-mini-128k-instruct:free',
    'nousresearch/hermes-3-llama-3.1-405b:free',
]

for model in MODELS:
    print(f"Test: {model}")
    try:
        r = requests.post(
            'https://openrouter.ai/api/v1/chat/completions',
            headers={'Authorization': f'Bearer {key}', 'Content-Type': 'application/json',
                     'HTTP-Referer': 'http://localhost:5173', 'X-Title': 'Woyofal Test'},
            json={'model': model, 'messages': [
                {'role': 'system', 'content': 'Tu es un assistant.'},
                {'role': 'user', 'content': 'Dis bonjour.'}
            ], 'max_tokens': 30},
            timeout=20
        )
        if r.status_code == 200:
            print(f"  OK: {r.json()['choices'][0]['message']['content'][:80]}")
            break
        elif r.status_code == 429:
            print(f"  429 rate-limit, essai suivant...")
        else:
            print(f"  Erreur {r.status_code}: {r.text[:150]}")
    except Exception as e:
        print(f"  Exception: {e}")
