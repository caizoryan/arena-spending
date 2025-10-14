import { sig, mem, mut } from "./solid_monke/solid_monke.js";
import { generate_year } from "./generate_year.js";

// 8 is September
let current_month = sig(1)
let current_week = sig(40)

let data = mut({ channel: {}, year: generate_year(2025), filters: [] });
let week = mem(() => data.year[current_week()]);

let monthIncludesWeek = (month, week) => {
  let first = week[0]
  let last = week[week.length - 1]

  return first.month_number == month || last.month_number == month
}

let contents = mem(() => {
  let og = data.channel?.contents ? [...data.channel?.contents] : []
  let filtered = data.filters.reduce((acc, f) => acc.filter(f.filter), og)
  return filtered
});

let findDaysBlocks = (day) => contents().filter((block) => {
  let title = block.title;
  let [d, m, y] = title.split(" ");
  return d == day.date && m == day.month && y == day.year;
});

let nextWeek = () =>
  data.year.length > current_week() + 1
    ? current_week.set(current_week() + 1)
    : current_week.set(0)

let prevWeek = () =>
  current_week() > 0
    ? current_week.set(current_week() - 1)
    : current_week.set(data.year.length - 1)

let nextMonth = () =>
  current_month() < 11
    ? current_month.set(current_month() + 1)
    : current_month.set(0)

let prevMonth = () =>
  current_month() > 0
    ? current_month.set(current_month() - 1)
    : current_month.set(11)

let applyFilter = (filter) => {
  data.filters.push(filter)
}

let clearFilters = () => {
  data.filters = []
}

let removeFilter = (filter) => {
  data.filters = data.filters.filter((f) => f.name != filter.name)
}


export default {
  // navigation
  nextWeek,
  prevWeek,
  nextMonth,
  prevMonth,

  // data 
  contents,
  findDaysBlocks,
  data,

  // data by cal
  month,
  week,

  // filters
  current_week,
  applyFilter,
  clearFilters,
  removeFilter
}
