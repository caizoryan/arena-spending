import { auth } from "./auth.js";
import { generate_year } from "./generate_year.js";
import { parseSpendItem } from "./utils.js";

let host = "http://localhost:3000/api/";
let year = generate_year(2025)

export const update_block = (block_id, body, slug, fuck = false) => {
  fetch(host + `blocks/${block_id}`, {
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + auth,
    },
    method: "PUT",
    body: JSON.stringify(body),
  }).then((res) => {
    if (fuck) { fuck_refresh(slug) }
    return res
  });
};

export const add_block = (slug, title, content) => {
	console.log("adding", title, "to", slug)
  fetch(host + "channels/" + slug + "/blocks", {
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + auth,
    },
    method: "POST",
    body: JSON.stringify({
      content: content,
    }),
  })
    .then((response) => response.json())
    .then((data) => {
      let block_id = data.id;
      // TODO: better way to do this
      if (title !== "") return update_block(block_id, { title: title }, slug);
      else return data
    });
};

// API functions
export const get_channel = async (slug) => {
	let force = true
  console.log("get channel called", slug);
  return await fetch(host + `channels/${slug}?per=500&${force ? "force=true" : "offline=true"}` /**&page=5**/, {
    headers: {
      // Authorization: `Bearer ${auth}`,
      // cache: "no-store",
      // "Cache-Control": "max-age=0, no-cache",
      // referrerPolicy: "no-referrer",
    },
  })
    .then((response) => response.json())
    .then((data) => {
      console.log("response", data)
      return data;
    });
};
let channel

get_channel("log-spending-archive").then((res) => {
	channel = res
	init()
})

export let isNode = (el) =>  el && el.nodeName && el.nodeType

