/**
 * ICS Calendar Export for PayPlan Pro
 * Generates .ics files that can be imported into any calendar app
 */

/**
 * Escape special characters for ICS format
 */
const escapeICS = (text) => {
  if (!text) return '';
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
};

/**
 * Parse a date string in either MMDDYYYY or YYYY-MM-DD format to a local Date
 */
const parseDateStr = (dateStr) => {
  if (!dateStr) return new Date();
  // MMDDYYYY format (8 digits, no dashes)
  if (/^\d{8}$/.test(dateStr)) {
    const mm = parseInt(dateStr.substring(0, 2), 10);
    const dd = parseInt(dateStr.substring(2, 4), 10);
    const yyyy = parseInt(dateStr.substring(4, 8), 10);
    return new Date(yyyy, mm - 1, dd);
  }
  // YYYY-MM-DD format
  return new Date(dateStr + 'T00:00:00');
};

/**
 * Format date for ICS (YYYYMMDD for all-day events)
 */
const formatICSDate = (dateStr) => {
  const date = parseDateStr(dateStr);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
};

/**
 * Format datetime for ICS (YYYYMMDDTHHmmssZ)
 */
const formatICSDateTime = (date) => {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
};

/**
 * Generate a unique ID for an event
 */
const generateUID = (bill, dueDate) => {
  const hash = `${bill.name}-${dueDate}`.split('').reduce((a, b) => {
    a = ((a << 5) - a) + b.charCodeAt(0);
    return a & a;
  }, 0);
  return `payplan-${Math.abs(hash)}-${Date.now()}@payplanpro.app`;
};

/**
 * Generate ICS content for bill instances
 */
export const generateICSContent = (billInstances, options = {}) => {
  const {
    calendarName = 'PayPlan Bills',
    includeReminders = true,
    reminderDays = [1, 3], // Days before due date
  } = options;

  const now = new Date();
  const timestamp = formatICSDateTime(now);

  // ICS header
  let ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//PayPlan Pro//Bill Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeICS(calendarName)}`,
    'X-WR-CALDESC:Bill due dates and payment reminders from PayPlan Pro',
  ];

  // Add each bill as an event
  billInstances.forEach((bill) => {
    const uid = generateUID(bill, bill.dueDate);
    const amount = (bill.actualPaid || bill.amountEstimate || bill.amount || 0).toFixed(2);
    const status = bill.paid ? 'PAID' : 'DUE';
    const statusEmoji = bill.paid ? '✅' : '💵';

    // Build description
    const descriptionParts = [
      `Amount: $${amount}`,
      `Category: ${bill.category || 'Other'}`,
      bill.autopay ? 'Auto-pay: Enabled' : '',
      `Status: ${status}`,
      '',
      'Exported from PayPlan Pro',
    ].filter(Boolean);

    const event = [
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${timestamp}`,
      `DTSTART;VALUE=DATE:${formatICSDate(bill.dueDate)}`,
      `DTEND;VALUE=DATE:${formatICSDate(bill.dueDate)}`,
      `SUMMARY:${statusEmoji} ${escapeICS(bill.name)} Due`,
      `DESCRIPTION:${escapeICS(descriptionParts.join('\\n'))}`,
      `CATEGORIES:${escapeICS(bill.category || 'Bills')}`,
      bill.paid ? 'STATUS:CONFIRMED' : 'STATUS:TENTATIVE',
      'TRANSP:TRANSPARENT', // Don't block time
    ];

    // Add reminders if not paid
    if (includeReminders && !bill.paid) {
      reminderDays.forEach((days) => {
        event.push(
          'BEGIN:VALARM',
          'ACTION:DISPLAY',
          `DESCRIPTION:${escapeICS(bill.name)} is due in ${days} day${days > 1 ? 's' : ''}!`,
          `TRIGGER:-P${days}D`, // X days before
          'END:VALARM'
        );
      });
    }

    event.push('END:VEVENT');
    ics = ics.concat(event);
  });

  // ICS footer
  ics.push('END:VCALENDAR');

  return ics.join('\r\n');
};

/**
 * Download ICS file
 */
export const downloadICSFile = (billInstances, options = {}) => {
  const {
    filename = 'payplan-bills.ics',
    ...icsOptions
  } = options;

  const content = generateICSContent(billInstances, icsOptions);
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  return {
    success: true,
    eventCount: billInstances.length,
  };
};

/**
 * Generate filename with date range
 */
export const generateFilename = (billInstances) => {
  if (!billInstances.length) return 'payplan-bills.ics';

  const dates = billInstances.map(b => b.dueDate).sort();
  const firstDate = dates[0];
  const lastDate = dates[dates.length - 1];

  // Format: payplan-bills-2024-01-to-2024-06.ics
  const formatMonth = (dateStr) => {
    const d = parseDateStr(dateStr);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  };

  return `payplan-bills-${formatMonth(firstDate)}-to-${formatMonth(lastDate)}.ics`;
};
