import { closeDatabase } from "../backend/database";
import { seedSyntheticFixture } from "../backend/fixtures";

await seedSyntheticFixture();
console.log(JSON.stringify({ fixture: "synthetic-isolated", status: "seeded" }));
await closeDatabase();
