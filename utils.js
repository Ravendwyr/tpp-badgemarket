
function debug(f)
{
	function g()
	{
		try {
			return f(...arguments);
		} catch(e) {
			console.log(e.stack);
			alert("An unexpected error occurred.");
		}
	}
	
	return g;
}

function debug_async(f)
{
	async function g()
	{
		try {
			return await f(...arguments);
		} catch(e) {
			console.log(e.stack);
			alert("An unexpected error occurred.");
		}
	}
	
	return g;
}

function isString(v)
{
	return typeof v == "string";
}

function isNumber(v)
{
	return typeof v == "number";
}

function isArray(v)
{
	return Array.isArray(v);
}


class JSONStorage
{
	constructor()
	{
		this.dict = {};
	}
	
	get(key)
	{
		const json = this.dict[key];
		if (json === undefined) return undefined;
		
		try {
			return JSON.parse(json);
		} catch (e) {
			console.log("Failed to parse: " + json);
		}
	}
	
	set(key, value, store_locally)
	{
		value = JSON.stringify(value);
		
		this.dict[key] = value;
		
		if (store_locally === false) return;
		
		try {
			localStorage.setItem(key, value);
		} catch(e) {
			console.log("Failed to write to localStorage");
		}
	}
	
	load_from_local_storage()
	{
		try {
			for (let i = 0; i < localStorage.length; ++i) {
				const key = localStorage.key(i);
				this.dict[key] = localStorage.getItem(key);
			}
		} catch(e) {
			// TODO
			console.log("Failed to read localStorage");
		}
	}
}

const storage = new JSONStorage();
storage.load_from_local_storage();
