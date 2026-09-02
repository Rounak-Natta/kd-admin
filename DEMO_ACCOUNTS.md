# Kitchen Diaries demo accounts

All demo tenants are seeded with an **ACTIVE subscription**, a registered counter device, realistic menu categories, variations, add-ons, inventory opening stock and recipe-based inventory deduction examples.

Common password: `Demo@12345`

| Demo restaurant | Owner login | Plan | Device limit |
|---|---|---:|---:|
| Bengal Bistro | `bengal@demo.kitchendiaries.local` | PRO | 3 |
| Spice Route Kitchen | `spice@demo.kitchendiaries.local` | BASIC | 1 |
| Coastal Catch | `coastal@demo.kitchendiaries.local` | PRO | 4 |
| Oven & Bean Cafe | `oven@demo.kitchendiaries.local` | CUSTOM | 2 |
| Urban Tiffin Co. | `urban@demo.kitchendiaries.local` | BASIC | 2 |

Each tenant also has Manager and Cashier users using `manager.<key>@demo.kitchendiaries.local` and `cashier.<key>@demo.kitchendiaries.local` with the same demo password.

## Admin demo

Run `npm run db:seed:admin` from the admin repository. Development default:

- Email: `admin@kitchendiaries.local`
- Password: `Admin@123456`

Production seeding refuses the known development password and requires `CONTROL_ADMIN_EMAIL` and `CONTROL_ADMIN_PASSWORD`.
