const timestamp = () => {
  const currentDate = new Date(); // Get current date and time
  const day = currentDate.getDate().toString().padStart(2, "0"); // Get day with leading zero if needed
  const month = (currentDate.getMonth() + 1).toString().padStart(2, "0"); // Get month with leading zero if needed
  const year = currentDate.getFullYear(); // Get full year
  const hours = currentDate.getHours().toString().padStart(2, "0"); // Get hours with leading zero if needed
  const minutes = currentDate.getMinutes().toString().padStart(2, "0"); // Get minutes with leading zero if needed
  const seconds = currentDate.getSeconds().toString().padStart(2, "0"); // Get seconds with leading zero if needed
  const ampm = currentDate.getHours() >= 12 ? "PM" : "AM"; // Determine if it's AM or PM

  return `${day}-${month}-${year}_${hours}:${minutes}:${seconds}${ampm}`;
};

module.exports = timestamp;
