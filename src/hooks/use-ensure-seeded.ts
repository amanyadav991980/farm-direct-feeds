import { api } from "@/convex/_generated/api";
import { useAction, useQuery } from "convex/react";
import { useEffect } from "react";

let seedingStarted = false;

/**
 * A fresh deployment boots against an empty database; when the catalogue probe
 * reports zero rows this fires the seed action exactly once per page load.
 */
export function useEnsureSeeded() {
  const status = useQuery(api.crops.marketStatus);
  const ensureSeeded = useAction(api.ensureSeeded.ensureSeeded);

  useEffect(() => {
    if (!status || seedingStarted) return;
    if (status.farmers === 0 && status.crops === 0) {
      seedingStarted = true;
      void ensureSeeded().catch((err) => {
        seedingStarted = false;
        console.error("Demo seeding failed", err);
      });
    }
  }, [status, ensureSeeded]);

  return status;
}
