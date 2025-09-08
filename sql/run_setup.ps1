<# PowerShell helper to run combined_setup.sql against a Postgres-compatible endpoint (Supabase)

Usage (one of two ways):
1) If you have psql installed and PGHOST/PGUSER/PGPASSWORD/PGDATABASE/PGPORT set in env, run:
   .\run_setup.ps1

2) Or pass a connection string directly:
   .\run_setup.ps1 -ConnectionString "postgresql://user:pass@host:5432/dbname"

This script will run sql/combined_setup.sql and print output.
#>
param(
    [string]$ConnectionString
)

$scriptPath = Join-Path $PSScriptRoot 'combined_setup.sql'
if (-not (Test-Path $scriptPath)) {
    Write-Error "SQL file not found: $scriptPath"
    exit 1
}

if (-not $ConnectionString) {
    if (-not (Get-Command psql -ErrorAction SilentlyContinue)) {
        Write-Error "psql not found in PATH and no -ConnectionString provided. Install psql or provide a connection string."
        exit 1
    }
    Write-Host "Running using psql with environment variables (PGHOST/PGUSER/PGPASSWORD/PGDATABASE/PGPORT)"
    & psql -f $scriptPath
    exit $LASTEXITCODE
} else {
    # create a temporary file with the connection string for psql (psql accepts a connection string via -d)
    Write-Host "Running using provided connection string"
    & psql -d $ConnectionString -f $scriptPath
    exit $LASTEXITCODE
}
