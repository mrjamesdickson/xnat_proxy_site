import { useMemo, useState, useRef, useEffect } from 'react';
import { Calendar as CalendarIcon, BarChart3 } from 'lucide-react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import type { XnatExperiment } from '../services/xnat-api';

interface CalendarViewProps {
  experiments: XnatExperiment[];
  getSubjectId: (experiment: any) => string;
}

interface DateBucket {
  date: string; // YYYY-MM-DD format
  displayLabel: string;
  count: number;
  experiments: XnatExperiment[];
  x: number; // Position for rendering
  width: number; // Width for rendering
}

export function CalendarView({ experiments, getSubjectId }: CalendarViewProps) {
  const [groupBy, setGroupBy] = useState<'day' | 'week' | 'month'>('day');
  const [rangeSelection, setRangeSelection] = useState<{ start: number; end: number } | null>(null);
  const [isDragging, setIsDragging] = useState<'start' | 'end' | 'move' | null>(null);
  const [dragStart, setDragStart] = useState<number>(0);
  const chartRef = useRef<HTMLDivElement>(null);

  // Helper to parse experiment date
  const parseExperimentDate = (experiment: XnatExperiment): Date | null => {
    if (!experiment.date) return null;

    try {
      // Handle YYYYMMDD format
      if (/^\d{8}$/.test(experiment.date)) {
        const year = experiment.date.substring(0, 4);
        const month = experiment.date.substring(4, 6);
        const day = experiment.date.substring(6, 8);
        return new Date(`${year}-${month}-${day}`);
      }

      // Handle ISO format or other parseable formats
      const parsed = new Date(experiment.date);
      return isNaN(parsed.getTime()) ? null : parsed;
    } catch {
      return null;
    }
  };

  // Format date to YYYY-MM-DD
  const formatDateKey = (date: Date): string => {
    return date.toISOString().split('T')[0];
  };

  // Get week key (YYYY-Www)
  const getWeekKey = (date: Date): string => {
    const startOfYear = new Date(date.getFullYear(), 0, 1);
    const days = Math.floor((date.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
    const weekNumber = Math.ceil((days + startOfYear.getDay() + 1) / 7);
    return `${date.getFullYear()}-W${String(weekNumber).padStart(2, '0')}`;
  };

  // Get month key (YYYY-MM)
  const getMonthKey = (date: Date): string => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  };

  // Group all experiments by date
  const allDateBuckets = useMemo((): DateBucket[] => {
    const buckets = new Map<string, XnatExperiment[]>();

    experiments.forEach(exp => {
      const expDate = parseExperimentDate(exp);
      if (!expDate) return;

      const dateKey = formatDateKey(expDate);
      let key: string;
      switch (groupBy) {
        case 'week':
          key = getWeekKey(expDate);
          break;
        case 'month':
          key = getMonthKey(expDate);
          break;
        default:
          key = dateKey;
      }

      if (!buckets.has(key)) {
        buckets.set(key, []);
      }
      buckets.get(key)!.push(exp);
    });

    // Convert to array and sort
    const sorted = Array.from(buckets.entries())
      .sort((a, b) => a[0].localeCompare(b[0]));

    // Calculate positions for rendering
    const chartWidth = 100; // percentage
    const barWidth = chartWidth / Math.max(sorted.length, 1);

    const result: DateBucket[] = sorted.map(([date, exps], idx) => {
      let displayLabel = date;
      if (groupBy === 'week') {
        const [year, week] = date.split('-W');
        displayLabel = `W${week}`;
      } else if (groupBy === 'month') {
        const [year, month] = date.split('-');
        const monthDate = new Date(parseInt(year), parseInt(month) - 1);
        displayLabel = monthDate.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      } else {
        const d = new Date(date);
        displayLabel = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      }

      return {
        date,
        displayLabel,
        count: exps.length,
        experiments: exps,
        x: idx * barWidth,
        width: barWidth,
      };
    });

    return result;
  }, [experiments, groupBy]);

  const maxCount = Math.max(...allDateBuckets.map(b => b.count), 1);

  // Filter buckets based on range selection
  const filteredBuckets = useMemo(() => {
    if (!rangeSelection) return allDateBuckets;

    return allDateBuckets.filter((bucket, idx) => {
      const bucketCenter = bucket.x + bucket.width / 2;
      return bucketCenter >= rangeSelection.start && bucketCenter <= rangeSelection.end;
    });
  }, [allDateBuckets, rangeSelection]);

  const filteredExperiments = useMemo(() => {
    return filteredBuckets.flatMap(b => b.experiments);
  }, [filteredBuckets]);

  const handleQuickRange = (days: number) => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const endKey = formatDateKey(endDate);
    const startKey = formatDateKey(startDate);

    // Find the range in buckets
    const startIdx = allDateBuckets.findIndex(b => b.date >= startKey);
    const endIdx = allDateBuckets.findIndex(b => b.date > endKey);

    if (startIdx !== -1) {
      const start = allDateBuckets[startIdx].x;
      const end = endIdx !== -1
        ? allDateBuckets[endIdx].x
        : allDateBuckets[allDateBuckets.length - 1].x + allDateBuckets[allDateBuckets.length - 1].width;

      setRangeSelection({ start, end });
    }
  };

  const handleMouseDown = (e: React.MouseEvent, type: 'start' | 'end' | 'move') => {
    e.preventDefault();
    setIsDragging(type);
    setDragStart(e.clientX);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging || !chartRef.current || !rangeSelection) return;

    const rect = chartRef.current.getBoundingClientRect();
    const relativeX = ((e.clientX - rect.left) / rect.width) * 100;
    const clampedX = Math.max(0, Math.min(100, relativeX));

    if (isDragging === 'start') {
      setRangeSelection(prev => prev ? {
        start: Math.min(clampedX, prev.end - 1),
        end: prev.end,
      } : null);
    } else if (isDragging === 'end') {
      setRangeSelection(prev => prev ? {
        start: prev.start,
        end: Math.max(clampedX, prev.start + 1),
      } : null);
    } else if (isDragging === 'move') {
      const delta = ((e.clientX - dragStart) / rect.width) * 100;
      const width = rangeSelection.end - rangeSelection.start;
      const newStart = Math.max(0, Math.min(100 - width, rangeSelection.start + delta));

      setRangeSelection({
        start: newStart,
        end: newStart + width,
      });
      setDragStart(e.clientX);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(null);
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, rangeSelection, dragStart]);

  const clearSelection = () => {
    setRangeSelection(null);
  };

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="bg-white rounded-lg shadow-sm ring-1 ring-gray-900/5 p-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          {/* Group By */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Group by:</label>
            <select
              value={groupBy}
              onChange={(e) => {
                setGroupBy(e.target.value as 'day' | 'week' | 'month');
                setRangeSelection(null);
              }}
              className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
            >
              <option value="day">Day</option>
              <option value="week">Week</option>
              <option value="month">Month</option>
            </select>
          </div>

          {/* Quick Range Buttons */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Quick select:</span>
            {[7, 30, 90, 180, 365].map(days => (
              <button
                key={days}
                type="button"
                onClick={() => handleQuickRange(days)}
                className="px-3 py-1 text-sm rounded-md bg-gray-100 hover:bg-gray-200 text-gray-700"
              >
                {days}d
              </button>
            ))}
            {rangeSelection && (
              <button
                type="button"
                onClick={clearSelection}
                className="px-3 py-1 text-sm rounded-md bg-red-100 hover:bg-red-200 text-red-700"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Histogram */}
      <div className="bg-white rounded-lg shadow-sm ring-1 ring-gray-900/5 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">Experiment Distribution</h3>
          </div>
          <div className="text-sm text-gray-500">
            {rangeSelection
              ? `${filteredBuckets.length} of ${allDateBuckets.length} ${groupBy === 'day' ? 'days' : groupBy === 'week' ? 'weeks' : 'months'} selected`
              : `${allDateBuckets.length} ${groupBy === 'day' ? 'days' : groupBy === 'week' ? 'weeks' : 'months'} with data`
            }
          </div>
        </div>

        {allDateBuckets.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <CalendarIcon className="mx-auto h-12 w-12 text-gray-400 mb-3" />
            <p>No experiments with dates found</p>
          </div>
        ) : (
          <div className="space-y-2">
            {/* Chart Container */}
            <div
              ref={chartRef}
              className="relative h-64 bg-gray-50 rounded-lg overflow-hidden cursor-crosshair"
              style={{ userSelect: 'none' }}
            >
              {/* Bars */}
              {allDateBuckets.map((bucket) => {
                const height = (bucket.count / maxCount) * 100;
                const isInRange = !rangeSelection || (
                  bucket.x + bucket.width / 2 >= rangeSelection.start &&
                  bucket.x + bucket.width / 2 <= rangeSelection.end
                );

                return (
                  <div
                    key={bucket.date}
                    className="absolute bottom-0 transition-all"
                    style={{
                      left: `${bucket.x}%`,
                      width: `${bucket.width}%`,
                      height: `${height}%`,
                      padding: '0 1px',
                    }}
                  >
                    <div
                      className={clsx(
                        'h-full rounded-t transition-colors',
                        isInRange ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-300'
                      )}
                      title={`${bucket.displayLabel}: ${bucket.count} experiment${bucket.count !== 1 ? 's' : ''}`}
                    />
                  </div>
                );
              })}

              {/* Range Selection Overlay */}
              {rangeSelection && (
                <>
                  {/* Selected range highlight */}
                  <div
                    className="absolute top-0 bottom-0 bg-blue-200 bg-opacity-30 border-l-2 border-r-2 border-blue-500"
                    style={{
                      left: `${rangeSelection.start}%`,
                      width: `${rangeSelection.end - rangeSelection.start}%`,
                    }}
                    onMouseDown={(e) => handleMouseDown(e, 'move')}
                  />

                  {/* Start handle */}
                  <div
                    className="absolute top-0 bottom-0 w-2 bg-blue-600 cursor-ew-resize hover:bg-blue-700"
                    style={{ left: `${rangeSelection.start}%`, transform: 'translateX(-50%)' }}
                    onMouseDown={(e) => handleMouseDown(e, 'start')}
                  />

                  {/* End handle */}
                  <div
                    className="absolute top-0 bottom-0 w-2 bg-blue-600 cursor-ew-resize hover:bg-blue-700"
                    style={{ left: `${rangeSelection.end}%`, transform: 'translateX(-50%)' }}
                    onMouseDown={(e) => handleMouseDown(e, 'end')}
                  />
                </>
              )}
            </div>

            {/* X-axis labels */}
            <div className="relative h-8">
              {allDateBuckets.filter((_, idx, arr) => {
                const step = Math.ceil(arr.length / 10);
                return idx % step === 0;
              }).map((bucket) => (
                <div
                  key={bucket.date}
                  className="absolute text-xs text-gray-600"
                  style={{
                    left: `${bucket.x + bucket.width / 2}%`,
                    transform: 'translateX(-50%)',
                  }}
                >
                  {bucket.displayLabel}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Filtered Experiments List */}
      {rangeSelection && filteredExperiments.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm ring-1 ring-gray-900/5 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Experiments in Selected Range ({filteredExperiments.length})
          </h3>

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {filteredExperiments.map((experiment, idx) => {
              const subjectId = getSubjectId(experiment);
              const projectId = experiment.project;

              return (
                <Link
                  key={idx}
                  to={`/projects/${projectId}/subjects/${subjectId}/experiments/${experiment.id || experiment.label}`}
                  className="flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex-shrink-0">
                      <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                        <span className="text-sm font-semibold text-blue-700">
                          {experiment.modality || 'N/A'}
                        </span>
                      </div>
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">
                        {experiment.label || experiment.id}
                      </div>
                      <div className="text-sm text-gray-500">
                        {projectId} • {subjectId} • {experiment.date}
                      </div>
                    </div>
                  </div>
                  <div className="text-sm text-gray-500">
                    View →
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Summary */}
      <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-600">
        <div className="flex items-center justify-between">
          <span>
            Total: {experiments.length} experiment{experiments.length !== 1 ? 's' : ''}
          </span>
          {rangeSelection && (
            <span>
              Selected: {filteredExperiments.length} experiment{filteredExperiments.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
