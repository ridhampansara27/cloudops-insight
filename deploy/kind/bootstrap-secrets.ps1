# Stop immediately when a PowerShell command fails.
$ErrorActionPreference = "Stop"


# Define the Kubernetes namespace used by CloudOps Insight.
$Namespace = "cloudops"


# Define the Kubernetes Secret consumed by the Helm chart.
$SecretName = "cloudops-secrets"

# Check whether the Kubernetes Secret already exists.
kubectl get secret $SecretName `
    --namespace $Namespace `
    *> $null


# Preserve an existing Secret instead of rotating credentials automatically.
if ($LASTEXITCODE -eq 0) {
    Write-Host "Kubernetes Secret '$SecretName' already exists in namespace '$Namespace'."
    Write-Host "No credentials were changed."
    exit 0
}


# Ask for the PostgreSQL password without displaying it on screen.
$PostgresSecurePassword = Read-Host `
    "Enter PostgreSQL password" `
    -AsSecureString


# Convert the secure PostgreSQL password only in memory.
$PostgresPassword = [System.Net.NetworkCredential]::new(
    "",
    $PostgresSecurePassword
).Password


# Ask for the initial administrator password without displaying it.
$AdminSecurePassword = Read-Host `
    "Enter seed administrator password" `
    -AsSecureString


# Convert the secure administrator password only in memory.
$AdminPassword = [System.Net.NetworkCredential]::new(
    "",
    $AdminSecurePassword
).Password


# Generate 32 cryptographically secure random bytes.
$JwtBytes = New-Object byte[] 32


# Create a cryptographically secure random-number generator.
$RandomGenerator = [System.Security.Cryptography.RandomNumberGenerator]::Create()


# Fill the byte array with secure random values.
$RandomGenerator.GetBytes(
    $JwtBytes
)


# Release the random-number generator.
$RandomGenerator.Dispose()


# Convert the generated JWT signing secret to Base64 text.
$JwtSecret = [System.Convert]::ToBase64String(
    $JwtBytes
)


# Build the PostgreSQL connection URL used inside Kubernetes.
$DatabaseUrl = "postgresql+asyncpg://cloudops:$PostgresPassword@cloudops-postgres:5432/cloudops"


# Ensure the CloudOps Kubernetes namespace exists.
kubectl create namespace $Namespace `
    --dry-run=client `
    -o yaml |
    kubectl apply -f -


# Create or update the Kubernetes Secret without writing a Secret YAML
# containing plaintext credentials into the Git repository.
kubectl create secret generic $SecretName `
    --namespace $Namespace `
    --from-literal="DATABASE_URL=$DatabaseUrl" `
    --from-literal="POSTGRES_PASSWORD=$PostgresPassword" `
    --from-literal="JWT_SECRET=$JwtSecret" `
    --from-literal="SEED_ADMIN_PASSWORD=$AdminPassword" `
    --dry-run=client `
    -o yaml |
    kubectl apply -f -


# Remove plaintext secret values from the PowerShell variables.
$DatabaseUrl = $null
$PostgresPassword = $null
$AdminPassword = $null
$JwtSecret = $null


# Confirm completion without printing any credential values.
Write-Host "Kubernetes Secret '$SecretName' is configured in namespace '$Namespace'."