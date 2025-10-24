import { useMemo, useState } from 'react';
import { Calendar as CalendarIcon, X, BarChart3 } from 'lucide-react';
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
}

export function CalendarView({ experiments, getSubjectId }: CalendarViewProps) {
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30); // Default 30 days
    return {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0],
    };
  });
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [groupBy, setGroupBy] = useState<'day' | 'week' | 'month'>('day');

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

  // Group experiments by date
  const dateBuckets = useMemo((): DateBucket[] => {
    const buckets = new Map<string, XnatExperiment[]>();

    experiments.forEach(exp => {
      const expDate = parseExperimentDate(exp);
      if (!expDate) return;

      // Check if within date range
      const dateKey = formatDateKey(expDate);
      if (dateKey < dateRange.start || dateKey > dateRange.end) return;

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
    const result: DateBucket[] = Array.from(buckets.entries())
      .map(([date, exps]) => {
        let displayLabel = date;
        if (groupBy === 'week') {
          const [year, week] = date.split('-W');
          displayLabel = `Week ${week}, ${year}`;
        } else if (groupBy === 'month') {
          const [year, month] = date.split('-');
          const monthDate = new Date(parseInt(year), parseInt(month) - 1);
          displayLabel = monthDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        } else {
          const d = new Date(date);
          displayLabel = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        }

        return {
          date,
          displayLabel,
          count: exps.length,
          experiments: exps,
        };
      })
      .sort((a, b) => a.date.localeCompare(b.date));

    return result;
  }, [experiments, dateRange, groupBy]);

  const maxCount = Math.max(...dateBuckets.map(b => b.count), 1);

  const handleQuickRange = (days: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);
    setDateRange({
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0],
    });
    setSelectedDate(null);
  };

  const selectedExperiments = selectedDate
    ? dateBuckets.find(b => b.date === selectedDate)?.experiments || []
    : [];

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="bg-white rounded-lg shadow-sm ring-1 ring-gray-900/5 p-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          {/* Date Range Inputs */}
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-gray-700">Date Range:</label>
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
              className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
            />
            <span className="text-gray-500">to</span>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
              className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
            />
          </div>

          {/* Quick Range Buttons */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Quick:</span>
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
          </div>

          {/* Group By */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Group by:</label>
            <select
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value as 'day' | 'week' | 'month')}
              className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
            >
              <option value="day">Day</option>
              <option value="week">Week</option>
              <option value="month">Month</option>
            </select>
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
            {dateBuckets.length} {groupBy === 'day' ? 'days' : groupBy === 'week' ? 'weeks' : 'months'} with data
          </div>
        </div>

        {dateBuckets.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <CalendarIcon className="mx-auto h-12 w-12 text-gray-400 mb-3" />
            <p>No experiments found in the selected date range</p>
          </div>
        ) : (
          <div className="space-y-2">
            {dateBuckets.map((bucket) => (
              <div key={bucket.date} className="flex items-center gap-3">
                <div className="w-24 text-sm text-gray-600 font-medium text-right flex-shrink-0">
                  {bucket.displayLabel}
                </div>
                <div className="flex-1 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedDate(selectedDate === bucket.date ? null : bucket.date)}
                    className={clsx(
                      'h-8 rounded transition-all hover:opacity-80',
                      selectedDate === bucket.date
                        ? 'bg-blue-700'
                        : 'bg-blue-600 hover:bg-blue-700'
                    )}
                    style={{
                      width: `${(bucket.count / maxCount) * 100}%`,
                      minWidth: '2rem',
                    }}
                    title={`${bucket.count} experiment${bucket.count !== 1 ? 's' : ''} - Click to view`}
                  />
                  <span className="text-sm font-semibold text-gray-900">
                    {bucket.count}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Selected Date Details */}
      {selectedDate && selectedExperiments.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm ring-1 ring-gray-900/5 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Experiments for {dateBuckets.find(b => b.date === selectedDate)?.displayLabel}
            </h3>
            <button
              type="button"
              onClick={() => setSelectedDate(null)}
              className="p-1 rounded-md hover:bg-gray-100"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>

          <div className="space-y-2">
            {selectedExperiments.map((experiment, idx) => {
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
                        {projectId} • {subjectId}
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
          <span>
            In range: {dateBuckets.reduce((sum, b) => sum + b.count, 0)} experiment{dateBuckets.reduce((sum, b) => sum + b.count, 0) !== 1 ? 's' : ''}
          </span>
        </div>
      </div>
    </div>
  );
}
