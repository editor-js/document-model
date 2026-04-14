(function(){try{if(typeof document<`u`){var e=document.createElement(`style`);e.appendChild(document.createTextNode(`.editorjs-header{white-space:pre-wrap;outline:none;min-height:1em;margin:0}
/*$vite$:1*/`)),document.head.appendChild(e)}}catch(e){console.error(`vite-plugin-css-injected-by-js`,e)}})();import { ToolType as e } from "@editorjs/sdk";
var t = { header: "editorjs-header" }, n = class n {
	static type = e.Block;
	static name = "header";
	static #e = 1;
	static #t = 6;
	#n;
	#r;
	#i;
	constructor({ adapter: e, data: t, config: n }) {
		this.#n = e, this.#r = t, this.#i = n ?? {};
	}
	#a(e) {
		let t = this.#i.defaultLevel ?? 2, r = this.#i.levels, i = typeof e == "number" && Number.isInteger(e) && e >= n.#e && e <= n.#t ? e : null;
		return i !== null && (r === void 0 || r.includes(i)) ? i : r !== void 0 && !r.includes(t) ? r[0] ?? 2 : t;
	}
	get #o() {
		return this.#a(this.#r.level ?? this.#i.defaultLevel);
	}
	render() {
		let e = `h${this.#o}`, n = document.createElement(e);
		return n.classList.add(t.header), n.contentEditable = "true", this.#n.attachInput("text", n), n;
	}
};
//#endregion
export { n as Header };

//# sourceMappingURL=header.js.map