# reporting

Read-only reporting: a catalog projection fed by events, and back-office reports composed from other modules.

## Public API

- `index.ts`: reporting DTOs (`CatalogStats`, `CatalogSnapshot`, `ReportedProduct`).
- `server.ts`: `createReportingServices({ ..., catalog, orders, customers, eventBus })` returning `{ reporting, commerce }`.
  - `reporting` — catalog stats and snapshot.
  - `commerce` — `salesReport` (revenue, daily buckets, status counts, top products over a date range, default last 30 days), `inventoryReport` (stock bands, value, lowest-stock variants, 30-day movement totals) and `dashboard` (counts, revenue, recent orders, low stock). All need `admin:access`.

## Owned tables

- `reporting_catalog_products` — denormalized product status fed by catalog events.

## Events

- Consumes `catalog.product.created`, `catalog.product.updated`, `catalog.product.status-changed`.
- Emits none.

## Allowed dependencies

- `catalog` public API (`#modules/catalog/index.ts`, `#modules/catalog/server.ts`): products, inventory `getReportData`.
- `orders` (`getSalesData`, `getTotals`, `listOrders`) and `customers` (`listCustomers`) services.
- `shared`.
