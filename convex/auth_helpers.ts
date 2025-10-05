import { Id } from "./_generated/dataModel";
import { QueryCtx, MutationCtx } from "./_generated/server";

// Helper function to get user ID from auth context
export async function getUserIdFromIdentity(ctx: QueryCtx | MutationCtx): Promise<Id<"users">> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Not authenticated");
  }

  // The identity.subject contains a compound identifier like "providerId|sessionId"
  // Extract the sessionId part (after the |)
  const parts = identity.subject.split("|");
  if (parts.length !== 2) {
    throw new Error("Invalid identity format");
  }
  
  const sessionId = parts[1] as Id<"authSessions">;
  
  // Look up the auth session to get the user ID
  const session = await ctx.db.get(sessionId);
  if (!session) {
    throw new Error("Session not found");
  }

  return session.userId;
}