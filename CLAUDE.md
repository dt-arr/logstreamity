## Dynatrace Querying Guidelines

When querying Dynatrace, filter entities relevant to this project:
- Service/app name contains: `logstreamity`
- Use `contains(entity.name, "logstreamity")` in DQL filters
- Combine with `OR` for containers: `contains(container.name, "logstreamity")`

### Example DQL patterns
\```
fetch logs
| filter contains(k8s.deployment.name, "logstreamity")
| sort timestamp desc
| limit 100
\```
