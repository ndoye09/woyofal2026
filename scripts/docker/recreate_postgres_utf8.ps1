param(
    [string]$ContainerName = 'woyofal-postgres',
    [string]$Image = 'postgres:14',
    [string]$DBName = 'woyofal_dwh',
    [string]$DBUser = 'woyofal_user',
    [string]$DBPass = 'woyofal2026',
    [int]$Port = 5432
)

Write-Host "Arrêt et suppression du conteneur existant (si présent): $ContainerName"
docker rm -f $ContainerName -v 2>$null | Out-Null

Write-Host "Création d'un nouveau conteneur Postgres ($Image) avec encodage UTF-8"
docker run --name $ContainerName -e POSTGRES_DB=$DBName -e POSTGRES_USER=$DBUser -e POSTGRES_PASSWORD=$DBPass \
    -e LANG=en_US.utf8 -e LC_ALL=en_US.utf8 -e POSTGRES_INITDB_ARGS='--encoding=UTF-8 --locale=en_US.utf8' \
    -p ${Port}:5432 -d $Image

Write-Host "Attente 8s pour initialisation..."
Start-Sleep -s 8
Write-Host "Logs récents du conteneur :"
docker logs --tail 50 $ContainerName

Write-Host "Postgres conteneur recréé. Vérifier encodage via : docker exec -i $ContainerName psql -U $DBUser -d $DBName -c \"SHOW server_encoding; SHOW client_encoding;\""