/** @returns {HTMLElement} */
export let dom = (tag, ...contents) => {
	let el = "div"
	let classes = []
	let id = ""
	if (Array.isArray(tag) && contents.length == 0) return dom(...tag.concat(contents))

	let parseclass = ((str) => {
		let identifiers = str.split(/([\.#]?[^\s#.]+)/).map(e => e.trim()).filter(e => e!= "")

		if(!(/^\.|#/.test(identifiers[0]))) {
			el = identifiers[0]
			identifiers.shift()
		}

		identifiers.forEach(i => {
			if(i[0] == ".") classes.push(i.slice(1))
			if(i[0] == "#") id = i.slice(1)
		})
	})(tag)

	let doc = document.createElement(el)

	classes.forEach((c) => doc.classList.add(c))
	id ? doc.id = id : null

	contents.forEach((e) => {
		if (typeof e == 'string') doc.innerText += e
		else if (Array.isArray(e)) doc.appendChild(dom(...e))
		else if (isNode(e)) doc.appendChild(e)
		else if (typeof e == 'object') Object.entries(e).map(([k, v]) => doc[k] = v)
	})

	return doc
}

let is_in_month = (month, spend_item) => (spend_item.Date.getMonth() == month)
let is_in_year = (year, spend_item) => (spend_item.Date.getUTCFullYear() == year)

let year_blocks
let month_blocks
let items

export let months = [
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

let archive_slug = "log-spending-archive"

function archive_year(){
	let blocks = []
	let done = 0
	for(let i = 0; i < 12; i++){
		setTimeout(() => {
			change_month(i);
			if (month_blocks.length > 0) {
				let title = months[filters.month] + " " + filters.year
				let content = archive_month()
				blocks.push({title, content})
			}
			done+=1
			if (done == 12) post(blocks)
		}, 500)
	}
}

let post = (blocks) => {

	console.log("posting blocks", blocks)
	blocks.forEach((b) => {
		console.log("posting", b.title, "to", archive_slug)
	})

}

function init(){
	items = channel.contents
			.map(parseSpendItem)
			.flat()
			.filter(e => e!=undefined)
			.map(e => {e.Date = new Date(e.date);return e})

	render()
}

function change_month(month){
	filters.month = month
	render()
}

// if week is not set month view
// else week view
// same with tags
let filters = {
	year: 2025,
	month: 9,
	week: undefined,
	tag: undefined
}


let monthIncludesWeek = (month, week) => {
  let first = week[0]
  let last = week[week.length - 1]

  return first.month_number == month || last.month_number == month
}
let findDaysBlocks = (days, day) => days.filter((block) => {
  let title = block.date;
  let [d, m, y] = title.split(" ");
  return d == day.date && m == day.month && y == day.year;
});

function render(){
	// recalculate block filters
	year_blocks = items.filter(e => is_in_year(filters.year, e))
	month_blocks = year_blocks.filter(e => is_in_month(filters.month, e))
	let tags = year_blocks.map(e => e.tags)
			.flat()
			.map(e => e.trim())
			.reduce((acc, i) => {
				acc[i] ? acc[i] += 1 : acc[i] = 1
				return acc
			} , {})

	let top_tags = Object.entries(tags).filter(([k, v]) => v >= 5).map(([k, v]) => k)

	let m = "month: " + filters.month
	let y = "year: " + filters.year
	let selector = dom("select",
										 ["option", {value:""}, "NONE"],
										 ...top_tags.map(t => ["option", {value:t, selected: filters.tag == t},t]))
	let btns = dom(
		".navigator",
		 ["button", "prev", {onclick: () => change_month(filters.month-1)}],
		 ["button", "next", {onclick: () => change_month(filters.month+1)}],
		selector)
	selector.onchange= (e) => {
		filters.tag = e.target.value;
		filters.tag == "" ? filters.tag = undefined : null
		render()
	}

	display(top_bar, [btns, dom(["h4", m + " " + y])])

	// get month dates
	let months_weeks = year.filter(week => monthIncludesWeek(filters.month, week))
	let weekly = months_weeks.map((week) =>
			week.map((day) => {
				day.blocks = findDaysBlocks(year_blocks, day)
				return day
		}))

	let newblock = (date) => {
		let price = dom("input", {type: 'number'} )
		let place = dom("input" )
		let tags = dom("input" )

		let save = () => {
			let content = `${price.value}
${place.value}
[${tags.value}]`

			let title = date
			add_block('log-spending-archive', title, content)
		}

		let view = dom(
			".popup",
			{style: 'position: fixed; width: 300px;height: 300px; background: yellow; top: calc( (100vh - 600px) / 2); left: calc((100vw - 600px) / 2); '},
			["button", {onclick: () => view.remove()}, "x"],
			price, place, tags,
			["button", {onclick: save}, "save"]
		)
		document.body.appendChild(view)
	}

	let weekmouseenter = week => {week_total.innerText = 'week total: ' + week.reduce((a, day) => a+day.blocks.reduce((a, b) => a + parseFloat(b.price), 0), 0)}
	let weekmouseexit = _ => {week_total.innerText = 'month total: ' + month_blocks.reduce((a, b) => a + parseFloat(b.price), 0)}

	let week = week => dom(".week", {onmouseenter:() =>weekmouseenter(week), onmouseleave: weekmouseexit}, ...week.map(day))
	let day = day => [".day", 
										["p",day.date+""],
										["button", {onclick: () => newblock(day.date +" "+  day.month +" "+  day.year)}, "+"],
										...day.blocks
										.filter((b) => filters.tag ? b.tags.map(t => t.trim()).includes(filters.tag) : true)
										.map(item)
									 ]
	let item = item  =>
			[".item",
			 ["span.price", "(" +item.price+")" ],
			 ["span.title", item.title]
			]

	let month_blocks_view = weekly.map(week)
	display(main_view, month_blocks_view)
	let week_total =  dom(["h4", 'month total: ' + month_blocks.reduce((a, b) => a + parseFloat(b.price), 0)])
	display(bottom_bar, [week_total])
}

let archive_month = () => {
	let table = '| Date | Price | Title | Tags |'
	table +=  '\n|------|-------|-------|------|'
	table+= '\n' + (month_blocks.map(e => "| " + e.date + " | " + e.price + " | " + e.title + " | " + "["+ e.tags.map(t => t.trim("")).join(",")+ "] |").join("\n"))
	return table
	// let parsed = table.split('\n').filter(e => e!="").map(e => e.split('|').filter(e => e!="").map(e => e.trim()))
	// console.log(parsed)
}

function display(parent, el){
	parent.innerHTML = ''
	if (Array.isArray(el)) el.forEach(e => parent.appendChild(e))
	else parent.appendChild(el)
}

let top_bar = dom(['.top-bar', ["h4", "top-bar"]])
let main_view = dom(['.main-view', ["h4", "main"]])
let bottom_bar = dom(['.bottom-bar', ["h4", "bottom"]])

let root = dom(
	".root",
	top_bar,
	main_view,
	bottom_bar
)
// make 
document.body.appendChild(root)
