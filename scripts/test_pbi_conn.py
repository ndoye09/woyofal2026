import sys
from socket import socket

HOST='localhost'
PORT=63009

def check_port(host, port, timeout=3):
    s = socket()
    s.settimeout(timeout)
    try:
        s.connect((host, port))
        s.close()
        return True
    except Exception as e:
        return False

if not check_port(HOST, PORT):
    print(f"PORT_CLOSED: cannot connect to {HOST}:{PORT}")
    sys.exit(2)

try:
    from pyadomd import Pyadomd
except Exception as e:
    print("PYADOMD_MISSING:", e)
    sys.exit(3)

conn_str = f"Provider=MSOLAP;Data Source={HOST}:{PORT};"
try:
    with Pyadomd(conn_str) as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM $SYSTEM.DBSCHEMA_CATALOGS")
            rows = cur.fetchall()
            print("CATALOGS_COUNT:", len(rows))
            for r in rows[:10]:
                print(r)
except Exception as e:
    print("PYADOMD_ERROR:", e)
    sys.exit(4)

print('TEST_COMPLETE')
