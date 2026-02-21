export const currentTime = {
  format: (date) => {
    const hours = currentTime.formatHours(date.getHours());
    const minutes = date.getMinutes();
    return `${hours}:${currentTime.formatSegment(minutes)}`;
  },
  formatHours: (hours) => (hours % 12 === 0 ? 12 : hours % 12),
  formatSegment: (segment) => (segment < 10 ? `0${segment}` : segment),
};