"""
Script ML autonome - Prédiction Recharge Optimale
Exécution : python scripts/05_ml/train_prediction_model.py
"""

import os
from datetime import datetime
import json
import pickle

import pandas as pd
import numpy as np
import matplotlib.pyplot as plt

from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, roc_auc_score


def main():
    print('🚀 ML Pipeline - Prédiction Recharge Optimale')

    # Charger dataset
    path = os.path.join('data', 'processed', 'dataset_ml_ready.csv')
    print('Loading', path)
    df = pd.read_csv(path)
    print('Dataset shape:', df.shape)

    # Préparer X,y
    if 'target_depasse_t1' not in df.columns:
        raise KeyError('La colonne target_depasse_t1 est absente du dataset')

    X = df.drop(['target_depasse_t1'], axis=1)
    y = df['target_depasse_t1']

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    print(f'Train: {len(X_train):,}  Test: {len(X_test):,}')

    # Entraîner RandomForest
    clf = RandomForestClassifier(n_estimators=100, max_depth=15, min_samples_split=50, random_state=42, n_jobs=-1)
    t0 = datetime.now()
    clf.fit(X_train, y_train)
    dt = (datetime.now() - t0).total_seconds()
    print(f'Model trained in {dt:.1f}s')

    # Évaluer
    y_pred = clf.predict(X_test)
    y_proba = clf.predict_proba(X_test)[:, 1]
    acc = accuracy_score(y_test, y_pred)
    prec = precision_score(y_test, y_pred)
    rec = recall_score(y_test, y_pred)
    f1 = f1_score(y_test, y_pred)
    roc = roc_auc_score(y_test, y_proba)

    print('Accuracy:', round(acc,4))
    print('Precision:', round(prec,4))
    print('Recall:', round(rec,4))
    print('F1:', round(f1,4))
    print('ROC-AUC:', round(roc,4))

    # Feature importance
    fi = pd.DataFrame({'feature': X.columns, 'importance': clf.feature_importances_}).sort_values('importance', ascending=False)
    os.makedirs(os.path.join('docs','graphs'), exist_ok=True)
    plt.figure(figsize=(8,6))
    top = fi.head(15)
    plt.barh(top['feature'][::-1], top['importance'][::-1])
    plt.title('Top 15 features')
    plt.tight_layout()
    fig_path = os.path.join('docs','graphs','11_feature_importance_ml.png')
    plt.savefig(fig_path, dpi=200)
    print('Saved figure:', fig_path)

    # Export model and metrics
    os.makedirs('models', exist_ok=True)
    model_file = os.path.join('models','rf_classifier_depassement_t1.pkl')
    with open(model_file, 'wb') as f:
        pickle.dump(clf, f)

    metrics = {
        'timestamp': datetime.now().isoformat(),
        'accuracy': float(acc),
        'precision': float(prec),
        'recall': float(rec),
        'f1': float(f1),
        'roc_auc': float(roc)
    }
    metrics_file = os.path.join('models','model_metrics.json')
    with open(metrics_file, 'w') as f:
        json.dump(metrics, f, indent=2)

    print('Model and metrics exported to models/')
    print('Done')


if __name__ == '__main__':
    main()
