/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as api_ from "../api.js";
import type * as auth from "../auth.js";
import type * as auth_helpers from "../auth_helpers.js";
import type * as campaigns_cleanup from "../campaigns/cleanup.js";
import type * as campaigns_helpers from "../campaigns/helpers.js";
import type * as campaigns_index from "../campaigns/index.js";
import type * as campaigns_mutations from "../campaigns/mutations.js";
import type * as campaigns_queries from "../campaigns/queries.js";
import type * as campaigns_validation from "../campaigns/validation.js";
import type * as campaigns_verify from "../campaigns/verify.js";
import type * as crons from "../crons.js";
import type * as emailService from "../emailService.js";
import type * as externalDataSources from "../externalDataSources.js";
import type * as http from "../http.js";
import type * as lib_encryption from "../lib/encryption.js";
import type * as migrations from "../migrations.js";
import type * as notifications from "../notifications.js";
import type * as organizations from "../organizations.js";
import type * as permissions from "../permissions.js";
import type * as platformConnections from "../platformConnections.js";
import type * as processingQueue from "../processingQueue.js";
import type * as simulationCache from "../simulationCache.js";
import type * as simulationHelpers from "../simulationHelpers.js";
import type * as simulations from "../simulations.js";
import type * as users from "../users.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  api: typeof api_;
  auth: typeof auth;
  auth_helpers: typeof auth_helpers;
  "campaigns/cleanup": typeof campaigns_cleanup;
  "campaigns/helpers": typeof campaigns_helpers;
  "campaigns/index": typeof campaigns_index;
  "campaigns/mutations": typeof campaigns_mutations;
  "campaigns/queries": typeof campaigns_queries;
  "campaigns/validation": typeof campaigns_validation;
  "campaigns/verify": typeof campaigns_verify;
  crons: typeof crons;
  emailService: typeof emailService;
  externalDataSources: typeof externalDataSources;
  http: typeof http;
  "lib/encryption": typeof lib_encryption;
  migrations: typeof migrations;
  notifications: typeof notifications;
  organizations: typeof organizations;
  permissions: typeof permissions;
  platformConnections: typeof platformConnections;
  processingQueue: typeof processingQueue;
  simulationCache: typeof simulationCache;
  simulationHelpers: typeof simulationHelpers;
  simulations: typeof simulations;
  users: typeof users;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
