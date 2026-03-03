# 📊 Schémas et Diagrammes - Woyofal Data Platform

## Diagramme 1 : Flux ETL

```mermaid
flowchart TD
    A[CSV Files<br/>330k lignes] --> B[Extract]
    B --> C[Validate]
    C --> D{Qualité OK?}
    D -->|Non| E[Log Erreur<br/>Arrêt]
    D -->|Oui| F[Transform]
    F --> G[Load Dimensions]
    G --> H[Load Facts]
    H --> I[PostgreSQL<br/>Data Warehouse]
    I --> J[Vérification]
    J --> K[Success]
```

## Diagramme 2 : Star Schema

```mermaid
erDiagram
    DIM_DATE ||--o{ FACT_CONSUMPTION : "date_id"
    DIM_ZONES ||--o{ FACT_CONSUMPTION : "zone_id"
    DIM_USERS ||--o{ FACT_CONSUMPTION : "user_id"
    DIM_TRANCHES ||--o{ FACT_CONSUMPTION : "tranche_id"
    
    DIM_DATE ||--o{ FACT_RECHARGES : "date_id"
    DIM_ZONES ||--o{ FACT_RECHARGES : "zone_id"
    DIM_USERS ||--o{ FACT_RECHARGES : "user_id"
    
    DIM_DATE {
        int date_id PK
        date date
        int jour
        int mois
        int annee
    }
    
    DIM_ZONES {
        int zone_id PK
        string region
        string commune
        int population
    }
    
    DIM_USERS {
        int user_id PK
        string prenom
        string nom
        string type_compteur
        int zone_id FK
    }
    
    FACT_CONSUMPTION {
        int id PK
        int date_id FK
        int user_id FK
        int zone_id FK
        int tranche_id FK
        decimal conso_kwh
        decimal cout_fcfa
    }
    
    FACT_RECHARGES {
        int recharge_id PK
        int date_id FK
        int user_id FK
        decimal montant_brut
        decimal kwh_obtenus
    }
```

## Diagramme 3 : Séquence Simulation

```mermaid
sequenceDiagram
    participant U as Utilisateur
    participant CLI as CLI Interface
    participant SIM as Simulator
    participant CALC as Calculator
    
    U->>CLI: Montant: 5000 F, Cumul: 120 kWh
    CLI->>SIM: RechargeInput(5000, 120, DPP)
    SIM->>CALC: calculate_deductions(5000)
    CALC-->>SIM: (0, 125, 4875)
    SIM->>CALC: calculate_kwh_progressif(4875, 120)
    
    Note over CALC: Phase 1: Remplir T1<br/>150-120 = 30 kWh<br/>30×82 = 2460 F
    
    Note over CALC: Phase 2: Reste en T2<br/>(4875-2460)/136.49<br/>= 17.7 kWh
    
    CALC-->>SIM: 47.7 kWh total
    SIM->>SIM: calculate_economie(47.7, T2)
    SIM-->>CLI: RechargeResult
    CLI-->>U: Affichage résultat
```

## Diagramme 4 : Calcul Progressif

```mermaid
graph LR
    A[Montant Net<br/>4875 F] --> B{Cumul < 150?}
    B -->|Oui| C[Remplir T1<br/>Prix: 82 F/kWh]
    B -->|Non| D[Passer à T2]
    C --> E{Reste montant?}
    E -->|Oui| F[Remplir T2<br/>Prix: 136.49 F/kWh]
    E -->|Non| G[Fin T1]
    F --> H{Reste montant?}
    H -->|Oui| I[Remplir T3<br/>Prix: 136.49 F/kWh]
    H -->|Non| J[Fin T2]
    I --> K[Fin T3]
    D --> F
    G --> L[Total kWh]
    J --> L
    K --> L
```

## Diagramme 5 : Architecture Déploiement

```mermaid
graph TB
    subgraph "Local Development"
        A[Python Scripts] --> B[CSV Generation]
        B --> C[Docker Compose]
    end
    
    subgraph "Docker Services"
        C --> D[PostgreSQL Container]
        C --> E[pgAdmin Container]
    end
    
    subgraph "CI/CD Pipeline"
        F[GitHub Push] --> G[GitHub Actions]
        G --> H[Run Tests]
        H --> I{Tests Pass?}
        I -->|Yes| J[Deploy Success]
        I -->|No| K[Notify Failure]
    end
    
    subgraph "Data Warehouse"
        D --> L[Star Schema]
        L --> M[Dimensions]
        L --> N[Facts]
    end
    
    subgraph "Analytics Layer"
        N --> O[Jupyter Notebooks]
        N --> P[Streamlit Dashboards]
        N --> Q[Simulator CLI]
    end
```

---

Ces diagrammes sont prêts à être rendus par GitHub/GitLab ou par un viewer Mermaid compatible.
