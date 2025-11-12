'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { X, Search, BookOpen, FileText, Table, BarChart3, Brain, Code, Clock, DollarSign, Scale, Building2, TrendingUp } from 'lucide-react';
import { MessageMetrics, formatTime, formatCost } from '@/lib/metrics-calculator';
import { PieChart, Pie, Cell, ResponsiveContainer, Sector } from 'recharts';

interface TimeSavedBreakdownDialogProps {
  metrics: MessageMetrics;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899'];

const renderActiveShape = (props: any) => {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;

  return (
    <g>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 10}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
      />
    </g>
  );
};

export function TimeSavedBreakdownDialog({
  metrics,
  open,
  onOpenChange
}: TimeSavedBreakdownDialogProps) {
  const { breakdown, timeSavedMinutes, moneySaved } = metrics;
  const [activeIndex, setActiveIndex] = useState<number | undefined>(undefined);

  // Patent-specific workflow tasks
  const allTasks = [
    { name: 'Patent Search', minutes: breakdown.sourceFindingMinutes, icon: Search, description: 'Finding relevant patents across USPTO, EPO, PCT databases' },
    { name: 'Claims Analysis', minutes: breakdown.sourceReadingMinutes, icon: Scale, description: 'Reading claims, specifications, and assessing relevance' },
    { name: 'Report Writing', minutes: breakdown.writingMinutes, icon: FileText, description: 'Prior art analysis, patentability opinions' },
    { name: 'Legal Analysis', minutes: breakdown.analysisMinutes, icon: Brain, description: 'Claim mapping, infringement analysis, invalidity search' },
    { name: 'Claim Charts', minutes: breakdown.csvCreationMinutes, icon: Table, description: 'Detailed patent comparison tables' },
    { name: 'Tech Landscapes', minutes: breakdown.chartCreationMinutes, icon: BarChart3, description: 'Patent portfolios, citation networks, filing trends' },
    { name: 'Portfolio Analysis', minutes: breakdown.dataProcessingMinutes, icon: TrendingUp, description: 'Competitive intelligence, M&A due diligence' },
  ];

  // Create a color mapping for each task based on its position in allTasks
  const getTaskColor = (taskName: string) => {
    const index = allTasks.findIndex(t => t.name === taskName);
    return COLORS[index % COLORS.length];
  };

  // Only show active tasks (with minutes > 0) in the pie chart
  const activeTasks = allTasks.filter(task => task.minutes > 0);

  const chartData = activeTasks.map((task) => ({
    name: task.name,
    value: task.minutes,
    percentage: ((task.minutes / timeSavedMinutes) * 100).toFixed(1),
    color: getTaskColor(task.name),
  }));

  const totalHours = timeSavedMinutes / 60;
  const billableDays = totalHours / 6; // 6 billable hours per day (industry standard)

  // Competitive pricing comparison
  const traditionalCosts = {
    priorArtSearch: 1500, // $1,500-$2,500 per search
    foSearch: 2500, // $1,500-$3,000 per search
    validitySearch: 5000, // $2,500-$10,000 per search
    patsnap: 12000, // $10,000-$15,000 per user/year
    derwent: 25000, // $20,000-$30,000 per user/year
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-4xl !max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="pb-3 border-b border-border">
          <DialogTitle className="text-lg font-semibold text-foreground">
            Patent Workflow Analysis
          </DialogTitle>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 gap-3 py-3">
          <div className="bg-gradient-to-br from-primary/10 to-primary/10 border border-primary/30 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-primary" />
              <div className="text-xs font-semibold text-primary">Time Saved</div>
            </div>
            <div className="text-2xl font-bold text-primary">{formatTime(timeSavedMinutes)}</div>
            <div className="text-[10px] text-primary mt-0.5">
              {billableDays.toFixed(1)} billable days
            </div>
          </div>

          <div className="bg-gradient-to-br from-primary/10 to-primary/10 border border-primary/30 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-4 h-4 text-primary" />
              <div className="text-xs font-semibold text-primary">Cost Savings</div>
            </div>
            <div className="text-2xl font-bold text-primary">{formatCost(moneySaved)}</div>
            <div className="text-[10px] text-primary mt-0.5">
              At $550/hr blended rate
            </div>
          </div>
        </div>

        {/* Chart and Legend - More compact */}
        <div className="grid grid-cols-[1fr,220px] gap-4 py-2">
          {/* Pie Chart and Hover Info */}
          <div className="flex items-center justify-center gap-4">
            <ResponsiveContainer width="70%" height={200}>
              <PieChart>
                <Pie
                  activeIndex={activeIndex !== undefined ? chartData.findIndex((_, idx) => allTasks.findIndex(t => t.name === activeTasks[idx].name) === activeIndex) : undefined}
                  activeShape={(props: any) => {
                    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
                    return (
                      <g>
                        <Sector
                          cx={cx}
                          cy={cy}
                          innerRadius={innerRadius}
                          outerRadius={outerRadius + 6}
                          startAngle={startAngle}
                          endAngle={endAngle}
                          fill={fill}
                        />
                      </g>
                    );
                  }}
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                  onMouseEnter={(_, index) => setActiveIndex(allTasks.findIndex(t => t.name === activeTasks[index].name))}
                  onMouseLeave={() => setActiveIndex(undefined)}
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} className="cursor-pointer" />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>

            {/* Active Section Info */}
            <div className="flex flex-col justify-center min-w-[120px]">
              {activeIndex !== undefined && allTasks[activeIndex].minutes > 0 ? (
                <>
                  <div className="text-xs font-semibold text-foreground mb-1">
                    {allTasks[activeIndex].name}
                  </div>
                  <div className="text-2xl font-bold text-foreground mb-1">
                    {formatTime(allTasks[activeIndex].minutes)}
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {((allTasks[activeIndex].minutes / timeSavedMinutes) * 100).toFixed(1)}% of total
                  </div>
                </>
              ) : (
                <div className="text-xs text-muted-foreground">
                  Hover to see details
                </div>
              )}
            </div>
          </div>

          {/* Legend */}
          <div className="flex flex-col justify-center space-y-1">
            {allTasks.map((task, idx) => {
              const Icon = task.icon;
              const isUsed = task.minutes > 0;
              const isActive = activeIndex === idx;
              const taskColor = getTaskColor(task.name);

              if (!isUsed) return null; // Only show used tasks

              return (
                <div
                  key={idx}
                  onMouseEnter={() => setActiveIndex(idx)}
                  onMouseLeave={() => setActiveIndex(undefined)}
                  className={`flex items-center gap-1.5 p-1.5 rounded transition-all cursor-pointer ${
                    isActive ? 'bg-muted' : 'hover:bg-muted/50'
                  }`}
                >
                  <div
                    className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                    style={{ backgroundColor: taskColor }}
                  />
                  <Icon className="w-3 h-3 text-muted-foreground" />
                  <div className="flex-1 min-w-0 text-[11px] font-medium text-foreground truncate">
                    {task.name}
                  </div>
                  <span className="text-[11px] font-semibold text-foreground tabular-nums">
                    {formatTime(task.minutes)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Competitive Pricing - Much more compact */}
        <div className="mt-3 pt-3 border-t border-border">
          <div className="text-xs font-semibold text-foreground mb-2">
            Industry Benchmark Costs
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Per-Search Costs */}
            <div>
              <div className="text-[10px] font-medium text-muted-foreground mb-1.5">Per Search</div>
              <div className="space-y-1.5">
                <div className="bg-muted/50 border border-border rounded p-2 flex items-center justify-between">
                  <div className="text-[10px] text-muted-foreground">Prior Art Search</div>
                  <div className="text-sm font-bold text-foreground">$1,500</div>
                </div>
                <div className="bg-muted/50 border border-border rounded p-2 flex items-center justify-between">
                  <div className="text-[10px] text-muted-foreground">FTO Analysis</div>
                  <div className="text-sm font-bold text-foreground">$2,500</div>
                </div>
                <div className="bg-muted/50 border border-border rounded p-2 flex items-center justify-between">
                  <div className="text-[10px] text-muted-foreground">Validity Search</div>
                  <div className="text-sm font-bold text-foreground">$5,000</div>
                </div>
              </div>
            </div>

            {/* Per-Year Subscription Costs */}
            <div>
              <div className="text-[10px] font-medium text-muted-foreground mb-1.5">Annual Subscription</div>
              <div className="space-y-1.5">
                <div className="bg-primary/10 border border-primary/30 rounded p-2 flex items-center justify-between">
                  <div className="text-[10px] text-primary">PatSnap (per user)</div>
                  <div className="text-sm font-bold text-primary">$12,000</div>
                </div>
                <div className="bg-primary/10 border border-primary/30 rounded p-2 flex items-center justify-between">
                  <div className="text-[10px] text-primary">Derwent (per user)</div>
                  <div className="text-sm font-bold text-primary">$25,000</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-2 mt-2">
          <p className="text-[9px] text-muted-foreground text-center">
            Estimates based on 2024 industry benchmarks. Attorney rates from AmLaw 200. Tool pricing from public rate cards.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
