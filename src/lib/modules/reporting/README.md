# reporting

Read-only reporting module.

## Public API

- `index.ts`: reporting DTOs (`CatalogStats`, `CatalogSnapshot`, `ReportedProduct`).
- `server.ts`: `createReportingServices()`.

## Owned tables

- `reporting_catalog_products` — denormalized product status fed by catalog events.

## Events

- Consumes `catalog.product.created`, `catalog.product.updated`, `catalog.product.status-changed`.
- Emits none.

## Allowed dependencies

- `catalog` public API (`#modules/catalog/index.ts`, `#modules/catalog/server.ts`).
- `shared`.
