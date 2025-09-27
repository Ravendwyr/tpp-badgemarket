
class User
{
	constructor(attrs)
	{
		this.enabled = false;
		this.owned_range = "";
		this.owned_min = "";
		this.owned_max = "";
		this.style = [];
		
		for (const [key, value] of Object.entries(attrs)) {
			this[key] = value;
		}
	}
	
	apply_style(elem)
	{
		for (const mod of this.style) {
			if (mod == "b") {
				elem.style.fontWeight = "bold";
			} else if (mod == "i") {
				elem.style.fontStyle = "italic";
			} else if (mod == "u") {
				elem.style.textDecoration = "underline";
			} else {
				elem.style.color = mod;
			}
		}
	}
}

function get_enabled_users()
{
	return users.filter(u => u.enabled);
}

function get_user_badges_query(user)
{
	return {
		caption: user.username,
		get_query: () => new db.OwnedByUserQuery(user.user_id, false),
	};
}

function get_api_queries()
{
	const api_queries = [
		{
			caption: "Counts",
			get_query: () => new db.CountsQuery(),
		},
		{
			caption: "Buy offers",
			get_query: () => new db.BuyOffersQuery(),
		},
		{
			caption: "Sell offers",
			get_query: () => new db.SellOffersQuery(),
		},
	];
	
	for (const user of get_enabled_users()) {
		api_queries.push(get_user_badges_query(user));
	}
	
	return api_queries;
}

function build_query_form()
{
	function disable_buttons()
	{
		for (const button of table.getElementsByTagName("button")) {
			button.disabled = true;
		}
	}
	
	function enable_buttons()
	{
		for (const button of table.getElementsByTagName("button")) {
			button.disabled = false;
		}
	}
	
	const table = dom.make_table([
		["", "", "Last refreshed"],
	]);
	
	const queries = get_api_queries();
	
	for (const query of queries) {
		const button = dom.button("Refresh");
		
		const result = query.get_query().refresh_from_cache();
		const span_status = dom.span(result ? result.timestamp : "--");
		
		const tr = dom.tr([
			dom.td(query.caption),
			dom.td(button),
			dom.td(span_status),
		]);
		table.appendChild(tr);
		
		query.run = async function()
		{
			span_status.innerText = "Fetching...";
			
			const result = await query.get_query().refresh(db.REFRESH);
			
			if (result === null) {
				span_status.innerText = "Failed. Try Again.";
			} else {
				span_status.innerText = result.timestamp;
			}
		}
		
		button.onclick = debug_async(async () => {
			disable_buttons();
			await query.run();
			rebuild_table();
			enable_buttons();
		});
	}
	
	async function refresh_all()
	{
		disable_buttons();
		for (const query of queries) {
			await query.run();
		}
		rebuild_table();
		enable_buttons();
	}
	
	const button_refresh_all = dom.button("Refresh all");
	button_refresh_all.onclick = debug_async(refresh_all);
	
	table.appendChild(dom.tr([dom.td(), button_refresh_all]));
	
	return table;
}

function update_query_form()
{
	dom.remove_children(form.query_form_container);
	form.query_form_container.appendChild(build_query_form());
}

function filter_badge(badge)
{
	for (const user of get_enabled_users()) {
		const owned = badge.owned_by[user.user_id];
		if (owned !== undefined) {
			if (user.owned_min !== "" && owned.length < user.owned_min) return false;
			if (user.owned_max !== "" && owned.length > user.owned_max) return false;
		}
	}
	
	if (!form.generation_form[badge.gen].data_checked) return false;
	
	return true;
}

function create_toggle(label, checked, on_changed)
{
	const toggle = dom.button(label);
	toggle.data_checked = checked;
	
	function change_style()
	{
		if (toggle.data_checked) {
			toggle.classList.add("toggle-checked");
			toggle.classList.remove("toggle-unchecked");
		} else {
			toggle.classList.add("toggle-unchecked");
			toggle.classList.remove("toggle-checked");
		}
	}
	
	change_style();
	toggle.onclick = debug(() => {
		toggle.data_checked = !toggle.data_checked;
		change_style();
		on_changed();
	});
	
	toggle.set_value = value => {
		toggle.data_checked = value;
		change_style();
	};
	
	return toggle;
}

function add_tooltip(container, contents)
{
	const tooltip = dom.span(contents, { class: "tooltiptext" });
	container.append(tooltip);
	container.classList.add("tooltip");
	return container;
}

