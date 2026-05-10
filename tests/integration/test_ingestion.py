"""
Tests d'intégration pour le pipeline d'ingestion
"""
import pytest
import subprocess
import shlex


def run_sql(query: str) -> str:
    cmd = [
        'docker', 'exec', 'woyofal-postgres', 'psql', '-U', 'woyofal_user', '-d', 'woyofal_dwh', '-t', '-c', query
    ]
    out = subprocess.check_output(cmd, universal_newlines=True)
    return out.strip()


class TestDatabaseConnection:
    def test_connection_ok(self):
        out = run_sql('SELECT 1')
        assert out.strip() == '1'

    def test_database_exists(self):
        out = run_sql('SELECT current_database()')
        assert out.strip() == 'woyofal_dwh'


class TestTablesExist:
    def test_dim_date_exists(self):
        out = run_sql("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'dim_date')")
        assert out.strip() in ('t', 'true', '1')

    def test_dim_zones_exists(self):
        out = run_sql("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'dim_zones')")
        assert out.strip() in ('t', 'true', '1')

    def test_fact_consumption_exists(self):
        out = run_sql("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'fact_consumption')")
        assert out.strip() in ('t', 'true', '1')


class TestDataLoaded:
    def test_dim_zones_not_empty(self):
        out = run_sql('SELECT COUNT(*) FROM dim_zones')
        assert int(out.strip()) > 0

    def test_dim_users_not_empty(self):
        out = run_sql('SELECT COUNT(*) FROM dim_users')
        assert int(out.strip()) > 0

    def test_fact_consumption_not_empty(self):
        out = run_sql('SELECT COUNT(*) FROM fact_consumption')
        assert int(out.strip()) > 0


class TestDataQuality:
    def test_no_null_user_ids(self):
        out = run_sql('SELECT COUNT(*) FROM fact_consumption WHERE user_id IS NULL')
        assert int(out.strip()) == 0

    def test_positive_consumption(self):
        out = run_sql('SELECT COUNT(*) FROM fact_consumption WHERE conso_kwh < 0')
        assert int(out.strip()) == 0

    def test_valid_tranches(self):
        out = run_sql("SELECT COUNT(*) FROM fact_consumption WHERE tranche_id NOT IN (1,2,3)")
        assert int(out.strip()) == 0


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
