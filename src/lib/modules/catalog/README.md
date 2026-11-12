# catalog

Catalog bounded context. Owns products, brands, categories, product variants and inventory.

## Public API

- `index.ts`: domain DTOs, Zod write/list schemas, event names and payload types.
- `server.ts`: `createCatalogServices()` and service types.

## Owned tables

All tables use the `catalog_` prefix and live in `infra/{pg,sqlite}/schema.ts`:

- `catalog_brands`
- `catalog_categories`
- `catalog_products`
- `catalog_product_images`
- `catalog_product_options`
- `catalog_product_option_values`
- `catalog_product_variants`
- `catalog_inventory_movements`

## Events

Emits `catalog.product.created`, `catalog.product.updated`,
`catalog.product.status-changed`, and `catalog.inventory.adjusted`.

## Nesting note

`brands`, `categories`, `products`, and `inventory` are submodules for domain and
application logic only. Catalog owns the aggregate schema and repository
adapters in `infra/{pg,sqlite}/repositories/` so a single module owns these
closely related tables, and no submodule reaches into a sibling's tables.

## Allowed dependencies

- `shared`
- `#db/core.ts` for the database handle, only inside `infra/`.
