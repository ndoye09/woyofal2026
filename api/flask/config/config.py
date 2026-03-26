"""
Configuration API Flask
"""
import os
from datetime import timedelta


class Config:
    """Configuration de base"""
    
    # Flask
    SECRET_KEY = os.getenv('SECRET_KEY', 'woyofal_secret_key_2026_dev')
    DEBUG = os.getenv('DEBUG', 'True') == 'True'
    
    # Database
    DB_HOST = os.getenv('DB_HOST', 'localhost')
    DB_PORT = os.getenv('DB_PORT', '5432')
    DB_NAME = os.getenv('DB_NAME', 'woyofal_dwh')
    DB_USER = os.getenv('DB_USER', 'woyofal_user')
    DB_PASSWORD = os.getenv('DB_PASSWORD', 'woyofal2026')
    
    # JWT
    JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'jwt_woyofal_2026')
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=1)
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=30)
    
    # Rate Limiting
    RATELIMIT_STORAGE_URL = "memory://"
    RATELIMIT_DEFAULT = "100 per hour"
    
    # CORS — tous les ports Vite dev (5173-5180) + autres services locaux
    CORS_ORIGINS = [
        'http://localhost:3000',
        'http://localhost:8501',
        'http://localhost:5173',
        'http://localhost:5174',
        'http://localhost:5175',
        'http://localhost:5176',
        'http://localhost:5177',
        'http://localhost:5178',
        'http://localhost:5179',
        'http://localhost:5180',
    ]
    
    # API
    API_TITLE = "Woyofal API"
    API_VERSION = "1.0.0"
    API_DESCRIPTION = "API REST pour Data Platform Woyofal"


class DevelopmentConfig(Config):
    """Configuration développement"""
    DEBUG = True


class ProductionConfig(Config):
    """Configuration production"""
    DEBUG = False
    RATELIMIT_DEFAULT = "50 per hour"


config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'default': DevelopmentConfig
}
