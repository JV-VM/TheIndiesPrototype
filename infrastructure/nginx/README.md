# Nginx Reverse Proxy

This directory now contains the production reverse-proxy baseline for TheIndiesPrototype.

Routing behavior:

- `/` proxies to `tip-web`
- `/api/*` proxies to `tip-api` and strips the `/api` prefix
- `/api/realtime` upgrades to the API WebSocket endpoint at `/realtime`
- `/health` and `/ready` proxy to the web runtime so an external load balancer can probe one public address

The default configuration assumes TLS terminates before Nginx. For a direct internet-facing VPS, terminate TLS with the host reverse proxy, a cloud load balancer, or extend this config with certificate management before exposing the stack publicly.
