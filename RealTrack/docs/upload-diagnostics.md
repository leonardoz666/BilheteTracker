# Upload Diagnostics Guide

The upload modal has a built-in diagnostics panel that verifies connectivity with the BackTrack API before sending images.

## Endpoints Checked

1. `https://<backtrack-host>/health`
2. `https://<backtrack-host>/api/health`
3. `https://<backtrack-host>/api`

The first URL expected to return HTTP 200 is stored as the last probe result and shown to the user. If every check fails, the modal displays the HTTP status or network error.

## Troubleshooting Steps

- Use the **Reverificar conexão** button to run the probes again.
- Note the *Verificação via* line to confirm which endpoint responded.
- When uploads fail with `ECONNABORTED`, copy the diagnostics message and console log so we can correlate the issue with the recorded probes.

Keeping these details handy speeds up debugging when Render wakes the service or when DNS changes impact the health route.