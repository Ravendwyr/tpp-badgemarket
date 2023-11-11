
const dom = new function()
{
	const self = this;
	
	function process_style(elem, styles)
	{
		const style = elem.style;
		for (const [key, value] of Object.entries(styles)) {
			style[key] = value;
		}
	}
	
	function process_argument(elem, arg)
	{
		if (isString(arg) || isNumber(arg)) {
			elem.appendChild(document.createTextNode(arg));
		} else if (arg instanceof Element) {
			elem.appendChild(arg);
		} else if (isArray(arg)) {
			for (let item of arg) {
				if (isString(item) || isNumber(item)) item = document.createTextNode(item);
				elem.appendChild(item);
			}
		} else {
			for (const [key, value] of Object.entries(arg)) {
				if (key == "style") {
					process_style(elem, value);
				} else {
					elem.setAttribute(key, value);
				}
			}
		}
	}
	
	this.elem = function(tag, arg, arg2)
	{
		const elem = document.createElement(tag);
		if (arg !== undefined) process_argument(elem, arg);
		if (arg2 !== undefined) process_argument(elem, arg2);
		return elem;
	}
	
	this.br = () => self.elem("br");
	this.div = (arg, arg2) => self.elem("div", arg, arg2);
	this.span = (arg, arg2) => self.elem("span", arg, arg2);
	this.button = (arg, arg2) => self.elem("button", arg, arg2);
	this.table = (arg, arg2) => self.elem("table", arg, arg2);
	this.tr = (arg, arg2) => self.elem("tr", arg, arg2);
	this.td = (arg, arg2) => self.elem("td", arg, arg2);
	this.th = (arg, arg2) => self.elem("th", arg, arg2);
	
	this.make_table = function(rows)
	{
		const table = self.elem("table");
		
		for (const row of rows) {
			const tr = self.tr();
			table.appendChild(tr);
			
			for (const cell of row) {
				const td = self.td();
				tr.appendChild(td);
				
				const elements = Array.isArray(cell) ? cell : [cell];
				
				for (let element of elements) {
					if (isString(element) || isNumber(element)) {
						element = document.createTextNode(element);
					}
					td.appendChild(element);
				}
			}
		}
		
		return table;
	}
	
	this.remove_children = function(element)
	{
		while (element.firstChild) element.removeChild(element.firstChild);
	}
}();
