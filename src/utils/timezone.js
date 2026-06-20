import { format } from 'date-fns';

/**
 * Formats a Date object or string as a YYYY-MM-DDTHH:mm string in America/New_York local time
 */
export const toNewYorkDatetimeString = (dateOrStr) => {
  if (!dateOrStr) return '';
  const date = new Date(dateOrStr);
  if (isNaN(date.getTime())) return '';
  
  const nyDate = new Date(date.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  const yyyy = nyDate.getFullYear();
  const mm = String(nyDate.getMonth() + 1).padStart(2, '0');
  const dd = String(nyDate.getDate()).padStart(2, '0');
  const hh = String(nyDate.getHours()).padStart(2, '0');
  const min = String(nyDate.getMinutes()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
};

/**
 * Formats a Date object or string as a YYYY-MM-DD string in America/New_York local time
 */
export const toNewYorkDateString = (dateOrStr) => {
  if (!dateOrStr) return '';
  const date = new Date(dateOrStr);
  if (isNaN(date.getTime())) return '';
  
  const nyDate = new Date(date.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  const yyyy = nyDate.getFullYear();
  const mm = String(nyDate.getMonth() + 1).padStart(2, '0');
  const dd = String(nyDate.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

/**
 * Parses a YYYY-MM-DDTHH:mm string assumed to represent America/New_York local time into a UTC Date object
 */
export const parseNewYorkDatetimeToDate = (str) => {
  if (!str) return null;
  const [datePart, timePart] = str.split('T');
  if (!datePart || !timePart) return new Date(str);
  const [year, month, day] = datePart.split('-').map(Number);
  const [hour, minute] = timePart.split(':').map(Number);
  
  const tempDate = new Date(Date.UTC(year, month - 1, day, hour, minute));
  
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: 'numeric', minute: '2-digit', second: '2-digit',
    hour12: false
  });
  
  const parts = formatter.formatToParts(tempDate);
  const partMap = {};
  parts.forEach(p => { partMap[p.type] = p.value; });
  
  let nyHour = Number(partMap.hour);
  if (nyHour === 24) nyHour = 0;
  
  const nyMs = Date.UTC(
    Number(partMap.year),
    Number(partMap.month) - 1,
    Number(partMap.day),
    nyHour,
    Number(partMap.minute),
    Number(partMap.second)
  );
  
  const utcMs = tempDate.getTime();
  const offset = utcMs - nyMs;
  
  return new Date(Date.UTC(year, month - 1, day, hour, minute) + offset);
};

/**
 * Formats a UTC Date object or string into a formatted date string using America/New_York local time fields
 */
export const formatInNewYork = (dateOrStr, formatStr) => {
  if (!dateOrStr) return '—';
  const date = new Date(dateOrStr);
  if (isNaN(date.getTime())) return '—';
  
  const nyDate = new Date(date.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  return format(nyDate, formatStr);
};
