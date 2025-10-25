import { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { Calendar as CalendarIcon, BarChart3, X } from 'lucide-react';
import clsx from 'clsx';
import type { XnatExperiment } from '../services/xnat-api';

interface DateFilterModalProps {
  experiments: XnatExperiment[];
  isOpen: boolean;
  onClose: () => void;
  onApplyFilter: (dateRange: { start: string; end: string } | null) => void;
  currentFilter: { start: string; end: string } | null;
}

interface DateBucket {
  date: string; // YYYY-MM-DD format
  displayLabel: string;
  count: number;
  experiments: XnatExperiment[];
  x: number; // Position for rendering
  width: number; // Width for rendering
}

// Helper to parse experiment date (static version)
const parseExperimentDateStatic = (experiment: XnatExperiment): Date | null => {
  if (!experiment.date) return null;

  try {
    const dateStr = experiment.date.trim();

    // Handle YYYYMMDD format (8 digits)
    if (/^\d{8}$/.test(dateStr)) {
      const year = dateStr.substring(0, 4);
      const month = dateStr.substring(4, 6);
      const day = dateStr.substring(6, 8);
      return new Date(`${year}-${month}-${day}T00:00:00`);
    }

    // Handle YYYY-MM-DD format
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return new Date(`${dateStr}T00:00:00`);
    }

    // Handle M/D/YYYY or MM/DD/YYYY format (US date format)
    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateStr)) {
      const [month, day, year] = dateStr.split('/');
      const paddedMonth = month.padStart(2, '0');
      const paddedDay = day.padStart(2, '0');
      return new Date(`${year}-${paddedMonth}-${paddedDay}T00:00:00`);
    }

    // Handle ISO format with time component
    if (/^\d{4}-\d{2}-\d{2}T/.test(dateStr)) {
      const parsed = new Date(dateStr);
      return isNaN(parsed.getTime()) ? null : parsed;
    }

    // Handle other parseable formats (like "May 1, 2003", etc.)
    const parsed = new Date(dateStr);
    if (!isNaN(parsed.getTime())) {
      return parsed;
    }

    // If all else fails, log the format and return null
    console.warn('DateFilterModal - Unable to parse date:', dateStr);
    return null;
  } catch (error) {
    console.warn('DateFilterModal - Error parsing date:', experiment.date, error);
    return null;
  }
};

