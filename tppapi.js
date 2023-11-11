
const tppapi = new function()
{
	const API_URL = "https://twitchplayspokemon.tv/api/";
	
	
	async function make_request(method, url_str, query_params)
	{
		query_params = query_params || {};
		
		const url = new URL(url_str);
		url.search = new URLSearchParams(query_params).toString();
		
		const options = {
			method: method,
			referrer: "",
			referrerPolicy: "no-referrer",
		};
		
		console.log(url);
		console.log(options);
		
		let response;
		
		try {
			response = await fetch(url, options);
		} catch (e) {
			console.log(e);
			return null;
		}
		
		console.log(response);
		return response;
	}
	
	async function tpp_request(method, path, query_params)
	{
		return await make_request(method, API_URL + path, query_params);
	}
	
	async function browse_pagination(path, query_params)
	{
		// Create a cursor for browsing all data
		query_params = query_params || {};
		query_params.sort = "id";
		query_params.limit = "1000";
		query_params.create_cursor = "true";
		
		const response = await tpp_request("GET", path, query_params);
		if (response === null || !response.ok) return null;
		
		// Get the cursor token
		const token = await response.json();
		console.log(token);
		
		// Browse the cursor and collect all data
		const data = [];
		
		// TODO: Arbitrarily limiting to 100 requests, should never happen
		for (let i = 0; i < 100; ++i) {
			const cursor_response = await tpp_request(
				"POST",
				"cursor/" + token,
				{limit: "1000"},
			);
			
			// Something went wrong
			if (cursor_response === null) return null;
			
			// If end of cursor, return all queried data
			if (cursor_response.status == 410) return data;
			
			// If some other error code, return nothing (data probably incomplete)
			if (!cursor_response.ok) return null;
			
			// Otherwise we got more data, add it to the array
			data.push(...await cursor_response.json());
		}
		
		throw "Too many requests";
	}
	
	async function get_badge_species()
	{
		const response = await tpp_request("GET", "badge_species");
		return (response !== null && response.ok) ? await response.json() : null;
	}
	
	async function get_badges_buying()
	{
		return await browse_pagination("badges/buying");
	}
	
	async function get_badges_selling()
	{
		return await browse_pagination("badges/selling");
	}
	
	async function get_badges_owned_by(user_id)
	{
		return browse_pagination(
			"badges",
			{"filter:user": user_id},
		);
	}
	
	async function get_badges_by_id(bid)
	{
		return browse_pagination(
			"badges",
			{"filter:species": bid},
		);
	}
	
	async function get_username_to_id(username)
	{
		const response = await tpp_request("GET", "username_to_id/" + username);
		return (response !== null && response.ok) ? await response.json() : null;
	}
	
	async function get_users(user_id)
	{
		const response = await tpp_request("GET", "users/" + user_id);
		return (response !== null && response.ok) ? await response.json() : null;
	}
	
	
	this.get_badge_species = get_badge_species;
	this.get_badges_buying = get_badges_buying;
	this.get_badges_selling = get_badges_selling;
	this.get_badges_by_id = get_badges_by_id;
	this.get_badges_owned_by = get_badges_owned_by;
	this.get_username_to_id = get_username_to_id;
	this.get_users = get_users;
}();
