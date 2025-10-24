import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import type { XnatExperiment } from '../services/xnat-api';

interface CalendarViewProps {
  experiments: XnatExperiment[];
  getSubjectId: (experiment: any) => string;
}

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  experiments: XnatExperiment[];
}

export function CalendarView({ experiments, getSubjectId }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewType, setViewType] = useState<'month' | 'week'>('month');

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

  // Generate calendar days for month view
  const calendarDays = useMemo((): CalendarDay[] => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    // Get first day of month
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    // Get starting point (previous month days to show)
    const startingDayOfWeek = firstDay.getDay(); // 0 = Sunday
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - startingDayOfWeek);

    // Generate 42 days (6 weeks)
    const days: CalendarDay[] = [];
    const current = new Date(startDate);

    for (let i = 0; i < 42; i++) {
      const dayExperiments = experiments.filter(exp => {
        const expDate = parseExperimentDate(exp);
        if (!expDate) return false;

        return expDate.getFullYear() === current.getFullYear() &&
               expDate.getMonth() === current.getMonth() &&
               expDate.getDate() === current.getDate();
      });

      days.push({
        date: new Date(current),
        isCurrentMonth: current.getMonth() === month,
        experiments: dayExperiments,
      });

      current.setDate(current.getDate() + 1);
    }

    return days;
  }, [currentDate, experiments]);

  // Generate week days for week view
  const weekDays = useMemo((): CalendarDay[] => {
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());

    const days: CalendarDay[] = [];
    const current = new Date(startOfWeek);

    for (let i = 0; i < 7; i++) {
      const dayExperiments = experiments.filter(exp => {
        const expDate = parseExperimentDate(exp);
        if (!expDate) return false;

        return expDate.getFullYear() === current.getFullYear() &&
               expDate.getMonth() === current.getMonth() &&
               expDate.getDate() === current.getDate();
      });

      days.push({
        date: new Date(current),
        isCurrentMonth: true,
        experiments: dayExperiments,
      });

      current.setDate(current.getDate() + 1);
    }

    return days;
  }, [currentDate, experiments]);

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(newDate.getMonth() - 1);
      } else {
        newDate.setMonth(newDate.getMonth() + 1);
      }
      return newDate;
    });
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setDate(newDate.getDate() - 7);
      } else {
        newDate.setDate(newDate.getDate() + 7);
      }
      return newDate;
    });
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const formatMonthYear = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const formatWeekRange = (days: CalendarDay[]) => {
    if (days.length === 0) return '';
    const start = days[0].date;
    const end = days[days.length - 1].date;
    return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  };

  const daysToDisplay = viewType === 'month' ? calendarDays : weekDays;
  const navigate = viewType === 'month' ? navigateMonth : navigateWeek;

  return (
    <div className="bg-white rounded-lg shadow-sm ring-1 ring-gray-900/5">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold text-gray-900">
            {viewType === 'month' ? formatMonthYear(currentDate) : formatWeekRange(daysToDisplay)}
          </h2>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => navigate('prev')}
              className="p-1 rounded hover:bg-gray-100 text-gray-600"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={goToToday}
              className="px-3 py-1 text-sm font-medium rounded hover:bg-gray-100 text-gray-700"
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => navigate('next')}
              className="p-1 rounded hover:bg-gray-100 text-gray-600"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* View Toggle */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setViewType('month')}
            className={clsx(
              'px-3 py-1 text-sm font-medium rounded-md',
              viewType === 'month'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            )}
          >
            Month
          </button>
          <button
            type="button"
            onClick={() => setViewType('week')}
            className={clsx(
              'px-3 py-1 text-sm font-medium rounded-md',
              viewType === 'week'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            )}
          >
            Week
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="p-4">
        {/* Day Headers */}
        <div className={clsx(
          'grid gap-px mb-px',
          viewType === 'month' ? 'grid-cols-7' : 'grid-cols-7'
        )}>
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div
              key={day}
              className="bg-gray-50 px-2 py-2 text-center text-xs font-semibold text-gray-700 uppercase tracking-wide"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className={clsx(
          'grid gap-px bg-gray-200',
          viewType === 'month' ? 'grid-cols-7' : 'grid-cols-7'
        )}>
          {daysToDisplay.map((day, idx) => {
            const isToday = day.date.toDateString() === new Date().toDateString();

            return (
              <div
                key={idx}
                className={clsx(
                  'bg-white min-h-[120px] p-2',
                  !day.isCurrentMonth && 'bg-gray-50',
                  viewType === 'week' && 'min-h-[200px]'
                )}
              >
                {/* Date Header */}
                <div className="flex items-center justify-between mb-2">
                  <span className={clsx(
                    'text-sm font-medium',
                    isToday && 'bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center',
                    !isToday && day.isCurrentMonth && 'text-gray-900',
                    !isToday && !day.isCurrentMonth && 'text-gray-400'
                  )}>
                    {day.date.getDate()}
                  </span>
                  {day.experiments.length > 0 && (
                    <span className="text-xs font-medium text-blue-600">
                      {day.experiments.length}
                    </span>
                  )}
                </div>

                {/* Experiments for this day */}
                <div className="space-y-1">
                  {day.experiments.slice(0, viewType === 'week' ? 10 : 3).map((experiment, expIdx) => {
                    const subjectId = getSubjectId(experiment);
                    const projectId = experiment.project;

                    return (
                      <Link
                        key={expIdx}
                        to={`/projects/${projectId}/subjects/${subjectId}/experiments/${experiment.id || experiment.label}`}
                        className="block px-2 py-1 text-xs rounded bg-blue-50 hover:bg-blue-100 text-blue-900 truncate"
                        title={experiment.label || experiment.id}
                      >
                        <span className="font-medium">{experiment.modality || 'N/A'}</span>
                        <span className="text-blue-700 ml-1">
                          {experiment.label || experiment.id}
                        </span>
                      </Link>
                    );
                  })}

                  {day.experiments.length > (viewType === 'week' ? 10 : 3) && (
                    <div className="text-xs text-gray-500 px-2">
                      +{day.experiments.length - (viewType === 'week' ? 10 : 3)} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Summary */}
      <div className="border-t border-gray-200 px-6 py-3 bg-gray-50">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <CalendarIcon className="h-4 w-4" />
          <span>
            Showing {experiments.length} experiment{experiments.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>
    </div>
  );
}