function build_user_form()
{
	const table = dom.table();
	if (users.length == 0) return table;
	
	table.appendChild(dom.tr([
		dom.td(),
		dom.td(),
		dom.td(
			add_tooltip(
				dom.span("Style"),
				"Style of buy and sell offers. Can be any combination of b, i, u, and a CSS color code, separated by spaces.",
			)
		),
		dom.td(
			add_tooltip(
				dom.span("Owned"),
				"Filter by number of badges owned. Enter a single number or a range n-m. Either n or m may be omitted for a one-sided range.",
			)
		),
		dom.td("Delete"),
	]));
	
	for (const user of users) {
		const td_username = dom.td(user.username);
		user.apply_style(td_username);
		
		const checkbox_enabled = dom.elem("input", { type: "checkbox" });
		checkbox_enabled.classList.add("user-checkbox");
		checkbox_enabled.checked = user.enabled;
		checkbox_enabled.onchange = debug(() => {
			user.enabled = checkbox_enabled.checked;
			if (user.enabled) get_user_badges_query(user).get_query().refresh_from_cache();
			users_updated();
		});
		
		const input_owned_range = dom.elem("input", { size: 2, value: user.owned_range });
		input_owned_range.onchange = debug(() => {
			user.owned_range = input_owned_range.value;
			if (user.owned_range.includes("-")) {
				const minmax = user.owned_range.split("-", 2);
				user.owned_min = minmax[0];
				user.owned_max = minmax[1];
			} else {
				user.owned_min = user.owned_range;
				user.owned_max = user.owned_range;
			}
			users_updated();
		});
		
		const button_delete = dom.button("×");
		button_delete.classList.add("user-button");
		button_delete.onclick = debug(() => {
			if (confirm("Delete " + user.username + "?")) {
				users.splice(users.indexOf(user), 1);
				users_updated();
			}
		});
		
		const input_style = dom.elem("input", { size: 5, value: user.style.join(" ") });
		input_style.onchange = debug(() => {
			user.style = input_style.value.split(" ").filter(v => v != "").map(v => v.toLowerCase());
			input_style.value = user.style.join(" ");
			users_updated();
		});
		
		table.appendChild(dom.tr([
			dom.td(checkbox_enabled),
			td_username,
			dom.td(input_style),
			dom.td(input_owned_range),
			dom.td(button_delete),
		]));
	}
	
	return table;
}

function build_add_user_form()
{
	const input_add_user = dom.elem("input", { size: 12, placeholder: "TPP chat name" });
	const button_add_user = dom.button("Add chatter");
	
	button_add_user.onclick = debug_async(async () => {
		const username = input_add_user.value.trim();
		if (!username) {
			alert("Enter a username");
			return;
		}
		
		if (users.some(u => u.username.toLowerCase() == username.toLowerCase())) {
			alert("This user has already been added.");
			return;
		}
		
		button_add_user.disabled = true;
		const user_id = await db.get_user_id(username);
		button_add_user.disabled = false;
		if (user_id === null) {
			alert("User \"" + username + "\" not found in the TPP API. Make sure that the username is spelled correctly.");
			return;
		}
		
		const user = new User({
			username: db.get_user_name_cached(user_id),
			user_id: user_id,
			enabled: true,
		});
		
		if (users.length == 0) user.style = ["b"];
		
		users.push(user);
		get_user_badges_query(user).get_query().refresh_from_cache();
		users_updated();
		input_add_user.value = "";
	});
	
	return dom.div([
		input_add_user,
		dom.span(" "),
		button_add_user,
	]);
}

function users_updated()
{
	storage.set("users", users);
	update_user_form();
	update_query_form();
	rebuild_table();
}

function update_user_form()
{
	dom.remove_children(form.user_form_container);
	form.user_form_container.appendChild(build_user_form());
}

