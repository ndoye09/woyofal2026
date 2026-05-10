#!/usr/bin/env bash
CONTAINER_NAME=${1:-woyofal-postgres}
IMAGE=${2:-postgres:14}
DBNAME=${3:-woyofal_dwh}
DBUSER=${4:-woyofal_user}
DBPASS=${5:-woyofal2026}
PORT=${6:-5432}

echo "Stopping and removing existing container ${CONTAINER_NAME} (if any)"
docker rm -f "${CONTAINER_NAME}" -v 2>/dev/null || true

echo "Running new Postgres container ${IMAGE} with UTF-8 locale"
docker run --name "${CONTAINER_NAME}" \
  -e POSTGRES_DB="${DBNAME}" \
  -e POSTGRES_USER="${DBUSER}" \
  -e POSTGRES_PASSWORD="${DBPASS}" \
  -e LANG=en_US.utf8 -e LC_ALL=en_US.utf8 \
  -e POSTGRES_INITDB_ARGS='--encoding=UTF-8 --locale=en_US.utf8' \
  -p ${PORT}:5432 -d "${IMAGE}"

echo "Waiting 8s for initialization..."
sleep 8
echo "Recent logs:"
docker logs --tail 50 "${CONTAINER_NAME}"

echo "Check encodings: docker exec -i ${CONTAINER_NAME} psql -U ${DBUSER} -d ${DBNAME} -c \"SHOW server_encoding; SHOW client_encoding;\""
