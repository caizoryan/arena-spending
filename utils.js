
// ******************************
// UTILS
// ******************************
//

import { months } from "./script.js";

/**
 * Finds the blocks of a specific day
 * @param {Object} day
 * @returns {Array} blocks
 * */
let find_blocks = (day, blocks) => blocks
  ?.filter((block) => {
    let title = block.title;
    let [d, m, y] = title.split(" ");
    return d == day.date && m == day.month && y == day.year;
  });

/**
 * @typedef {Object} SpendItem
 * @property {string} price
 * @property {string} title
 * @property {string} tags
 * @property {string} date
 *
 * @param {Object} block
 * @returns {SpendItem | SpendItem[]}
 */
let parseSpendItem = (block) => {
	if (months.includes(block.title.split(" ")[0].trim())){
		// parse as table
		let parsed = block.content
				.split('\n')
				.filter(e => e!="")
		// ["date", "price", "place", "tags"]
				.map(e => e.split('|').filter(e => e!="").map(e => e.trim()))
				.map(e => {
					// validate by checking if [0] is date
					// validate by checking if [1] is number
					// validate by checking if [3] includes []

					if (new Date(e[0]).toString() != "Invalid Date"
							&& !isNaN(parseFloat(e[1]))
							&& e[3].includes('[')
							&& e[3].includes(']')
						 ){
						return {date: e[0], price: e[1], title: e[2], tags: e[3].replace('[', '').replace(']', '').split(','), Date: new Date(e[0])}
					}
					else return undefined
				})
				.filter(e => e!=undefined)

		return parsed
	}
  let earnings = false
  let [price, title, tags] = block.content.split(`\n`);
  if (!tags || !price || !title) return undefined

  title = title
		.trim()
		//.split("(")[0]

  tags = tags.replace("[", "").replace("]", "")
  tags = tags.split(", ").filter((tag) => tag != "" && tag != " ");
	let date = block.title.trim()

  if (price.charAt(0) == "+") earnings = true
	if (earnings){
		price *= -1
		console.log(price)
	}
  return { price, title, tags, earnings, date }
}

function ignoreEarnings(str) {
  return str.charAt(0) == "+" ? "0" : str
}

/**
 * @param {string} str
 */
function subtractEarnings(str) {
  return str.charAt(0) == "+" ? str.replace("+", "-") : str
}

/**
 * Takes blocks with spend item text structure and returns the total of them
 *
 * @param {Array} items
 * @returns {number} total
 **/
let totalSpentDay = (items) => {
  if (!items || items.length == 0) return 0

  let spent = items
    ?.reduce(
      (acc, item) => acc + parseFloat(subtractEarnings(parseSpendItem(item).price)), 0)

  return parseFloat(spent.toFixed(2))
}

let tagFilter = (block, tag) => parseSpendItem(block)?.tags.includes(tag)
let createTagFilter = (tag) => (block) => tagFilter(block, tag)


/**
 * @param {Array<string>} tass
 * @returns {Function} Filter
 **/
let createOrTagFilter = (tags) => (block) => {
  let item = parseSpendItem(block)
  let includes = false

  tags.forEach((tag) => {
    if (item?.tags.includes(tag)) includes = true
  })
  return includes
}

let createNotOrTagFilter = (tags) => (block) => {
  let item = parseSpendItem(block)
  let includes = true

  tags.forEach((tag) => {
    if (item?.tags.includes(tag)) includes = false
  })
  return includes
}


const totalSpentWeek = (week, contents) => {
  return week.reduce((acc, day) => acc += totalSpentDay(find_blocks(day, contents)), 0).toFixed(2)
}


export { find_blocks, parseSpendItem, totalSpentDay, totalSpentWeek, createTagFilter, createOrTagFilter, createNotOrTagFilter }
