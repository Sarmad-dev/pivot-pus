import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Clean up expired campaign drafts every hour
crons.interval(
  "cleanup expired drafts",
  { hours: 1 }, // Run every hour
  internal.campaigns.cleanup.cleanupExpiredDrafts
);

export default crons;