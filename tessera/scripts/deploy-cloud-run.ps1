[CmdletBinding()]
param(
  [string]$ProjectId = "tessera-502419",
  [string]$Region = "asia-south1",
  [Parameter(Mandatory)]
  [string]$ImageUri
)

$ErrorActionPreference = "Stop"
$gcloud = Join-Path $env:LOCALAPPDATA "Google\Cloud SDK\google-cloud-sdk\bin\gcloud.cmd"
$serviceAccount = "tessera-run@$ProjectId.iam.gserviceaccount.com"

if (-not (Test-Path -LiteralPath $gcloud)) {
  throw "Google Cloud CLI was not found at $gcloud."
}

& $gcloud run deploy tessera-web `
  --project $ProjectId `
  --region $Region `
  --image $ImageUri `
  --service-account $serviceAccount `
  --allow-unauthenticated `
  --ingress all `
  --execution-environment gen2 `
  --port 8080 `
  --memory 512Mi `
  --cpu 1 `
  --concurrency 40 `
  --max-instances 4 `
  --min-instances 0 `
  --timeout 60s `
  --startup-probe "httpGet.path=/api/health,httpGet.port=8080,periodSeconds=10,timeoutSeconds=5,failureThreshold=3" `
  --set-env-vars "NODE_ENV=production,DEMO_ONLY=true" `
  --quiet

if ($LASTEXITCODE -ne 0) {
  throw "Cloud Run deployment failed with exit code $LASTEXITCODE."
}

& $gcloud run services describe tessera-web `
  --project $ProjectId `
  --region $Region `
  --format "value(status.url)"

if ($LASTEXITCODE -ne 0) {
  throw "Cloud Run service URL lookup failed with exit code $LASTEXITCODE."
}
