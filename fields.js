
const no_data_text = "––";

const table_field_generation = {
	caption: "Gen",
	get_td: badge => {
		const td = dom.td(isNumber(badge.gen) ? "G" + badge.gen : badge.gen);
		td.style.textAlign = "center";
		return td;
	},
	sorter: (a, b) => {
		const cmp = isNumber(b.gen) - isNumber(a.gen);
		if (cmp != 0) return cmp;
		if (a.gen < b.gen) return -1;
		if (a.gen > b.gen) return 1;
		return 0;
	}
};

const table_field_icon = {
	caption: "",
	get_td: badge => {
		const td = dom.td();
		td.style.width = "0px";
		td.style.textAlign = "center";
		
		if (badge.icon_data_url !== null) {
			const icon = document.createElement("img");
			icon.src = badge.icon_data_url;
			icon.style.margin = "-4px 0px -4px 0px";
			td.appendChild(icon);
		}
		
		return td;
	},
};

const table_field_name = {
	caption: "Name",
	get_td: badge => {
		return dom.td(badge.bid_name);
	},
	sorter: (a, b) => {
		if (a.index < b.index) return -1;
		return 1;
	}
};

const table_field_count = {
	caption: "Count",
	get_td: badge => {
		const td = dom.td(badge.count !== null ? badge.count : no_data_text);
		td.style.textAlign = "right";
		td.style.paddingLeft = "3px";
		td.style.paddingRight = "3px";
		return td;
	},
	sorter: (a, b) => {
		if (a.count === null) return 0;
		if (a.count < b.count) return -1;
		if (a.count > b.count) return 1;
		return 0;
	}
};

const table_field_builder_owned = user => {
	const user_id = user.user_id;
	return {
		caption: user.username,
		get_td: badge => {
			const owned = badge.owned_by[user_id];
			const td = dom.td();
			td.style.textAlign = "right";
			td.style.paddingRight = "3px";
			
			function show_count() {
				td.innerHTML = "";
				td.innerText = owned.length > 0 ? owned.length : "";
				td.data_list = false;
			}
			
			function show_list() {
				const table = dom.table();
				table.style.width = "100%";
				
				for (const badge of owned) {
					const tr = dom.tr([
						dom.td(
							badge.created_at.split(" ")[0],
							{ style: { width: "6em", textAlign: "left" } }
						),
						dom.td(
							badge.source.substr(0, 3),
							{ style: { width: "2.5em", textAlign: "left" } }
						),
					]);
					table.appendChild(tr);
				}
				
				td.innerHTML = "";
				td.appendChild(table);
				td.data_list = true;
			}
			
			if (owned) {
				if (form.checkbox_owned_list.checked) {
					show_list();
				} else {
					show_count();
				}
				if (owned.length > 0) {
					td.style.cursor = "pointer";
					td.onclick = debug(() => {
						if (td.data_list) {
							show_count();
						} else {
							show_list();
						}
					});
				}
			} else {
				td.innerText = no_data_text;
			}
			
			return td;
		},
		sorter: (a, b) => {
			if (a.owned_by[user_id] === undefined) return 0;
			if (a.owned_by[user_id].length < b.owned_by[user_id].length) return -1;
			if (a.owned_by[user_id].length > b.owned_by[user_id].length) return 1;
			return 0;
		},
	};
};

function add_join_offers(container, badge, offers, buy)
{
	for (const offer of offers) {
		const span = dom.span(offer.price);
		
		if (buy) {
			span.style.marginLeft = "6px";
		} else {
			span.style.marginRight = "6px";
		}
		
		// TODO: Optimize
		for (const user of users) {
			if (offer.user != user.user_id) continue;
			
			user.apply_style(span);
			break;
		}
		
		container.appendChild(span);
	}
}

const table_field_buy_offers = {
	caption: "Buy offers",
	get_td: badge => {
		const td = dom.td();
		td.style.textAlign = "right";
		td.style.paddingRight = "12px";
		
		if (badge.buy_offers === null) {
			td.innerText = no_data_text;
			return td;
		}
		
		const offers = [];
		
		for (const offer of badge.buy_offers) {
			for (let i = 0; i < offer.amount; ++i) {
				offers.push(offer);
				if (offers.length >= form.input_max_offers.value) break;
			}
			if (offers.length >= form.input_max_offers.value) break;
		}
		
		offers.reverse();
		
		add_join_offers(td, badge, offers, true);
		
		return td;
	},
	sorter: (a, b) => {
		if (a.buy_offers === null) return 0;
		const a_offer = a.buy_offers.length ? a.buy_offers[0].price : 0;
		const b_offer = b.buy_offers.length ? b.buy_offers[0].price : 0;
		if (a_offer < b_offer) return -1;
		if (a_offer > b_offer) return 1;
		return 0;
	}
};

const table_field_sell_offers = {
	caption: "Sell offers",
	get_td: badge => {
		const td = dom.td();
		td.style.paddingLeft = "12px";
		
		if (badge.sell_offers === null) {
			td.innerText = no_data_text;
			return td;
		}
		
		const offers = [];
		
		for (const offer of badge.sell_offers) {
			offers.push(offer);
			if (offers.length >= form.input_max_offers.value) break;
		}
		
		add_join_offers(td, badge, offers, false);
		
		return td;
	},
	sorter: (a, b) => {
		if (a.sell_offers === null) return 0;
		const a_offer = a.sell_offers.length ? a.sell_offers[0].price : 0;
		const b_offer = b.sell_offers.length ? b.sell_offers[0].price : 0;
		if (a_offer < b_offer) return -1;
		if (a_offer > b_offer) return 1;
		return 0;
	}
};
