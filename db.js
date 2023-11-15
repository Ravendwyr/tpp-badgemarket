
const db = new function()
{
	class Badge
	{
		constructor(static_item, index)
		{
			const bid = static_item[0];
			const name = static_item[1];
			
			this.index = index;
			this.gen = infer_generation(bid);
			this.bid = bid;
			this.name = name;
			this.bid_name = "#" + "0".repeat(Math.max(3 - bid.length, 0)) + bid + " " + name;
			this.icon_data_url = static_item[2];
			this.count = null;
			this.owned_by = {};
			this.buy_offers = null;
			this.sell_offers = null;
		}
	}
	
	function infer_generation(bid)
	{
		if (bid.includes("-")) return bid.split("-")[1];
		num = Number(bid);
		if (num <= 151) return 1;
		if (num <= 251) return 2;
		if (num <= 386) return 3;
		if (num <= 493) return 4;
		if (num <= 649) return 5;
		if (num <= 721) return 6;
		if (num <= 809) return 7;
		if (num <= 905) return 8;
		if (num <= 1018) return 9;
		return "misc";
	}
	
	function read_static_data()
	{
		for (let i = 0; i < static_data.length; ++i) {
			const badge = new Badge(static_data[i], i);
			badges.push(badge);
			badges_by_bid[badge.bid] = badge;
		}
	}
	
	// Fetch from cache if available, otherwise refresh
	const CACHE_OR_REFRESH = 0;
	// Always refresh
	const REFRESH = 1;
	// Fetch from cache if available, otherwise don't retrieve
	const CACHE_ONLY = 2;
	
	class Query
	{
		constructor(use_local_storage)
		{
			this.use_local_storage = use_local_storage === false ? false : true;
		}
		
		async get(mode)
		{
			mode = mode || CACHE_OR_REFRESH;
			
			const key = this.get_storage_key();
			
			// Fetch from catch unless forced refresh
			if (mode != REFRESH) {
				const item = storage.get(key);
				if (item !== undefined) return item;
				// If no cache hit and CACHE_ONLY mode, return nothing
				if (mode == CACHE_ONLY) return null;
			}
			
			// Otherwise refresh from the API
			const timestamp = (new Date()).toLocaleString();
			const data = await this.run_query();
			if (data === null) return null;
			
			const result = {
				data: data,
				timestamp: timestamp,
			};
			
			// TODO: Catch exception if this doesn't work
			storage.set(key, result, this.use_local_storage);
			return result;
		}
		
// 		get_timestamp()
// 		{
// 			const key = this.get_storage_key();
// 			return localStorage.getItem("_timestamp_" + key);
// 		}
		
		async refresh(mode)
		{
			const result = await this.get(mode, this.use_local_storage);
			if (result === null) return null;
			
			this.update(result);
			return result;
		}
		
		refresh_from_cache()
		{
			const result = storage.get(this.get_storage_key(), this.use_local_storage);
			if (result === undefined) return null;
			this.update(result);
			return result;
		}
	}
	
	class CountsQuery extends Query
	{
		update(result)
		{
			update_badge_counts(result.data);
		}
		
		get_storage_key()
		{
			return "api_badge_counts";
		}
		
		async run_query()
		{
			return await tppapi.get_badge_species();
		}
	}
	
	class BuyOffersQuery extends Query
	{
		update(result)
		{
			update_badge_buy_offers(result.data);
		}
		
		get_storage_key()
		{
			return "api_buy_offers";
		}
		
		async run_query()
		{
			return await tppapi.get_badges_buying();
		}
	}
	
	class SellOffersQuery extends Query
	{
		update(result)
		{
			update_badge_sell_offers(result.data);
		}
		
		get_storage_key()
		{
			return "api_sell_offers";
		}
		
		async run_query()
		{
			return await tppapi.get_badges_selling();
		}
	}
	
	class BadgeByIdQuery extends Query
	{
		constructor(bid, use_local_storage)
		{
			super(use_local_storage);
			this.bid = bid;
		}
		
		update(result)
		{
		}
		
		get_storage_key()
		{
			return "api_badge_by_id_" + this.bid;
		}
		
		async run_query()
		{
			return await tppapi.get_badges_by_id(this.bid);
		}
	}
	
	class OwnedByUserQuery extends Query
	{
		constructor(user_id, use_local_storage)
		{
			super(use_local_storage);
			this.user_id = user_id;
		}
		
		update(result)
		{
			update_badge_owned(result.data, this.user_id);
		}
		
		get_storage_key()
		{
			return "api_owned_by_user_" + this.user_id;
		}
		
		async run_query()
		{
			return await tppapi.get_badges_owned_by(this.user_id);
		}
	}
	
	function update_badge_counts(data)
	{
		for (const item of data) {
			const badge = badges_by_bid[item.id];
			// TODO: Badge missing from static data
			if (badge === undefined) continue;
			badge.count = item.count;
		}
	}
	
	function update_badge_owned(data, user_id)
	{
		for (const badge of badges) {
			badge.owned_by[user_id] = [];
		}
		
		for (const item of data) {
			const badge = badges_by_bid[item.species];
			// TODO: Badge missing from static data
			if (badge === undefined) continue;
			badge.owned_by[user_id].push(item);
		}
	}
	
	function update_badge_buy_offers(data)
	{
		for (const badge of badges) {
			badge.buy_offers = [];
		}
		
		for (const item of data) {
			const badge = badges_by_bid[item.species];
			// TODO: Badge missing from static data
			if (badge === undefined) continue;
			badge.buy_offers.push(item);
		}
		
		// Sort buy offers by priority (highest price, oldest creation date)
		for (const badge of badges) {
			badge.buy_offers.sort((a, b) => {
				if (a.price > b.price) return -1;
				if (a.price < b.price) return 1;
				if (a.created_at < b.created_at) return -1;
				if (a.created_at > b.created_at) return 1;
				return 0;
			});
		}
	}
	
	function update_badge_sell_offers(data)
	{
		for (const badge of badges) {
			badge.sell_offers = [];
		}
		
		for (const item of data) {
			const badge = badges_by_bid[item.species];
			// TODO: Badge missing from static data
			badge.sell_offers.push(item);
			item.price = item.sell_price;
		}
		
		// Sort sell offers by priority (lowest price, oldest creation date)
		for (const badge of badges) {
			badge.sell_offers.sort((a, b) => {
				if (a.price < b.price) return -1;
				if (a.price > b.price) return 1;
				if (a.created_at < b.created_at) return -1;
				if (a.created_at > b.created_at) return 1;
				return 0;
			});
		}
	}
	
	function update_user_cache(user_id, username)
	{
		user_name_by_id[user_id] = username;
		user_id_by_name[username.toLowerCase()] = user_id;
		storage.set("api_users", user_name_by_id);
	}
	
	async function get_user_name(user_id)
	{
		// Return from cache if it exists
		const cached_value = user_name_by_id[user_id];
		if (cached_value) return cached_value;
		
		// Otherwise query user from the API
		const user = await tppapi.get_users(user_id);
		if (user === null) return null;
		
		// Update cache and return
		update_user_cache(user_id, user.name);
		return user.name;
	}
	
	async function get_user_id(username)
	{
		// Return from cache if it exists
		username_lower = username.toLowerCase();
		const cached_value = user_id_by_name[username_lower];
		if (cached_value) return cached_value;
		
		// Otherwise query from the API
		const user_id = await tppapi.get_username_to_id(username_lower);
		if (user_id === null) return null;
		
		// Reverse query to update the cache and return
		const username_api = await get_user_name(user_id);
		if (username_api === null) {
			console.log("Name lookup failed after successful ID lookup.")
			return null;
		}
		
		return user_id;
	}
	
	function get_user_id_cached(username)
	{
		username = username.toLowerCase();
		
		const cached_value = user_id_by_name[username];
		if (cached_value) return cached_value;
		return null;
	}
	
	function get_user_name_cached(user_id)
	{
		const cached_value = user_name_by_id[user_id];
		if (cached_value) return cached_value;
		return null;
	}
	
	const badges = [];
	const badges_by_bid = {};
	const user_name_by_id = storage.get("api_users") || {};
	const user_id_by_name = Object.fromEntries(
		Object.entries(user_name_by_id)
		.map(a => [a[1].toLowerCase(), a[0]])
	);
	
	this.badges = badges;
	this.get_user_id = get_user_id;
	this.get_user_name = get_user_name;
	this.get_user_id_cached = get_user_id_cached;
	this.get_user_name_cached = get_user_name_cached;
	
	this.CACHE_OR_REFRESH = CACHE_OR_REFRESH;
	this.REFRESH = REFRESH;
	this.CACHE_ONLY = CACHE_ONLY;
	
	this.CountsQuery = CountsQuery;
	this.BuyOffersQuery = BuyOffersQuery;
	this.SellOffersQuery = SellOffersQuery;
	this.BadgeByIdQuery = BadgeByIdQuery;
	this.OwnedByUserQuery = OwnedByUserQuery;
	
	read_static_data();
}();
