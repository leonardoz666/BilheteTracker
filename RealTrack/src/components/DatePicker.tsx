import { useState, useRef } from 'react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, getYear, getMonth, setYear, setMonth } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface DatePickerProps {
  value: string; // YYYY-MM-DD format
  onChange: (value: string) => void;
  onClose?: () => void;
  alignLeft?: boolean; // Se true, alinha à esquerda (para filtros)
}

export default function DatePicker({ value, onChange, onClose, alignLeft = false }: DatePickerProps) {
  const [currentMonth, setCurrentMonth] = useState(() => value ? new Date(value) : new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(() => value ? new Date(value) : null);
  const pickerRef = useRef<HTMLDivElement>(null);

  // Gerar dias do calendário
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const weekDays = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  // Navegação
  const goToPreviousMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  const goToNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  const handleDateSelect = (day: Date) => {
    setSelectedDate(day);
    const formattedDate = format(day, 'yyyy-MM-dd');
    onChange(formattedDate);
  };

  const handleToday = () => {
    const today = new Date();
    setSelectedDate(today);
    setCurrentMonth(today);
    onChange(format(today, 'yyyy-MM-dd'));
  };

  const handleClear = () => {
    setSelectedDate(null);
    onChange('');
  };

  const handleOK = () => {
    if (onClose) {
      onClose();
    }
  };

  const handleCancel = () => {
    if (onClose) {
      onClose();
    }
  };

  // Gerar anos para o seletor
  const currentYear = getYear(currentMonth);
  const years = Array.from({ length: 20 }, (_, i) => currentYear - 10 + i);

  const handleYearSelect = (year: number) => {
    setCurrentMonth(setYear(currentMonth, year));
  };

  const handleMonthSelect = (monthIndex: number) => {
    setCurrentMonth(setMonth(currentMonth, monthIndex));
  };

  // Formatar data selecionada
  const formatDatePT = (date: Date) => {
    const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const months = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
    const dayName = days[date.getDay()];
    const day = String(date.getDate());
    const month = months[date.getMonth()];
    return `${dayName}, ${day} de ${month}`;
  };

  const formattedSelectedDate = selectedDate
    ? formatDatePT(selectedDate)
    : 'Selecione uma data';

  const containerPositionClasses = alignLeft
    ? 'right-full top-1/2 mr-2 -translate-y-1/2 transform'
    : 'left-0 top-full mt-2';

  return (
    <div
      ref={pickerRef}
      className={`absolute z-[1000] flex w-[360px] max-w-[90vw] overflow-hidden rounded-xl border border-skin-border bg-skin-surface text-skin-text shadow-[0_20px_60px_rgba(0,0,0,0.2)] ${containerPositionClasses}`}
      onClick={(e) => {
        e.stopPropagation();
      }}
    >
      {/* Seção Esquerda - Data Selecionada */}
      <div className="flex w-[130px] flex-col justify-between bg-gradient-to-b from-bank-light/40 to-transparent p-3">
        <div>
          <div className="text-[0.6rem] font-semibold uppercase tracking-[0.5px] text-skin-muted">Selecione a data</div>
          <div className="text-base font-bold leading-tight text-skin-text">{formattedSelectedDate}</div>
        </div>
      </div>

      {/* Seção Direita - Calendário */}
      <div className="flex flex-1 flex-col bg-skin-surface p-3">
        {/* Header do Calendário */}
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <select
              value={getMonth(currentMonth)}
              onChange={(e) => {
                handleMonthSelect(Number(e.target.value));
              }}
              className="rounded-md border border-transparent bg-transparent px-1 text-sm font-semibold text-skin-text outline-none transition hover:border-skin-border"
            >
              {monthNames.map((month, index) => (
                <option key={month} value={index}>
                  {month}
                </option>
              ))}
            </select>
            <div className="relative">
              <select
                value={currentYear}
                onChange={(e) => {
                  handleYearSelect(Number(e.target.value));
                }}
                className="appearance-none rounded-md border border-transparent bg-transparent px-3 py-0.5 text-sm font-semibold text-skin-text outline-none transition hover:border-skin-border"
              >
                {years.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
              <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[0.6rem] text-skin-muted">▼</span>
            </div>
          </div>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={goToPreviousMonth}
              className="rounded-md p-1 text-skin-muted transition hover:bg-bank-light/40"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              onClick={goToNextMonth}
              className="rounded-md p-1 text-skin-muted transition hover:bg-bank-light/40"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* Dias da Semana */}
        <div className="mb-1 grid grid-cols-7 gap-1">
          {weekDays.map((day) => (
            <div key={day} className="py-1 text-center text-[0.6rem] font-semibold uppercase tracking-[0.3px] text-skin-muted">
              {day}
            </div>
          ))}
        </div>

        {/* Grid de Dias */}
        <div className="mb-2 grid flex-1 grid-cols-7 gap-1">
          {days.map((day) => {
            const isCurrentMonth = isSameMonth(day, currentMonth);
            const isSelected = selectedDate && isSameDay(day, selectedDate);
            const isToday = isSameDay(day, new Date());
            const dayClasses = [
              'h-9 rounded-md text-[0.75rem] transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-emerald',
              isSelected
                ? 'bg-bank text-white font-semibold shadow-[0_0_0_1px_rgba(255,255,255,0.1)]'
                : isToday
                ? 'bg-bank-light text-skin-text font-semibold'
                : isCurrentMonth
                ? 'text-skin-text hover:bg-bank-light/60'
                : 'text-skin-muted',
            ].join(' ');

            return (
              <button
                key={format(day, 'yyyy-MM-dd')}
                type="button"
                onClick={() => {
                  handleDateSelect(day);
                }}
                className={dayClasses}
              >
                {format(day, 'd')}
              </button>
            );
          })}
        </div>

        {/* Botões Footer */}
        <div className="mt-auto flex items-center justify-between border-t border-skin-border/60 pt-2">
          <button
            type="button"
            onClick={handleClear}
            className="rounded-md px-2 py-1 text-[0.7rem] font-semibold text-brand-emerald transition hover:text-brand-hover"
          >
            Limpar
          </button>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={handleToday}
              className="rounded-md px-2 py-1 text-[0.7rem] font-semibold text-brand-emerald transition hover:text-brand-hover"
            >
              Hoje
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="rounded-md px-3 py-1 text-[0.7rem] font-semibold text-brand-emerald transition hover:text-brand-hover"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleOK}
              className="rounded-md bg-bank px-3 py-1 text-[0.7rem] font-semibold text-white shadow-bank transition hover:bg-bank-dark hover:shadow-bank-strong"
            >
              OK
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

