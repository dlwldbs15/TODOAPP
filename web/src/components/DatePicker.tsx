interface DatePickerProps {
  selectedDate: string
  onDateChange: (date: string) => void
}

export function DatePicker({ selectedDate, onDateChange }: DatePickerProps) {
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const formatDate = (date: Date) => date.toISOString().split('T')[0]
  const formatDisplay = (dateStr: string) => {
    const date = new Date(dateStr)
    const month = date.getMonth() + 1
    const day = date.getDate()
    const weekday = ['일', '월', '화', '수', '목', '금', '토'][date.getDay()]
    return `${month}/${day} (${weekday})`
  }

  const isToday = selectedDate === formatDate(today)
  const isYesterday = selectedDate === formatDate(yesterday)
  const isTomorrow = selectedDate === formatDate(tomorrow)

  const quickDates = [
    { label: '어제', date: formatDate(yesterday), active: isYesterday },
    { label: '오늘', date: formatDate(today), active: isToday },
    { label: '내일', date: formatDate(tomorrow), active: isTomorrow },
  ]

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        {quickDates.map(({ label, date, active }) => (
          <button
            key={date}
            onClick={() => onDateChange(date)}
            className={`px-3 py-1 rounded-full text-sm transition-colors
              ${active
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
          >
            {label}
          </button>
        ))}
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => onDateChange(e.target.value)}
          className="ml-auto px-3 py-1 rounded-lg border border-gray-300 dark:border-gray-600
            bg-white dark:bg-gray-700
            focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div className="text-lg font-medium">
        {formatDisplay(selectedDate)}
        {isToday && <span className="ml-2 text-sm text-blue-500">오늘</span>}
      </div>
    </div>
  )
}
