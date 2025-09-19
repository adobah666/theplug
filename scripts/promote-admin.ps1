param(
    [Parameter(Mandatory = $true)]
    [string]$Email,

    [Parameter(Mandatory = $false)]
    [string]$MongoUri = "mongodb+srv://usersDataDb:Bananaman169419%3D@usersdata.y1qiekt.mongodb.net/fashion-ecommerce-prod",

    [Parameter(Mandatory = $false)]
    [string]$DbName = "fashion-ecommerce-prod",

    [Parameter(Mandatory = $false)]
    [ValidateSet("development", "production", "test")]
    [string]$NodeEnv = "production"
)

# Set the MongoDB URI for this process only (does not persist)
$env:MONGODB_URI = $MongoUri
$env:MONGODB_DB_NAME = $DbName
$env:NODE_ENV = $NodeEnv

# Determine project root (parent of this /scripts folder)
$projectRoot = Split-Path -Parent $PSScriptRoot

Write-Host "Using MongoDB URI: $MongoUri" -ForegroundColor Cyan
Write-Host "Using DB Name: $DbName" -ForegroundColor Cyan
Write-Host "NODE_ENV: $NodeEnv" -ForegroundColor Cyan
Write-Host "Promoting user to admin: $Email" -ForegroundColor Cyan

# Ensure we run from the project root so tsconfig/paths resolve correctly
Push-Location $projectRoot
try {
    # Use npx to run tsx which executes the TS script
    # This relies on devDependency "tsx" in package.json
    & npx --yes tsx "scripts/promote-admin.ts" $Email
    $exitCode = $LASTEXITCODE

    if ($exitCode -ne 0) {
        Write-Host "promote-admin.ts exited with code $exitCode" -ForegroundColor Red
        exit $exitCode
    } else {
        Write-Host "Promotion script completed successfully." -ForegroundColor Green
    }
}
catch {
    Write-Error $_
    exit 1
}
finally {
    Pop-Location
}
