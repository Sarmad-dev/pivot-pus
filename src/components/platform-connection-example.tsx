/**
 * Example component demonstrating platform connection usage
 * This is a reference implementation - adapt as needed for your UI
 */

'use client';

import { usePlatformConnection } from '@/hooks/usePlatformConnection';
import { PlatformType } from '@/lib/api/types';
import { Id } from '../../convex/_generated/dataModel';

interface PlatformConnectionButtonProps {
  platform: PlatformType;
  organizationId: Id<'organizations'>;
}

export function PlatformConnectionButton({
  platform,
  organizationId,
}: PlatformConnectionButtonProps) {
  const { connection, isConnected, isLoading, connect, disconnect } =
    usePlatformConnection(platform, organizationId);

  const platformName = platform === 'facebook' ? 'Facebook Ads' : 'Google Ads';

  if (isLoading) {
    return (
      <button disabled className="px-4 py-2 bg-gray-300 rounded">
        Loading...
      </button>
    );
  }

  if (isConnected) {
    return (
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full" />
          <span className="text-sm text-gray-700">
            Connected to {platformName}
          </span>
          {connection?.platformUserName && (
            <span className="text-sm text-gray-500">
              ({connection.platformUserName})
            </span>
          )}
        </div>
        <button
          onClick={disconnect}
          className="px-4 py-2 text-sm text-red-600 border border-red-600 rounded hover:bg-red-50"
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={connect}
      className="px-4 py-2 text-sm text-white bg-blue-600 rounded hover:bg-blue-700"
    >
      Connect {platformName}
    </button>
  );
}

/**
 * Example: Platform connections list
 */
export function PlatformConnectionsList({
  organizationId,
}: {
  organizationId: Id<'organizations'>;
}) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Connected Platforms</h3>
      <div className="space-y-3">
        <PlatformConnectionButton
          platform="facebook"
          organizationId={organizationId}
        />
        <PlatformConnectionButton
          platform="google"
          organizationId={organizationId}
        />
      </div>
    </div>
  );
}
