// Public bootstrapping action: seeds the demo world. The client only fires it
// after observing an empty marketplace (see api.crops.marketStatus), so a
// fresh deployment bootstraps itself on first load instead of opening against
// a blank database.
import { action } from "./_generated/server";
import { runSeed } from "./seedRun";

export const ensureSeeded = action({
  args: {},
  handler: async (ctx) => runSeed(ctx),
});
