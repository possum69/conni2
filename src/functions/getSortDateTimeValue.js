function getSortDateTimeValue(item) {
  const date = item.date || '0000-00-00';
  const time = item.start || '00:00';
  const normalizedDate = date.split('.').reverse().join('-');
  const [hour = '00', minute = '00'] = time.split(':');
  return `${normalizedDate}T${hour.padStart(2, '0')}:${minute.padStart(2, '0')}:00`;
}