function build_form()
{
	const container = dom.div();
	container.style.maxWidth = "max-content";
	container.style.margin = "auto";
	
	const td_queries_header = dom.td(
		add_tooltip(
			dom.span("Badge API"),
			"Click Refresh to fetch badge data from the API. The data will appear in the table below. Add chatters to fetch badges owned by a chatter."
		),
	);
	td_queries_header.classList.add("header");
	
	const td_users_header = dom.td(
		add_tooltip(
			dom.span("User List"),
			"Enter a TPP chat name to add a chatter. You can fetch badges owned by a chatter, which will appear as a field in the table below."
		),
	);
	td_users_header.classList.add("header");
	
	const td_filter_header = dom.td(
		add_tooltip(
			dom.span("Badge Table"),
			"Toggle the buttons to filter badges by generation/game. Click on a field header to sort badges by that field. Reclick to reverse the order."
		),
		{ colspan: 2 },
	);
	td_filter_header.classList.add("header");
	
	const td_queries = dom.td();
	
	const user_form_container = dom.td();
	
	const td_users = dom.td([
		build_add_user_form(),
		user_form_container,
	]);
	
	const input_max_offers = dom.elem("input", { size: 2, value: "5" });
	input_max_offers.onchange = debug(() => rebuild_table());
	
	const checkbox_owned_list = create_toggle(
		"List owned badges",
		false,
		() => rebuild_table(),
	);
	
	const button_dark_mode = create_toggle(
		"Dark mode",
		false,
		() => document.documentElement.classList.toggle("dark"),
	);
	
	const td_settings = dom.td([
		input_max_offers,
		"# of buy/sell offers shown",
		checkbox_owned_list,
		button_dark_mode,
	], { colspan: 2 });
	
	const td_filter = dom.td({ colspan: 2 });
	const generation_form = {};
	
	const gen_groups = [
		[1, 2, 3, 4, 5, 6, 7, 8, 9],
		["misc", "sirius", "vega", "blazing", "spaceworld", "xgremix", "star", "snakewood", "kep"],
	];
	
	for (const group of gen_groups) {
		for (const gen of group) {
			generation_form[gen] = create_toggle(gen, true, () => rebuild_table(true));
		}
		
		const button_all = dom.button("All");
		button_all.onclick = debug(() => {
			for (const gen of group) {
				generation_form[gen].set_value(true);
			}
			rebuild_table(true);
		});
		td_filter.appendChild(button_all);
		
		const button_none = dom.button("None");
		button_none.onclick = debug(() => {
			for (const gen of group) {
				generation_form[gen].set_value(false);
			}
			rebuild_table(true);
		});
		td_filter.appendChild(button_none);
		
		for (const gen of group) {
			td_filter.appendChild(generation_form[gen]);
		}
		td_filter.appendChild(dom.br());
	}
	
	container.appendChild(
		dom.table(
			[
				dom.tr([td_queries_header, td_users_header]),
				dom.tr([td_queries, td_users]),
				dom.tr([td_filter_header]),
				dom.tr([td_settings]),
				dom.tr([td_filter]),
			],
			{
				style: {
					borderSpacing: "10px",
				},
			},
		)
	);
	
	const form = {
		container: container,
		query_form_container: td_queries,
		generation_form: generation_form,
		user_form_container: user_form_container,
		input_max_offers: input_max_offers,
		checkbox_owned_list: checkbox_owned_list,
	};
	
	return form;
}

const table_fields_by_user_id = {};

function get_table_user_table_field(user)
{
	let field = table_fields_by_user_id[user.user_id];
	if (!field) {
		field = table_field_builder_owned(user);
		table_fields_by_user_id[user.user_id] = field;
	}
	return field;
}

function get_table_fields()
{
	const table_fields = [
		table_field_generation,
		table_field_icon,
		table_field_name,
		table_field_count,
	];
	
	for (const user of get_enabled_users()) {
		table_fields.push(get_table_user_table_field(user));
	}
	
	table_fields.push(table_field_buy_offers);
	table_fields.push(table_field_sell_offers);
	
	return table_fields;
}

function build_table_tr(badge, fields)
{
	const tr = dom.tr();
	
	for (const field of fields) {
		tr.appendChild(field.get_td(badge));
	}
	
	return tr;
}

function build_table_header(fields)
{
	const header = dom.tr();
	
	for (const field of fields) {
		const th = dom.elem("th", field.caption);
		th.style.cursor = "pointer";
		th.onclick = debug(() => {
			if (sorters[0].field == field) {
				sorters[0].ascending = !sorters[0].ascending;
			} else {
				const without_dupes = sorters.filter(s => s.field != field);
				sorters.length = 0;
				sorters.push({
					field: field,
					ascending: true,
				});
				sorters.push(...without_dupes);
			}
			rebuild_table(true);
		});
		header.appendChild(th);
	}
	
	return header;
}

function rebuild_table(keep_trs)
{
	const fields = get_table_fields();
	
	// Rebuild table rows unless we're keeping old ones
	if (!keep_trs) {
		for (const badge of db.badges) {
			badge.tr = build_table_tr(badge, fields);
		}
	}
	
	const table = dom.table();
	table.style.borderSpacing = "3px 0";
	
	table.appendChild(build_table_header(fields));
	
	function multisorter(a, b)
	{
		// Apply sorters in order until one of them returns a non-zero
		for (const sorter of sorters) {
			let sign = sorter.field.sorter(a, b);
			if (!sorter.ascending) sign = -sign;
			if (sign != 0) return sign;
		}
		
		// TODO
		throw "This should not happen";
	}
	
	const index = [];
	for (const badge of db.badges) {
		if (filter_badge(badge)) index.push(badge);
	}
	
	index.sort(multisorter);
	
	// Add table rows from the index
	for (let i = 0; i < index.length; ++i) {
		const badge = index[i];
		badge.tr.className = i % 2 ? "row-odd" : "row-even";
		table.appendChild(badge.tr);
	}
	
	// Remove previous table and add the new one
	dom.remove_children(table_container);
	table_container.appendChild(table);
}

function refresh_from_cache()
{
	for (const query of get_api_queries()) {
		query.get_query().refresh_from_cache();
	}
}

const sorters = [{
	field: table_field_name,
	ascending: true,
}];

const users = (storage.get("users") || []).map(u => new User(u));

const form = build_form();
document.body.appendChild(form.container);
update_user_form();
update_query_form();

const table_container = dom.div();
document.body.appendChild(table_container);

refresh_from_cache();
rebuild_table();
