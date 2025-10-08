import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

/**
 * Email notification service for campaign-related events
 * This is a basic implementation that logs email events.
 * In production, this would integrate with an email service like SendGrid, Resend, etc.
 */

// Email template types
export type EmailTemplate =
  | "campaign_assignment"
  | "campaign_created"
  | "role_changed"
  | "campaign_published"
  | "campaign_deleted"
  | "team_member_removed";

// Email data interface
interface EmailData {
  to: string;
  subject: string;
  template: EmailTemplate;
  data: Record<string, any>;
}

// Send email notification
export const sendEmailNotification = mutation({
  args: {
    userId: v.id("users"),
    template: v.string(),
    subject: v.string(),
    data: v.any(),
  },
  handler: async (ctx, args) => {
    // Get user email
    const user = await ctx.db.get(args.userId);
    if (!user || !user.email) {
      console.warn(
        `Cannot send email to user ${args.userId}: no email address`
      );
      return false;
    }

    // In production, this would send actual emails
    // For now, we'll log the email event and store it for tracking
    const emailLog = {
      userId: args.userId,
      email: user.email,
      template: args.template,
      subject: args.subject,
      data: args.data,
      status: "sent" as const,
      sentAt: Date.now(),
    };

    // Log the email (in production, replace with actual email sending)
    console.log("Email notification:", emailLog);

    // Store email log in database for tracking
    await ctx.db.insert("emailLogs", emailLog);

    return true;
  },
});

// Get email templates
export function getEmailTemplate(
  template: EmailTemplate,
  data: Record<string, any>
): { subject: string; body: string } {
  switch (template) {
    case "campaign_assignment":
      return {
        subject: `You've been assigned to campaign: ${data.campaignName}`,
        body: `
          Hi ${data.userName || "there"},
          
          You have been assigned to the campaign "${data.campaignName}" as ${data.role} by ${data.assignedByName}.
          
          Campaign Details:
          - Name: ${data.campaignName}
          - Role: ${data.role}
          - Organization: ${data.organizationName}
          
          You can view the campaign details in your PivotPulse dashboard.
          
          Best regards,
          The PivotPulse Team
        `,
      };

    case "campaign_created":
      return {
        subject: `New campaign created: ${data.campaignName}`,
        body: `
          Hi ${data.userName || "there"},
          
          A new campaign "${data.campaignName}" has been created by ${data.createdByName}.
          
          Campaign Details:
          - Name: ${data.campaignName}
          - Created by: ${data.createdByName}
          - Organization: ${data.organizationName}
          
          You can view the campaign details in your PivotPulse dashboard.
          
          Best regards,
          The PivotPulse Team
        `,
      };

    case "role_changed":
      return {
        subject: `Your role has been updated in campaign: ${data.campaignName}`,
        body: `
          Hi ${data.userName || "there"},
          
          Your role in the campaign "${data.campaignName}" has been changed to ${data.newRole} by ${data.changedByName}.
          
          Campaign Details:
          - Name: ${data.campaignName}
          - New Role: ${data.newRole}
          - Changed by: ${data.changedByName}
          
          You can view the campaign details in your PivotPulse dashboard.
          
          Best regards,
          The PivotPulse Team
        `,
      };

    case "campaign_published":
      return {
        subject: `Campaign published: ${data.campaignName}`,
        body: `
          Hi ${data.userName || "there"},
          
          The campaign "${data.campaignName}" has been published and is now active.
          
          Campaign Details:
          - Name: ${data.campaignName}
          - Published by: ${data.publishedByName}
          - Status: Active
          
          You can monitor the campaign progress in your PivotPulse dashboard.
          
          Best regards,
          The PivotPulse Team
        `,
      };

    case "campaign_deleted":
      return {
        subject: `Campaign deleted: ${data.campaignName}`,
        body: `
          Hi ${data.userName || "there"},
          
          The campaign "${data.campaignName}" has been deleted by ${data.deletedByName}.
          
          If you have any questions about this action, please contact your team administrator.
          
          Best regards,
          The PivotPulse Team
        `,
      };

    case "team_member_removed":
      return {
        subject: `Removed from campaign: ${data.campaignName}`,
        body: `
          Hi ${data.userName || "there"},
          
          You have been removed from the campaign "${data.campaignName}".
          
          If you have any questions about this action, please contact your team administrator.
          
          Best regards,
          The PivotPulse Team
        `,
      };

    default:
      return {
        subject: "PivotPulse Notification",
        body: "You have a new notification in PivotPulse.",
      };
  }
}

