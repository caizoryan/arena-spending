
/**
* @typedef {Object} Day
*  @property {number} day
*  @property {string} day_name
*  @property {number} date
*  @property {string} month
*  @property {number} month_number
*  @property {number} year
*  @property {Array} blocks
*
* @typedef {Array<Day>} Weeks
*
* @param {number} year
* @returns {Array<Weeks>} Weeks
*/
export function generate_year(year) {
  let months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  let week_day = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];

  let weeks = [];
  let week = [];

  // loop over the 12 months
  for (let i = 0; i < 12; i++) {
    let month_name = months[i];
    let month_days = new Date(year, i + 1, 0).getDate();
    if (i === 11) {
      console.log(month_days);
    }

    // loop over the days of the month
    for (let j = 1; j <= month_days; j++) {
      let day = new Date(year, i, j);
      let day_week = day.getDay();
      let day_name = week_day[day_week];
      let day_month = day.getMonth();

      // for each day, create an object with the day, month, year, and journal content
      week.push({
        day: day_week,
        day_name: day_name,
        date: j,
        month: month_name,
        month_number: day_month,
        year: year,
        blocks: [],
      });

      // if the day is a Saturday (last day according to javascript),
      // push the week to the weeks array and reset the week
      // or if it's 31sth December
      if (day_week === 6 || (i === 11 && j === month_days)) {
        weeks.push(week);
        week = [];
      }
    }
  }

  return weeks;
}
