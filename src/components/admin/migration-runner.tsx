"use client";

import React, { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Database, Play, CheckCircle, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export function MigrationRunner() {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<any[]>([]);

  const migrateOrganizations = useMutation(api.migrations.migrateOrganizations);
  const createMissingMemberships = useMutation(api.migrations.createMissingMemberships);

  const runMigration = async (migrationName: string, migrationFn: any) => {
    setIsRunning(true);
    try {
      const result = await migrationFn();
      setResults(prev => [...prev, { name: migrationName, success: true, result }]);
      toast.success(`${migrationName} completed successfully`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Migration failed";
      setResults(prev => [...prev, { name: migrationName, success: false, error: errorMessage }]);
      toast.error(`${migrationName} failed: ${errorMessage}`);
    } finally {
      setIsRunning(false);
    }
  };

  const runAllMigrations = async () => {
    setResults([]);
    await runMigration("Migrate Organizations", migrateOrganizations);
    await runMigration("Create Missing Memberships", createMissingMemberships);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Database Migrations
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            These migrations will update existing data to be compatible with the new schema.
            Run these if you're experiencing schema validation errors.
          </AlertDescription>
        </Alert>

        <div className="space-y-2">
          <Button
            onClick={() => runMigration("Migrate Organizations", migrateOrganizations)}
            disabled={isRunning}
            className="w-full justify-start"
          >
            <Play className="h-4 w-4 mr-2" />
            Migrate Organizations (Add missing fields)
          </Button>

          <Button
            onClick={() => runMigration("Create Missing Memberships", createMissingMemberships)}
            disabled={isRunning}
            className="w-full justify-start"
          >
            <Play className="h-4 w-4 mr-2" />
            Create Missing Organization Memberships
          </Button>

          <Button
            onClick={runAllMigrations}
            disabled={isRunning}
            variant="outline"
            className="w-full justify-start"
          >
            <Play className="h-4 w-4 mr-2" />
            Run All Migrations
          </Button>
        </div>

        {results.length > 0 && (
          <div className="space-y-2">
            <h3 className="font-medium">Migration Results:</h3>
            {results.map((result, index) => (
              <div
                key={index}
                className={`p-3 rounded-lg border ${
                  result.success
                    ? "bg-green-50 border-green-200"
                    : "bg-red-50 border-red-200"
                }`}
              >
                <div className="flex items-center gap-2">
                  {result.success ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                  )}
                  <span className="font-medium">{result.name}</span>
                </div>
                {result.success ? (
                  <p className="text-sm text-green-700 mt-1">
                    {result.result.message}
                  </p>
                ) : (
                  <p className="text-sm text-red-700 mt-1">{result.error}</p>
                )}
              </div>
            ))}
          </div>
        )}

        {isRunning && (
          <div className="flex items-center justify-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            <span className="ml-2">Running migration...</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}