export function DateFilterModal({ experiments, isOpen, onClose, onApplyFilter, currentFilter }: DateFilterModalProps) {
  if (!isOpen) return null;
  // Determine optimal grouping based on date range span
  const getOptimalGrouping = (): 'day' | 'week' | 'month' => {
    if (experiments.length === 0) return 'day';

    const dates = experiments
      .map(exp => parseExperimentDateStatic(exp))
      .filter((d): d is Date => d !== null)
      .sort((a, b) => a.getTime() - b.getTime());

    if (dates.length === 0) return 'day';

    const daySpan = (dates[dates.length - 1].getTime() - dates[0].getTime()) / (1000 * 60 * 60 * 24);

    if (daySpan > 730) return 'month'; // More than 2 years, use months
    if (daySpan > 90) return 'week';
    return 'day';
  };

  const [groupBy, setGroupBy] = useState<'day' | 'week' | 'month'>(() => getOptimalGrouping());
  const [rangeSelection, setRangeSelection] = useState<{ start: number; end: number } | null>(null);
  const [isDragging, setIsDragging] = useState<'start' | 'end' | 'move' | 'create' | null>(null);
  const [dragStart, setDragStart] = useState<number>(0);
  const [tempSelection, setTempSelection] = useState<{ start: number; end: number } | null>(null);
  const chartRef = useRef<HTMLDivElement>(null);

  // Helper to parse experiment date
  const parseExperimentDate = (experiment: XnatExperiment): Date | null => {
    return parseExperimentDateStatic(experiment);
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

    // Parse all dates first to debug
    const parsedDates: Array<{ exp: XnatExperiment; date: Date | null }> = experiments.map(exp => ({
      exp,
      date: parseExperimentDate(exp)
    }));

    const validDates = parsedDates.filter(({ date }) => date !== null);
    console.log('DateFilterModal - Total experiments:', experiments.length);
    console.log('DateFilterModal - Valid parsed dates:', validDates.length);

    if (validDates.length === 0) {
      return [];
    }

    const dates = validDates.map(({ date }) => date!).sort((a, b) => a.getTime() - b.getTime());
    const firstDate = dates[0];
    const lastDate = dates[dates.length - 1];

    console.log('DateFilterModal - Date range:', {
      first: firstDate.toISOString().split('T')[0],
      last: lastDate.toISOString().split('T')[0],
      span: `${Math.round((lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24))} days`
    });

    // First, populate buckets with actual data
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

    // Now fill in gaps between first and last date
    const allKeys: string[] = [];
    const current = new Date(firstDate);

    while (current <= lastDate) {
      let key: string;
      switch (groupBy) {
        case 'week':
          key = getWeekKey(current);
          break;
        case 'month':
          key = getMonthKey(current);
          break;
        default:
          key = formatDateKey(current);
      }

      if (!allKeys.includes(key)) {
        allKeys.push(key);
        if (!buckets.has(key)) {
          buckets.set(key, []); // Empty bucket for gap
        }
      }

      // Increment date based on grouping
      if (groupBy === 'month') {
        current.setMonth(current.getMonth() + 1);
      } else if (groupBy === 'week') {
        current.setDate(current.getDate() + 7);
      } else {
        current.setDate(current.getDate() + 1);
      }
    }

    // Convert to array and sort
    const sorted = Array.from(buckets.entries())
      .sort((a, b) => a[0].localeCompare(b[0]));

    console.log('DateFilterModal - Total buckets created (with gaps):', sorted.length);
    console.log('DateFilterModal - First 5 buckets:', sorted.slice(0, 5).map(([date, exps]) => ({ date, count: exps.length })));
    console.log('DateFilterModal - Last 5 buckets:', sorted.slice(-5).map(([date, exps]) => ({ date, count: exps.length })));

    // Calculate positions for rendering
    const chartWidth = 100; // percentage
    const barWidth = chartWidth / Math.max(sorted.length, 1);

    const result: DateBucket[] = sorted.map(([date, exps], idx) => {
      let displayLabel = date;
      if (groupBy === 'week') {
        const [year, week] = date.split('-W');
        displayLabel = `W${week} '${year.substring(2)}`;
      } else if (groupBy === 'month') {
        const [year, month] = date.split('-');
        const monthDate = new Date(parseInt(year), parseInt(month) - 1);
        displayLabel = monthDate.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      } else {
        // For day grouping, include year when data spans multiple years
        const d = new Date(date);
        if (sorted.length > 0) {
          const firstDate = new Date(sorted[0][0]);
          const lastDate = new Date(sorted[sorted.length - 1][0]);
          const spansMultipleYears = firstDate.getFullYear() !== lastDate.getFullYear();

          if (spansMultipleYears) {
            displayLabel = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' });
          } else {
            displayLabel = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          }
        } else {
          displayLabel = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        }
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

    const filtered = allDateBuckets.filter((bucket) => {
      const bucketCenter = bucket.x + bucket.width / 2;

      // Check if bucket overlaps with selection range
      const overlaps = bucketCenter >= rangeSelection.start && bucketCenter <= rangeSelection.end;

      return overlaps;
    });

    return filtered;
  }, [allDateBuckets, rangeSelection]);

  const filteredExperiments = useMemo(() => {
    // When no selection, show all experiments
    if (!rangeSelection) return experiments;
    return filteredBuckets.flatMap(b => b.experiments);
  }, [filteredBuckets, rangeSelection, experiments]);

  // Initialize range selection from currentFilter when modal opens
  useEffect(() => {
    if (isOpen && currentFilter && allDateBuckets.length > 0) {
      const startIdx = allDateBuckets.findIndex(b => b.date >= currentFilter.start);
      const endIdx = allDateBuckets.findIndex(b => b.date > currentFilter.end);

      if (startIdx !== -1) {
        const start = allDateBuckets[startIdx].x;
        const end = endIdx !== -1
          ? allDateBuckets[endIdx].x
          : allDateBuckets[allDateBuckets.length - 1].x + allDateBuckets[allDateBuckets.length - 1].width;

        setRangeSelection({ start, end });
      }
    } else if (isOpen && !currentFilter) {
      setRangeSelection(null);
    }
  }, [isOpen, currentFilter, allDateBuckets]);

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
    e.stopPropagation();
    setIsDragging(type);

    if (type === 'move' && chartRef.current) {
      // For move, store the percentage position
      const rect = chartRef.current.getBoundingClientRect();
      const relativeX = ((e.clientX - rect.left) / rect.width) * 100;
      setDragStart(relativeX);
    } else {
      setDragStart(e.clientX);
    }
  };

  const handleChartMouseDown = (e: React.MouseEvent) => {
    if (!chartRef.current) return;

    const rect = chartRef.current.getBoundingClientRect();
    const relativeX = ((e.clientX - rect.left) / rect.width) * 100;
    const clampedX = Math.max(0, Math.min(100, relativeX));

    // Check if clicking on an existing handle or overlay
    if (rangeSelection) {
      const startHandleZone = Math.abs(relativeX - rangeSelection.start) < 2;
      const endHandleZone = Math.abs(relativeX - rangeSelection.end) < 2;
      const inSelectionZone = relativeX > rangeSelection.start && relativeX < rangeSelection.end;

      if (startHandleZone || endHandleZone || inSelectionZone) {
        return; // Let the handle/overlay handlers deal with it
      }
    }

    // Start creating new selection
    setIsDragging('create');
    setDragStart(clampedX);
    setTempSelection({ start: clampedX, end: clampedX });
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !chartRef.current) return;

    const rect = chartRef.current.getBoundingClientRect();
    const relativeX = ((e.clientX - rect.left) / rect.width) * 100;
    const clampedX = Math.max(0, Math.min(100, relativeX));

    if (isDragging === 'create') {
      // Update temp selection as user drags
      const newSelection = {
        start: Math.min(dragStart, clampedX),
        end: Math.max(dragStart, clampedX),
      };
      console.log('Creating selection:', newSelection);
      setTempSelection(newSelection);
    } else if (isDragging === 'start' && rangeSelection) {
      setRangeSelection(prev => prev ? {
        start: Math.min(clampedX, prev.end - 1),
        end: prev.end,
      } : null);
    } else if (isDragging === 'end' && rangeSelection) {
      setRangeSelection(prev => prev ? {
        start: prev.start,
        end: Math.max(clampedX, prev.start + 1),
      } : null);
    } else if (isDragging === 'move' && rangeSelection) {
      const delta = clampedX - dragStart;
      const width = rangeSelection.end - rangeSelection.start;
      const newStart = Math.max(0, Math.min(100 - width, rangeSelection.start + delta));

      setRangeSelection({
        start: newStart,
        end: newStart + width,
      });
      setDragStart(clampedX);
    }
  }, [isDragging, dragStart, rangeSelection]);

  const handleMouseUp = useCallback(() => {
    if (isDragging === 'create' && tempSelection) {
      // Finalize the new selection
      const width = tempSelection.end - tempSelection.start;
      console.log('Mouse up - temp selection:', tempSelection, 'width:', width);
      if (width > 0.5) { // Minimum selection width
        console.log('Setting range selection:', tempSelection);
        setRangeSelection(tempSelection);
      } else {
        console.log('Selection too small, ignoring');
      }
      setTempSelection(null);
    }
    setIsDragging(null);
  }, [isDragging, tempSelection]);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const clearSelection = () => {
    setRangeSelection(null);
  };

  const handleApplyFilter = () => {
    if (!rangeSelection || filteredBuckets.length === 0) {
      onApplyFilter(null);
    } else {
      // Get the actual date range from filtered buckets
      const firstBucket = filteredBuckets[0];
      const lastBucket = filteredBuckets[filteredBuckets.length - 1];

      // Convert dates to YYYY-MM-DD format (handle month/week formats)
      const formatToFullDate = (dateStr: string, isStart: boolean): string => {
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
          // Already in correct format
          return dateStr;
        } else if (/^\d{4}-\d{2}$/.test(dateStr)) {
          // Month format (YYYY-MM) - add day
          return isStart ? `${dateStr}-01` : `${dateStr}-${new Date(parseInt(dateStr.split('-')[0]), parseInt(dateStr.split('-')[1]), 0).getDate().toString().padStart(2, '0')}`;
        } else if (/^\d{4}-W\d{2}$/.test(dateStr)) {
          // Week format - convert to date
          const [year, week] = dateStr.split('-W');
          const jan1 = new Date(parseInt(year), 0, 1);
          const daysOffset = (parseInt(week) - 1) * 7 - jan1.getDay();
          const weekStart = new Date(parseInt(year), 0, 1 + daysOffset + (isStart ? 0 : 6));
          return weekStart.toISOString().split('T')[0];
        }
        return dateStr;
      };

      onApplyFilter({
        start: formatToFullDate(firstBucket.date, true),
        end: formatToFullDate(lastBucket.date, false),
      });
    }
    onClose();
  };

  const handleClearAndClose = () => {
    setRangeSelection(null);
    onApplyFilter(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center px-4 pt-4 pb-20 text-center sm:p-0">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-gray-900 bg-opacity-75 transition-opacity"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="relative inline-block w-full max-w-6xl transform overflow-hidden rounded-lg bg-white text-left align-middle shadow-xl transition-all">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
            <h2 className="text-lg font-semibold text-gray-900">Filter by Date Range</h2>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md p-1 hover:bg-gray-100"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-4">
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
            <button
              type="button"
              onClick={() => {
                if (allDateBuckets.length > 0) {
                  setRangeSelection({ start: 0, end: 100 });
                }
              }}
              className="px-3 py-1 text-sm rounded-md bg-blue-100 hover:bg-blue-200 text-blue-700 font-medium"
            >
              All
            </button>
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
              : `${allDateBuckets.length} ${groupBy === 'day' ? 'days' : groupBy === 'week' ? 'weeks' : 'months'} (${allDateBuckets.filter(b => b.count > 0).length} with data)`
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
              onMouseDown={handleChartMouseDown}
            >
              {/* Bars */}
              {allDateBuckets.map((bucket) => {
                const isEmpty = bucket.count === 0;
                const height = isEmpty ? 0 : (bucket.count / maxCount) * 100;
                const bucketCenter = bucket.x + bucket.width / 2;
                const isInRange = !rangeSelection || (
                  bucketCenter >= rangeSelection.start &&
                  bucketCenter <= rangeSelection.end
                );

                return (
                  <div
                    key={bucket.date}
                    className="absolute bottom-0 transition-all"
                    style={{
                      left: `${bucket.x}%`,
                      width: `${bucket.width}%`,
                      height: isEmpty ? '100%' : `${height}%`,
                      padding: '0 1px',
                    }}
                  >
                    <div
                      className={clsx(
                        'h-full rounded-t transition-colors',
                        isEmpty
                          ? 'bg-gray-100 border-b border-gray-200'
                          : isInRange ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-300'
                      )}
                      title={isEmpty ? `${bucket.displayLabel}: No data` : `${bucket.displayLabel}: ${bucket.count} experiment${bucket.count !== 1 ? 's' : ''}`}
                    />
                  </div>
                );
              })}

              {/* Temp Selection (while creating) */}
              {tempSelection && isDragging === 'create' && (
                <div
                  className="absolute top-0 bottom-0 bg-blue-300 bg-opacity-40 border-l-2 border-r-2 border-blue-600 border-dashed"
                  style={{
                    left: `${tempSelection.start}%`,
                    width: `${tempSelection.end - tempSelection.start}%`,
                  }}
                />
              )}

              {/* Range Selection Overlay */}
              {rangeSelection && !tempSelection && (
                <>
                  {/* Selected range highlight */}
                  <div
                    className="absolute top-0 bottom-0 bg-blue-200 bg-opacity-30 border-l-2 border-r-2 border-blue-500 cursor-move"
                    style={{
                      left: `${rangeSelection.start}%`,
                      width: `${rangeSelection.end - rangeSelection.start}%`,
                    }}
                    onMouseDown={(e) => handleMouseDown(e, 'move')}
                  />

                  {/* Start handle */}
                  <div
                    className="absolute top-0 bottom-0 w-2 bg-blue-600 cursor-ew-resize hover:bg-blue-700 z-10"
                    style={{ left: `${rangeSelection.start}%`, transform: 'translateX(-50%)' }}
                    onMouseDown={(e) => handleMouseDown(e, 'start')}
                  />

                  {/* End handle */}
                  <div
                    className="absolute top-0 bottom-0 w-2 bg-blue-600 cursor-ew-resize hover:bg-blue-700 z-10"
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

      {/* Summary */}
      <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-600">
        <div className="flex items-center justify-between">
          <span>
            Total: {experiments.length} experiment{experiments.length !== 1 ? 's' : ''}
          </span>
          {rangeSelection && (
            <span>
              Selected: {filteredExperiments.length} experiment{filteredExperiments.length !== 1 ? 's' : ''} ({filteredBuckets.length} {groupBy === 'day' ? 'days' : groupBy === 'week' ? 'weeks' : 'months'})
            </span>
          )}
        </div>
      </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-gray-200 px-6 py-4 bg-gray-50">
            <button
              type="button"
              onClick={handleClearAndClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
            >
              Clear Filter
            </button>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApplyFilter}
                disabled={!rangeSelection}
                className="px-4 py-2 text-sm font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Apply Filter
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
