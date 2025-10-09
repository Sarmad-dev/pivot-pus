"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
} from "recharts";
import { TrendingUp, TrendingDown, AlertTriangle, CheckCircle } from "lucide-react";
import { format } from "date-fns";

interface PredictedVsActualChartProps {
  simulationResults: {
    trajectories: Array<{
      date: number;
      metrics: Record<string, number>;
      confidence: number;
    }>;
    scenarios: Array<{
      type: string;
      trajectory: Array<{
        date: number;
        metrics: Record<string, number>;
      }>;
    }>;
  };
  actualPerformance: Array<{
    date: number;
    metrics: Record<string, number>;
  }>;
  metric: string;
  title?: string;
}

export function PredictedVsActualChart({ 
  simulationResults, 
  actualPerformance, 
  metric,
  title 
}: PredictedVsActualChartProps) {
  const chartData = useMemo(() => {
    // Combine predicted and actual data
    const dataMap = new Map<number, any>();

    // Add predicted data
    simulationResults.trajectories.forEach(point => {
      const date = point.date;
      if (!dataMap.has(date)) {
        dataMap.set(date, { 
          date, 
          dateFormatted: format(new Date(date), 'MMM dd'),
          confidence: point.confidence 
        });
      }
      dataMap.get(date)![`predicted_${metric}`] = point.metrics[metric];
    });

    // Add scenario data
    const realisticScenario = simulationResults.scenarios.find(s => s.type === 'realistic');
    if (realisticScenario) {
      realisticScenario.trajectory.forEach(point => {
        const date = point.date;
        if (dataMap.has(date)) {
          dataMap.get(date)![`realistic_${metric}`] = point.metrics[metric];
        }
      });
    }

    const optimisticScenario = simulationResults.scenarios.find(s => s.type === 'optimistic');
    if (optimisticScenario) {
      optimisticScenario.trajectory.forEach(point => {
        const date = point.date;
        if (dataMap.has(date)) {
          dataMap.get(date)![`optimistic_${metric}`] = point.metrics[metric];
        }
      });
    }

    const pessimisticScenario = simulationResults.scenarios.find(s => s.type === 'pessimistic');
    if (pessimisticScenario) {
      pessimisticScenario.trajectory.forEach(point => {
        const date = point.date;
        if (dataMap.has(date)) {
          dataMap.get(date)![`pessimistic_${metric}`] = point.metrics[metric];
        }
      });
    }

    // Add actual data
    actualPerformance.forEach(point => {
      const date = point.date;
      if (dataMap.has(date)) {
        dataMap.get(date)![`actual_${metric}`] = point.metrics[metric];
      }
    });

    return Array.from(dataMap.values()).sort((a, b) => a.date - b.date);
  }, [simulationResults, actualPerformance, metric]);

  const accuracy = useMemo(() => {
    const actualPoints = chartData.filter(d => d[`actual_${metric}`] !== undefined);
    if (actualPoints.length === 0) return null;

    const errors = actualPoints.map(point => {
      const predicted = point[`predicted_${metric}`] || point[`realistic_${metric}`];
      const actual = point[`actual_${metric}`];
      if (predicted === undefined || actual === undefined) return null;
      
      return Math.abs((predicted - actual) / actual);
    }).filter((error): error is number => error !== null);

    if (errors.length === 0) return null;

    const meanError = errors.reduce((sum, error) => sum + error, 0) / errors.length;
    return Math.max(0, 1 - meanError); // Convert to accuracy percentage
  }, [chartData, metric]);

  const getAccuracyBadge = (accuracy: number | null) => {
    if (accuracy === null) return null;
    
    const percentage = Math.round(accuracy * 100);
    if (percentage >= 80) {
      return <Badge className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />{percentage}% Accurate</Badge>;
    } else if (percentage >= 60) {
      return <Badge className="bg-yellow-100 text-yellow-800"><TrendingUp className="h-3 w-3 mr-1" />{percentage}% Accurate</Badge>;
    } else {
      return <Badge className="bg-red-100 text-red-800"><AlertTriangle className="h-3 w-3 mr-1" />{percentage}% Accurate</Badge>;
    }
  };

  const formatMetricValue = (value: number) => {
    if (metric === 'ctr' || metric === 'engagement') {
      return `${(value * 100).toFixed(2)}%`;
    } else if (metric === 'cpc' || metric === 'cpm') {
      return `$${value.toFixed(2)}`;
    } else {
      return value.toLocaleString();
    }
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg">
          <p className="font-medium">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }}>
              {entry.name}: {formatMetricValue(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            {title || `Predicted vs Actual ${metric.toUpperCase()}`}
          </CardTitle>
          {getAccuracyBadge(accuracy)}
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="dateFormatted" 
                tick={{ fontSize: 12 }}
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                tickFormatter={formatMetricValue}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              
              {/* Predicted line */}
              <Line
                type="monotone"
                dataKey={`predicted_${metric}`}
                stroke="#3b82f6"
                strokeWidth={2}
                dot={{ r: 4 }}
                name="AI Prediction"
                connectNulls={false}
              />
              
              {/* Scenario lines */}
              <Line
                type="monotone"
                dataKey={`optimistic_${metric}`}
                stroke="#10b981"
                strokeWidth={1}
                strokeDasharray="5 5"
                dot={false}
                name="Optimistic"
                connectNulls={false}
              />
              
              <Line
                type="monotone"
                dataKey={`pessimistic_${metric}`}
                stroke="#f59e0b"
                strokeWidth={1}
                strokeDasharray="5 5"
                dot={false}
                name="Pessimistic"
                connectNulls={false}
              />
              
              {/* Actual performance line */}
              <Line
                type="monotone"
                dataKey={`actual_${metric}`}
                stroke="#ef4444"
                strokeWidth={3}
                dot={{ r: 5, fill: "#ef4444" }}
                name="Actual Performance"
                connectNulls={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        
        {accuracy !== null && (
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Prediction Accuracy:</span>
              <span className="font-medium">{Math.round(accuracy * 100)}%</span>
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              Based on {chartData.filter(d => d[`actual_${metric}`] !== undefined).length} actual data points
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}