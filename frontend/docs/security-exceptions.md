# Frontend Security Exceptions

## GHSA-qwww-vcr4-c8h2

### Dependency

- Package: react-router
- Installed version: 7.18.2
- Severity reported by scanners: High
- Fixed upstream version: 8.3.0

### Applicability

The advisory affects unstable React Server Components APIs.

CloudOps Insight currently uses a client-side Vite single-page application
with React Router Data Mode through createBrowserRouter and RouterProvider.

The application does not use:

- React Server Components
- React Router Framework Mode
- Server route actions
- Unstable RSC APIs

Therefore, the vulnerable execution path is not present in the current
application architecture.

### Resolution plan

Remain on the latest supported React Router v7 release until either:

1. The security fix is backported to React Router v7, or
2. The project satisfies the React Router v8 runtime requirements and migrates
   from react-router-dom imports to react-router imports.

This exception must be reviewed whenever React Router is upgraded or when
server-side routing features are introduced.