// Helper function to send campaign assignment email
export const sendCampaignAssignmentEmail = mutation({
  args: {
    userId: v.id("users"),
    campaignName: v.string(),
    role: v.string(),
    assignedByUserId: v.id("users"),
    organizationName: v.string(),
  },
  handler: async (ctx, args): Promise<boolean> => {
    const user = await ctx.db.get(args.userId);
    const assignedByUser = await ctx.db.get(args.assignedByUserId);

    if (!user || !assignedByUser) {
      return false;
    }

    const template = getEmailTemplate("campaign_assignment", {
      userName: user.name,
      campaignName: args.campaignName,
      role: args.role,
      assignedByName: assignedByUser.name || assignedByUser.email,
      organizationName: args.organizationName,
    });

    // Log the email (in production, replace with actual email sending)
    const emailLog = {
      userId: args.userId,
      email: user.email!,
      template: "campaign_assignment",
      subject: template.subject,
      data: {
        body: template.body,
        campaignName: args.campaignName,
        role: args.role,
      },
      status: "sent" as const,
      sentAt: Date.now(),
    };

    console.log("Email notification:", emailLog);
    await ctx.db.insert("emailLogs", emailLog);

    return true;
  },
});

// Helper function to send campaign creation email
export const sendCampaignCreationEmail = mutation({
  args: {
    userId: v.id("users"),
    campaignName: v.string(),
    createdByUserId: v.id("users"),
    organizationName: v.string(),
  },
  handler: async (ctx, args): Promise<boolean> => {
    const user = await ctx.db.get(args.userId);
    const createdByUser = await ctx.db.get(args.createdByUserId);

    if (!user || !createdByUser) {
      return false;
    }

    const template = getEmailTemplate("campaign_created", {
      userName: user.name,
      campaignName: args.campaignName,
      createdByName: createdByUser.name || createdByUser.email,
      organizationName: args.organizationName,
    });

    // Log the email (in production, replace with actual email sending)
    const emailLog = {
      userId: args.userId,
      email: user.email!,
      template: "campaign_created",
      subject: template.subject,
      data: {
        body: template.body,
        campaignName: args.campaignName,
      },
      status: "sent" as const,
      sentAt: Date.now(),
    };

    console.log("Email notification:", emailLog);
    await ctx.db.insert("emailLogs", emailLog);

    return true;
  },
});

// Helper function to send role change email
export const sendRoleChangeEmail = mutation({
  args: {
    userId: v.id("users"),
    campaignName: v.string(),
    newRole: v.string(),
    changedByUserId: v.id("users"),
  },
  handler: async (ctx, args): Promise<boolean> => {
    const user = await ctx.db.get(args.userId);
    const changedByUser = await ctx.db.get(args.changedByUserId);

    if (!user || !changedByUser) {
      return false;
    }

    const template = getEmailTemplate("role_changed", {
      userName: user.name,
      campaignName: args.campaignName,
      newRole: args.newRole,
      changedByName: changedByUser.name || changedByUser.email,
    });

    // Log the email (in production, replace with actual email sending)
    const emailLog = {
      userId: args.userId,
      email: user.email!,
      template: "role_changed",
      subject: template.subject,
      data: {
        body: template.body,
        campaignName: args.campaignName,
        newRole: args.newRole,
      },
      status: "sent" as const,
      sentAt: Date.now(),
    };

    console.log("Email notification:", emailLog);
    await ctx.db.insert("emailLogs", emailLog);

    return true;
  },
});
