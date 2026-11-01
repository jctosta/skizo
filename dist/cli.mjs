#!/usr/bin/env node
import { mkdirSync, readFileSync, watch, writeFileSync } from "node:fs";
import { basename, dirname, join, relative, resolve } from "node:path";
import { parseArgs } from "node:util";
import { createServer } from "node:http";
// ../core/src/parse.ts
const SLOTS = ["actions", "footer"];
const STRING = /"((?:[^"\\]|\\.)*)"/y;
const WORD = /([^\s="]+)(=?)/y;
const BARE = /[^\s"]*/y;
const FLAG = /^[a-z][a-z0-9-]*$/;
/**
* Line-based parser for the Skizo line grammar (the Syntax section of packages/cli/GUIDE.md). Builds the AST and reports syntax errors.
* Prop values stay raw strings (`\,` kept for list splitting); the validator coerces them.
* `\,` is a literal comma everywhere: in Labels here, in string and list props in the validator.
*/
function parse(source) {
	const errors = [];
	/** Lines whose tokens could not all be read; validating them would only repeat the same mistake. */
	const garbled = /* @__PURE__ */ new Set();
	const screens = [];
	/** stack[n] is the frame that receives lines at indent level n. */
	const stack = [{ into: screens }];
	source.split("\n").forEach((raw, i) => {
		const line = i + 1;
		const content = raw.trim();
		if (!content || content.startsWith("//")) return;
		const paragraph = content.startsWith("\"");
		const kind = paragraph ? "Text" : content.startsWith("|") ? "Table" : content.match(/^[^\s"]*/)[0];
		const err = (message) => errors.push({
			line,
			type: kind,
			message
		});
		const ws = raw.slice(0, raw.length - raw.trimStart().length);
		let indent = ws.length;
		if (ws.includes("	")) {
			err("tab in indentation (indent with 2 spaces)");
			indent = ws.replaceAll("	", "  ").length;
		} else if (indent % 2) err(`indent of ${indent} spaces is not a multiple of 2`);
		let level = Math.floor(indent / 2);
		if (level >= stack.length) {
			err("more than one level deeper than its parent (indent 2 spaces per level)");
			level = stack.length - 1;
		}
		stack.length = level + 1;
		const parent = stack[level];
		if (content.startsWith("|")) {
			if (parent.node?.type === "Table") {
				(parent.node.rows ??= []).push(cells(content));
				(parent.node.rowLines ??= []).push(line);
			} else err("row line outside a Table");
			stack.push({ into: null });
		} else if (SLOTS.includes(content)) {
			const name = content;
			if (parent.node) stack.push({ into: (parent.node.slots ??= {})[name] ??= [] });
			else {
				err(`slot word "${name}" goes directly under an Element`);
				stack.push({ into: [] });
			}
		} else {
			const node = {
				type: kind,
				props: {},
				children: [],
				line
			};
			tokenize(paragraph ? content : content.slice(kind.length), node, (message) => {
				err(message);
				garbled.add(line);
			});
			if (paragraph && Object.keys(node.props).length) err("a bare string line takes no flags or props (write Text \"...\" with them instead)");
			if (parent.into) parent.into.push(node);
			else err("row lines take no children");
			stack.push({
				node,
				into: node.children
			});
		}
	});
	return {
		document: { screens },
		errors,
		garbled
	};
}
/** Reads the Label, flags and props of one line into `node`. Stops at the first unreadable string. */
function tokenize(rest, node, err) {
	let i = 0;
	const read = (re) => {
		re.lastIndex = i;
		const m = re.exec(rest);
		if (m) i = re.lastIndex;
		return m;
	};
	const string = () => {
		const m = read(STRING);
		if (!m) err("unterminated string (missing closing \")");
		return m?.[1].replace(/\\(["\\])/g, "$1");
	};
	while (i < rest.length) if (rest[i] === " ") i++;
	else if (rest[i] === "\"") {
		const s = string();
		if (s === void 0) return;
		if (node.label === void 0) node.label = s.replaceAll("\\,", ",");
		else err(`second bare string "${s}" (an Element has one Label)`);
	} else {
		const m = read(WORD);
		const key = m?.[1] ?? rest.slice(i).split(" ")[0];
		if (!m) i += key.length;
		if (key.startsWith("//")) {
			err("unexpected \"//\" (comments go on their own line)");
			return;
		}
		let value = true;
		if (m?.[2]) {
			const s = rest[i] === "\"" ? string() : read(BARE)[0];
			if (s === void 0) return;
			if (s === "") err(`${key}= has no value`);
			value = s;
		}
		if (!FLAG.test(key)) err(`unexpected "${key}" (Labels are quoted, flags are lowercase words, props are key=value)`);
		else if (key in node.props) err(`duplicate "${key}"`);
		else node.props[key] = value;
	}
}
/** `| a | b |` → ["a", "b"]; the trailing pipe is optional. */
const cells = (row) => row.replace(/^\|/, "").replace(/\|\s*$/, "").split("|").map((c) => c.trim());
// ../core/src/nearest.ts
/**
* The one nearest-match helper behind every "did you mean" hint (Element type, prop, flag, enum value, id).
* Case-insensitive; a transposition counts as one edit. Returns undefined when nothing is close enough.
*/
function nearest(word, candidates) {
	const max = Math.max(1, Math.floor(word.length / 3));
	let best;
	let bestDistance = max + 1;
	for (const candidate of candidates) {
		const d = distance(word.toLowerCase(), candidate.toLowerCase());
		if (d < bestDistance) [best, bestDistance] = [candidate, d];
	}
	return best;
}
/** Optimal string alignment distance (Levenshtein plus adjacent transpositions). */
function distance(a, b) {
	const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
	for (let j = 1; j <= b.length; j++) d[0][j] = j;
	for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) {
		const cost = a[i - 1] === b[j - 1] ? 0 : 1;
		let v = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
		if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) v = Math.min(v, d[i - 2][j - 2] + 1);
		d[i][j] = v;
	}
	return d[a.length][b.length];
}
/** ` — did you mean X?` or "" when nothing is close. */
const didYouMean = (word, candidates) => {
	const match = nearest(word, candidates);
	return match === void 0 ? "" : ` — did you mean ${match}?`;
};
// ../core/src/elements.ts
const sizes = {
	kind: "enum",
	values: [
		"md",
		"sm",
		"lg"
	]
};
/** Button and Menu (its trigger is a Button). */
const variants = {
	kind: "enum",
	values: [
		"default",
		"secondary",
		"outline",
		"ghost",
		"destructive",
		"link"
	]
};
/** Button and Menu: icon-only shows nothing but the icon, so it needs one. */
const iconOnly = (node, err) => {
	if (node.props["icon-only"] === true && node.props.icon === void 0) err("icon-only needs icon=... too");
};
/** Select and Radio: value= picks one of options=, or it would show nothing once exported. */
const valueInOptions = (node, err) => {
	const value = node.props.value;
	const options = node.props.options ?? [];
	if (typeof value !== "string" || options.includes(value)) return;
	if (!options.length) err(`value=${value} needs options= that include it`);
	else err(`unknown value "${value}"${didYouMean(value, options)} (expected: ${options.join(", ")})`);
};
/** Dialog and Sheet. */
const dialog$2 = {
	desc: { kind: "string" },
	open: { kind: "flag" }
};
/** Stack and Row. */
const flex$1 = {
	gap: sizes,
	align: {
		kind: "enum",
		values: [
			"start",
			"center",
			"end"
		]
	},
	justify: {
		kind: "enum",
		values: [
			"start",
			"between",
			"end"
		]
	}
};
/**
* One schema per Element type: the whole vocabulary `check` accepts.
* Add an Element type with one entry here (and its emitter in each Backend).
* Screens go only at the top level; that rule lives in validate.ts.
*/
const ELEMENTS = {
	/** Every Screen gets an id: the slug of its Label when it has no id=. */
	Screen: {
		label: "required",
		props: {
			id: { kind: "string" },
			subtitle: { kind: "string" }
		},
		children: "any",
		slots: ["actions"],
		infer(node) {
			const slug = slugify(node.label ?? "");
			if (node.props.id === void 0 && slug) node.props.id = slug;
		},
		check(node, err) {
			if (node.props.id === void 0 && node.label !== void 0) err("cannot derive an id from the Label (add id=name)");
		}
	},
	/** A Screen's navigation column. Its Link going to its own Screen is the active one (no first-child default). */
	Sidebar: {
		label: "none",
		props: {},
		children: ["Link"],
		parents: ["Screen"],
		exclusive: { flag: "active" },
		infer(node, parent) {
			for (const link of node.children) if (parent?.type === "Screen" && link.props.to === parent.props.id && link.props.active === void 0) link.props.active = true;
		},
		check(node, err, parent) {
			if (parent?.type === "Screen" && parent.children.indexOf(node) > 0) err("must be the first child of its Screen");
		}
	},
	Link: {
		label: "required",
		props: {
			icon: { kind: "icon" },
			active: { kind: "flag" },
			to: {
				kind: "ref",
				to: ["Screen"]
			}
		},
		parents: ["Sidebar"]
	},
	Heading: {
		label: "required",
		props: { level: {
			kind: "enum",
			values: [
				"2",
				"1",
				"3",
				"4"
			]
		} }
	},
	Text: {
		label: "optional",
		props: {
			size: sizes,
			muted: { kind: "flag" },
			bold: { kind: "flag" },
			lorem: {
				kind: "number",
				min: 1
			}
		},
		check(node, err) {
			if (node.label !== void 0 && node.props.lorem !== void 0) err("has both a Label and lorem= (keep one)");
			if (node.label === void 0 && node.props.lorem === void 0) err("needs a Label (Text \"...\") or lorem=N");
		}
	},
	/** The Label is the value. trend colors the hint and adds an arrow. */
	Stat: {
		label: "required",
		props: {
			title: { kind: "string" },
			hint: { kind: "string" },
			trend: {
				kind: "enum",
				values: [
					"none",
					"up",
					"down"
				]
			}
		}
	},
	Badge: {
		label: "required",
		props: { variant: {
			kind: "enum",
			values: [
				"default",
				"secondary",
				"outline",
				"destructive"
			]
		} }
	},
	/** The Label is a name; the Avatar shows its initials. */
	Avatar: {
		label: "required",
		props: { size: sizes }
	},
	/** The Label is the alt text of a placeholder box. */
	Image: {
		label: "required",
		props: { ratio: {
			kind: "ratio",
			default: "16:9"
		} }
	},
	/** The Label is the title. */
	Alert: {
		label: "required",
		props: {
			text: { kind: "string" },
			variant: {
				kind: "enum",
				values: ["default", "destructive"]
			}
		}
	},
	Progress: {
		label: "none",
		props: { value: {
			kind: "number",
			min: 0,
			max: 100
		} }
	},
	Stack: {
		label: "none",
		props: flex$1,
		children: "any"
	},
	Row: {
		label: "none",
		props: flex$1,
		children: "any"
	},
	Grid: {
		label: "none",
		props: {
			cols: {
				kind: "number",
				min: 2,
				max: 6,
				default: 2
			},
			gap: sizes
		},
		children: "any",
		childProps: { span: {
			kind: "number",
			min: 1
		} },
		checkChild(child, err, grid) {
			const { span } = child.props;
			const { cols } = grid.props;
			if (typeof span === "number" && typeof cols === "number" && span > cols) err(`span=${span} is larger than the Grid's cols=${cols}`);
		}
	},
	Separator: {
		label: "none",
		props: {}
	},
	Card: {
		label: "optional",
		props: { desc: { kind: "string" } },
		children: "any",
		slots: ["actions", "footer"]
	},
	Table: {
		label: "none",
		props: {
			cols: { kind: "list" },
			rows: {
				kind: "number",
				min: 1
			}
		},
		check(node, err) {
			if (node.rows && node.props.rows !== void 0) err("has both | rows and rows= (keep one)");
			const cols = node.props.cols;
			if (!cols) return err("needs cols (Table cols=\"A,B,C\")");
			node.rows?.forEach((cells, i) => {
				if (cells.length !== cols.length) err(`row has ${cells.length} cells, expected ${cols.length} (cols: ${cols.join(", ")})`, node.rowLines[i]);
			});
		}
	},
	List: {
		label: "none",
		props: {
			items: { kind: "list" },
			rows: {
				kind: "number",
				min: 1
			}
		},
		check(node, err) {
			if (node.props.items !== void 0 && node.props.rows !== void 0) err("has both items= and rows= (keep one)");
		}
	},
	/** The Label is the title. Shown by a Button's opens=, or on load with `open`. */
	Dialog: {
		label: "required",
		props: dialog$2,
		children: "any",
		parents: ["Screen"],
		slots: ["footer"]
	},
	Sheet: {
		label: "required",
		props: {
			...dialog$2,
			side: {
				kind: "enum",
				values: ["right", "left"]
			}
		},
		children: "any",
		parents: ["Screen"],
		slots: ["footer"]
	},
	Tabs: {
		label: "none",
		props: {},
		children: ["Tab"],
		exclusive: {
			flag: "active",
			firstByDefault: true
		}
	},
	Tab: {
		label: "required",
		props: { active: { kind: "flag" } },
		children: "any",
		parents: ["Tabs"]
	},
	/** Carries its own trigger, a Button: the Label is its text, or its accessible name with icon-only. */
	Menu: {
		label: "required",
		props: {
			variant: variants,
			icon: { kind: "icon" },
			"icon-only": { kind: "flag" },
			open: { kind: "flag" }
		},
		children: ["Item"],
		check: iconOnly
	},
	Item: {
		label: "required",
		props: {
			destructive: { kind: "flag" },
			disabled: { kind: "flag" }
		},
		parents: ["Menu"]
	},
	Button: {
		label: "required",
		props: {
			variant: variants,
			size: sizes,
			icon: { kind: "icon" },
			"icon-only": { kind: "flag" },
			disabled: { kind: "flag" },
			loading: { kind: "flag" },
			opens: {
				kind: "ref",
				to: ["Dialog", "Sheet"]
			},
			to: {
				kind: "ref",
				to: ["Screen"]
			}
		},
		check(node, err, parent) {
			iconOnly(node, err, parent);
			if (node.props.opens !== void 0 && node.props.to !== void 0) err("has both opens= and to= (keep one)");
		}
	},
	Input: {
		label: "required",
		props: {
			type: {
				kind: "enum",
				values: [
					"text",
					"email",
					"password",
					"number",
					"search"
				]
			},
			placeholder: { kind: "string" },
			value: { kind: "string" },
			error: { kind: "string" },
			disabled: { kind: "flag" }
		}
	},
	Textarea: {
		label: "required",
		props: {
			placeholder: { kind: "string" },
			value: { kind: "string" },
			rows: {
				kind: "number",
				min: 1
			}
		}
	},
	Select: {
		label: "required",
		props: {
			options: { kind: "list" },
			value: { kind: "string" },
			placeholder: { kind: "string" },
			open: { kind: "flag" }
		},
		check: valueInOptions
	},
	Checkbox: {
		label: "required",
		props: {
			checked: { kind: "flag" },
			disabled: { kind: "flag" }
		}
	},
	Switch: {
		label: "required",
		props: {
			checked: { kind: "flag" },
			disabled: { kind: "flag" }
		}
	},
	Radio: {
		label: "required",
		props: {
			options: { kind: "list" },
			value: { kind: "string" }
		},
		check: valueInOptions
	}
};
/** "Order list" → "order-list". */
const slugify = (label) => label.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
// ../core/src/validate.ts
/** `id=`, which every Element takes without listing it. */
const ID_PROP = { kind: "string" };
/**
* Checks a parsed document against the ELEMENTS schemas. Generic: per-Element-type rules belong in ELEMENTS; the
* only type named here is Screen, the top level of every file.
* Mutates the AST into what Backends read: coerced prop values, defaults, inferred props (ELEMENTS `infer`).
*/
function validate(document, options = {}) {
	const errors = [];
	/** Each id's first Element and the Screen it sits on. */
	const ids = /* @__PURE__ */ new Map();
	/** Ref props (opens=, to=) to resolve once every id is known: a Screen may go to one further down the file. */
	const refs = [];
	/** The Screen being walked. */
	let current;
	const err = (node, message) => errors.push({
		line: node.line,
		type: node.type,
		message
	});
	if (!document.screens.length) errors.push({
		line: 1,
		type: "Screen",
		message: "no Screen in the file (start with Screen \"Title\")"
	});
	const walk = (node, parent, inSlot = false) => {
		const spec = ELEMENTS[node.type];
		if (!spec) err(node, `unknown Element type "${node.type}"${didYouMean(node.type, Object.keys(ELEMENTS))}`);
		else {
			if (!parent && node.type !== "Screen") err(node, "must be inside a Screen (only Screens go at the top level)");
			if (parent && node.type === "Screen") err(node, "must be at the top level, not inside another Element");
			const allowed = parent && !inSlot ? ELEMENTS[parent.type]?.children : "any";
			if (!allowed) err(node, `cannot go inside ${parent.type} (${parent.type} takes no children)`);
			else if (allowed !== "any" && !allowed.includes(node.type)) err(node, `cannot go inside ${parent.type} (allowed: ${allowed.join(", ")})`);
			if (spec.parents && (inSlot || !spec.parents.includes(parent?.type ?? ""))) err(node, `only goes directly inside ${spec.parents.join(" or ")}`);
			if (spec.label === "required" && node.label === void 0) err(node, `needs a Label (${node.type} "...")`);
			if (spec.label === "none" && node.label !== void 0) err(node, "takes no Label");
			for (const name of Object.keys(node.slots ?? {})) if (!spec.slots?.includes(name)) {
				const owners = Object.keys(ELEMENTS).filter((type) => ELEMENTS[type].slots?.includes(name));
				err(node, `takes no "${name}" slot (allowed in: ${owners.join(", ")})`);
			}
			const host = parent && !inSlot ? ELEMENTS[parent.type] : void 0;
			props(node, spec, host?.childProps, options, err);
			for (const [key, prop] of Object.entries(spec.props)) if (prop.kind === "ref" && typeof node.props[key] === "string") refs.push({
				node,
				screen: current,
				key,
				to: prop.to
			});
			spec.infer?.(node, parent);
			spec.check?.(node, (message, line = node.line) => errors.push({
				line,
				type: node.type,
				message
			}), parent);
			host?.checkChild?.(node, (message) => err(node, message), parent);
		}
		const id = node.props.id;
		if (typeof id === "string") {
			const first = ids.get(id);
			if (first === void 0) ids.set(id, {
				node,
				screen: current
			});
			else err(node, `duplicate id "${id}" (also on line ${first.node.line})`);
		}
		for (const child of node.children) walk(child, node);
		for (const child of [...node.slots?.actions ?? [], ...node.slots?.footer ?? []]) walk(child, node, true);
		if (spec?.exclusive) {
			const { flag, firstByDefault } = spec.exclusive;
			const [first, ...extra] = node.children.filter((child) => child.props[flag] === true);
			for (const child of extra) err(child, `only one ${child.type} per ${node.type} can be ${flag} (line ${first.line} is ${flag} too)`);
			if (!first && firstByDefault && node.children[0]) node.children[0].props[flag] = true;
		}
	};
	for (const s of document.screens) {
		current = s;
		walk(s);
	}
	const screenIds = document.screens.map((screen) => screen.props.id).filter((id) => typeof id === "string");
	const screens = `(expected: ${screenIds.join(", ")})`;
	for (const { node, screen, key, to } of refs) {
		const id = node.props[key];
		const target = ids.get(id);
		const expected = `(expected: a ${to.join(" or ")} on this Screen)`;
		if (to.includes("Screen")) {
			if (!target) err(node, `${key}=${id} is an unknown Screen id${didYouMean(id, screenIds)} ${screens}`);
			else if (target.node.type !== "Screen") err(node, `${key}=${id} is the ${target.node.type} on line ${target.node.line}, not a Screen ${screens}`);
		} else if (!target) {
			const near = [...ids].filter(([, t]) => t.screen === screen && to.includes(t.node.type)).map(([name]) => name);
			err(node, `${key}=${id} is an unknown id${didYouMean(id, near)} ${expected}`);
		} else if (!to.includes(target.node.type)) err(node, `${key}=${id} is the ${target.node.type} on line ${target.node.line} ${expected}`);
		else if (target.screen !== screen) err(node, `${key}=${id} is the ${target.node.type} on line ${target.node.line}, on another Screen ${expected}`);
	}
	return errors;
}
function props(node, spec, granted, options, err) {
	const own = {
		...granted,
		...spec.props
	};
	const names = ["id", ...Object.keys(own)];
	for (const [key, raw] of Object.entries(node.props)) {
		const prop = key === "id" ? ID_PROP : own[key];
		if (!prop) {
			const enumProp = Object.entries(spec.props).find(([, p]) => p.kind === "enum" && p.values.includes(key))?.[0];
			const grantors = Object.keys(ELEMENTS).filter((type) => ELEMENTS[type].childProps?.[key]);
			if (grantors.length) err(node, `${key} only works directly inside a ${grantors.join(" or ")}`);
			else if (raw !== true) err(node, `unknown prop "${key}"${didYouMean(key, names)}`);
			else err(node, `unknown flag "${key}"${enumProp ? ` — did you mean ${enumProp}=${key}?` : didYouMean(key, names)}`);
		} else if (prop.kind === "flag") {
			if (raw !== true) err(node, `${key} is a flag and takes no value (write just ${key})`);
		} else if (raw === true) err(node, `${key} needs a value${prop.kind === "enum" ? ` (expected: ${prop.values.join(", ")})` : ""}`);
		else node.props[key] = coerce(key, String(raw), prop, options, (message) => err(node, message));
	}
	for (const [key, prop] of Object.entries(spec.props)) {
		if (node.props[key] !== void 0) continue;
		if (prop.kind === "enum") node.props[key] = prop.values[0];
		if ((prop.kind === "number" || prop.kind === "ratio") && prop.default !== void 0) node.props[key] = prop.default;
	}
}
function coerce(key, value, prop, { iconNames }, err) {
	switch (prop.kind) {
		case "icon":
			if (iconNames && !iconNames.has(value)) err(`unknown icon "${value}"${didYouMean(value, iconNames)} (expected: a Lucide icon name)`);
			return value;
		case "enum":
			if (!prop.values.includes(value)) err(`unknown ${key} "${value}"${didYouMean(value, prop.values)} (expected: ${prop.values.join(", ")})`);
			return value;
		case "number": {
			const n = Number(value);
			if (!/^-?\d+$/.test(value)) err(`${key}=${value} is not a whole number`);
			else if (n < (prop.min ?? -Infinity) || n > (prop.max ?? Infinity)) err(`${key}=${value} is out of range (expected: ${prop.min ?? ""}..${prop.max ?? ""})`);
			return n;
		}
		case "ratio":
			if (!/^[1-9]\d*:[1-9]\d*$/.test(value)) err(`${key}=${value} is not a ratio (expected: W:H with whole numbers above 0, e.g. 4:3)`);
			return value;
		case "list": {
			const items = value.split(/(?<!\\),/).map((item) => item.replaceAll("\\,", ",").trim());
			if (items.includes("")) err(`${key} has an empty item (remove the extra comma)`);
			return items;
		}
		default: return value.replaceAll("\\,", ",");
	}
}
// ../core/src/index.ts
/**
* Parses and validates a Skizo source, returning every error sorted by line.
* Hand the document to a Backend only when `errors` is empty.
*/
function check(source, options) {
	const { document, errors, garbled } = parse(source);
	return {
		document,
		errors: [...errors, ...validate(document, options).filter((e) => !garbled.has(e.line))].sort((a, b) => a.line - b.line)
	};
}
// src/assets.ts
/**
* Reads a file shipped in the package, relative to packages/cli/ (e.g. "assets/preview.css").
* Must stay directly in src/: the bundle is flat (dist/cli.mjs), so "../" is packages/cli/ from both.
*/
const readAsset = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
// src/backend.ts
/** Joins the present lines. */
const lines = (...parts) => parts.filter(Boolean).join("\n");
/** The emitter for an Element type. Each Backend has one for every type in ELEMENTS, so a missing one is a bug. */
function emitterFor(emitters, type, backend) {
	const emit = emitters[type];
	if (!emit) throw new Error(`${backend} has no emitter for Element type ${type}`);
	return emit;
}
/** A Screen's Sidebar, when it is the first child (the page shell's column), and the rest: the Screen's body. */
function screenParts(screen) {
	const sidebar = screen.children[0]?.type === "Sidebar" ? screen.children[0] : void 0;
	return {
		sidebar,
		body: sidebar ? screen.children.slice(1) : screen.children
	};
}
const ARROWS = {
	none: "",
	up: "↑",
	down: "↓"
};
/** A Stat's hint line: its trend arrow, then hint=; "" when it has neither. */
const statHint = (node) => [ARROWS[node.props.trend], node.props.hint].filter(Boolean).join(" ");
/** Whether a Button declares a Behavior (opens= or to=). In a footer, a Button without one closes its Dialog or Sheet. */
const hasBehavior = (node) => node.props.opens !== void 0 || node.props.to !== void 0;
/**
* A JS identifier in PascalCase from an id or icon name: `order-details` → `OrderDetails`. One that would start
* with a digit (or be empty) gets `prefix` first: `2026-report` → `Screen2026Report` with prefix `Screen`.
*/
const pascalCase = (id, prefix = "") => {
	const name = id.split(/[^A-Za-z0-9]+/).map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join("");
	return /^[A-Za-z]/.test(name) ? name : `${prefix}${name}`;
};
// src/icons.ts
let lucide;
let names;
const load$1 = () => lucide ??= JSON.parse(readAsset("assets/icons.json"));
const canonical = (name) => load$1().aliases[name] ?? name;
/** Every name `icon=` accepts, canonical names and aliases. The cli passes it to `check` as `iconNames`. */
const iconNames = () => names ??= /* @__PURE__ */ new Set([...Object.keys(load$1().icons), ...Object.keys(load$1().aliases)]);
/** Inline SVG for the Preview, hidden from assistive tech (the Label names the control). */
const iconSvg = (name, className = "size-4") => `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="${className}" aria-hidden="true">${load$1().icons[canonical(name)]}</svg>`;
/** The lucide-react component for an icon: `home` → `HouseIcon`. Canonical names are the stable exports. */
const iconComponent = (name) => `${pascalCase(canonical(name))}Icon`;
// src/placeholder.ts
/**
* The node path of every Element, the seed for its placeholder content: `<screen id>/<child index>/...`,
* slot children as `<path>/actions/<i>`. Taken from the AST, so it does not depend on how emitters nest output.
*/
function nodePaths(document) {
	const paths = /* @__PURE__ */ new Map();
	const walk = (node, path) => {
		paths.set(node, path);
		node.children.forEach((child, i) => walk(child, `${path}/${i}`));
		for (const [slot, nodes] of Object.entries(node.slots ?? {})) nodes.forEach((child, i) => walk(child, `${path}/${slot}/${i}`));
	};
	for (const screen of document.screens) walk(screen, screen.props.id);
	return paths;
}
const PEOPLE = [
	"Ana Souza",
	"Bruno Lima",
	"Carla Dias",
	"Diego Rocha",
	"Elena Costa",
	"Felipe Alves",
	"Grace Kim",
	"Hugo Martin"
];
const STATUSES = [
	"Active",
	"Pending",
	"Paid",
	"Failed"
];
const MONTHS = [
	"Jan",
	"Feb",
	"Mar",
	"Apr",
	"May",
	"Jun",
	"Jul",
	"Aug",
	"Sep",
	"Oct",
	"Nov",
	"Dec"
];
/** A Table's rows: its `|` rows, or `rows=N` placeholder rows with cells guessed from the column names. */
function tableRows(node, path) {
	if (node.rows) return node.rows;
	const random = seeded(path);
	const pick = (xs) => xs[Math.floor(random() * xs.length)];
	const first = Math.floor(random() * PEOPLE.length);
	return Array.from({ length: node.props.rows ?? 0 }, (_, i) => {
		const person = PEOPLE[(first + i * 3) % PEOPLE.length];
		return node.props.cols.map((col) => {
			const name = col.toLowerCase();
			if (name.includes("email")) return `${person.toLowerCase().replace(" ", ".")}@example.com`;
			if (name.includes("name")) return person;
			if (name.includes("date")) return `${pick(MONTHS)} ${1 + Math.floor(random() * 28)}, 2026`;
			if (name.includes("status")) return pick(STATUSES);
			if (name.includes("amount")) return `$${(5 + random() * 995).toFixed(2)}`;
			return `Item ${i + 1}`;
		});
	});
}
/** A List's items: `items`, or `rows=N` placeholders "Item 1" to "Item N". */
const listItems = (node) => node.props.items ?? Array.from({ length: node.props.rows ?? 0 }, (_, i) => `Item ${i + 1}`);
const WORDS = "lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua enim ad minim veniam quis nostrud exercitation ullamco laboris nisi aliquip ex ea commodo consequat duis aute irure in reprehenderit voluptate velit esse cillum fugiat nulla pariatur excepteur sint occaecat cupidatat non proident sunt culpa qui officia deserunt mollit anim id est laborum".split(" ");
/** Text lorem=N: `count` words of lorem ipsum, in sentences of 4 to 12 words. */
function lorem(path, count) {
	const random = seeded(path);
	const sentences = [];
	for (let left = count; left > 0;) {
		const length = Math.min(left, 4 + Math.floor(random() * 9));
		const words = Array.from({ length }, () => WORDS[Math.floor(random() * WORDS.length)]).join(" ");
		sentences.push(`${words.charAt(0).toUpperCase()}${words.slice(1)}.`);
		left -= length;
	}
	return sentences.join(" ");
}
/** Avatar initials: "Ana Souza" → "AS", "Carla Maria Dias" → "CD", "bruno" → "B". */
function initials(name) {
	const words = name.split(/\s+/).filter(Boolean);
	return words.filter((_, i) => i === 0 || i === words.length - 1).map((word) => [...word][0].toUpperCase()).join("");
}
/** mulberry32 seeded with an FNV-1a hash of `seed`: the same floats in [0, 1) on every run. */
function seeded(seed) {
	let h = 2166136261;
	for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
	return () => {
		h = h + 1831565813 | 0;
		let t = Math.imul(h ^ h >>> 15, 1 | h);
		t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
		return ((t ^ t >>> 14) >>> 0) / 4294967296;
	};
}
// src/classes.ts
/** `gap=sm|md|lg`, the same tokens in every Backend. */
const gap = {
	sm: "gap-2",
	md: "gap-4",
	lg: "gap-6"
};
/** Stack and Row. `start` adds no class: it is CSS's stretch, so Cards and Tables in a Stack keep their full width. */
const flex = {
	gap,
	align: {
		start: "",
		center: "items-center",
		end: "items-end"
	},
	justify: {
		start: "",
		between: "justify-between",
		end: "justify-end"
	}
};
/**
* Tailwind classes shared by every Backend, one entry per Element type, so the Preview and exports look alike.
* Write full literal class strings (never `gap-${n}`): Tailwind finds them by scanning this file.
*/
const CLASSES = {
	Screen: {
		root: "min-h-screen p-6",
		/** A Screen with a Sidebar: the page shell, a sidebar column beside the main area (which holds header and body). */
		shell: "flex min-h-screen",
		main: "min-w-0 flex-1 p-6",
		header: "mb-6 grid gap-1",
		headerWithActions: "grid-cols-[1fr_auto] gap-x-4",
		actions: "col-start-2 row-span-2 row-start-1 flex items-center gap-2 self-start justify-self-end",
		title: "text-2xl font-semibold tracking-tight",
		subtitle: "text-sm text-muted-foreground",
		body: "flex flex-col gap-4"
	},
	/** Plain markup in every Backend, styled after shadcn's sidebar (bg-sidebar is about bg-muted/50 on white). */
	Sidebar: {
		root: "w-64 shrink-0 border-r bg-muted/50 p-2",
		nav: "flex flex-col gap-1"
	},
	/** shadcn's SidebarMenuButton look; the active Link carries aria-current="page". */
	Link: {
		root: "flex h-8 items-center gap-2 rounded-md px-2 text-sm hover:bg-accent hover:text-accent-foreground aria-[current=page]:bg-accent aria-[current=page]:font-medium aria-[current=page]:text-accent-foreground",
		icon: "size-4 shrink-0"
	},
	Heading: {
		"1": "text-3xl font-bold tracking-tight",
		"2": "text-xl font-semibold tracking-tight",
		"3": "text-lg font-semibold tracking-tight",
		"4": "text-base font-semibold"
	},
	Text: {
		sm: "text-xs",
		md: "text-sm",
		lg: "text-base",
		muted: "text-muted-foreground",
		bold: "font-semibold"
	},
	Stack: {
		root: "flex flex-col",
		...flex
	},
	Row: {
		root: "flex",
		...flex
	},
	Grid: {
		root: "grid",
		gap,
		cols: {
			2: "grid-cols-2",
			3: "grid-cols-3",
			4: "grid-cols-4",
			5: "grid-cols-5",
			6: "grid-cols-6"
		},
		/** Wraps a child with span=N: a one-cell grid, so the child still stretches like any other Grid child. */
		cell: "grid",
		span: {
			1: "col-span-1",
			2: "col-span-2",
			3: "col-span-3",
			4: "col-span-4",
			5: "col-span-5",
			6: "col-span-6"
		}
	},
	/** The shadcn look, for the Preview; the export gets it from the project's own Separator. */
	Separator: { root: "h-px w-full shrink-0 bg-border" },
	Card: {
		root: "flex flex-col gap-6 overflow-hidden rounded-xl bg-card py-6 text-sm text-card-foreground shadow-xs ring-1 ring-foreground/10",
		header: "grid auto-rows-min items-start gap-1 px-6",
		headerWithActions: "grid-cols-[1fr_auto]",
		title: "text-base leading-normal font-medium",
		desc: "text-sm text-muted-foreground",
		action: "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
		content: "flex flex-col gap-3 px-6",
		footer: "flex items-center px-6",
		actions: "flex items-center gap-2",
		footerItems: "gap-2"
	},
	Stat: {
		root: "grid gap-1",
		title: "text-sm text-muted-foreground",
		value: "text-2xl font-bold",
		/** The hint line, by trend. */
		none: "text-xs text-muted-foreground",
		up: "text-xs text-emerald-600",
		down: "text-xs text-destructive"
	},
	Badge: {
		root: "inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-4xl border px-2 py-0.5 text-xs font-medium whitespace-nowrap",
		default: "border-transparent bg-primary text-primary-foreground",
		secondary: "border-transparent bg-secondary text-secondary-foreground",
		outline: "text-foreground",
		destructive: "border-transparent bg-destructive/10 text-destructive"
	},
	Avatar: {
		root: "flex shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground select-none",
		sm: "size-6 text-xs",
		md: "size-8 text-sm",
		lg: "size-10 text-sm"
	},
	/** Its ratio=W:H is an inline aspect-ratio style in every Backend, so any ratio works without a class built for it. */
	Image: { root: "flex w-full items-center justify-center rounded-lg bg-muted text-sm text-muted-foreground" },
	Alert: {
		root: "grid w-full gap-0.5 rounded-lg border bg-card px-4 py-3 text-left text-sm",
		default: "text-card-foreground",
		destructive: "text-destructive",
		title: "font-medium",
		text: {
			default: "text-muted-foreground",
			destructive: "text-destructive/90"
		}
	},
	Progress: {
		root: "relative flex h-1.5 w-full items-center overflow-hidden rounded-full bg-muted",
		indicator: "h-full bg-primary"
	},
	/** The Preview's copy of shadcn's table.tsx; the export gets these from the project's own Table components. */
	Table: {
		container: "relative w-full overflow-x-auto",
		table: "w-full caption-bottom text-sm",
		header: "[&_tr]:border-b",
		body: "[&_tr:last-child]:border-0",
		row: "border-b transition-colors hover:bg-muted/50",
		head: "h-10 px-2 text-left align-middle font-medium whitespace-nowrap text-foreground",
		cell: "p-2 align-middle whitespace-nowrap"
	},
	List: { root: "ml-6 list-disc text-sm [&>li]:mt-1" },
	/** shadcn's TabsList and TabsTrigger looks; the Preview marks the active Tab with aria-selected. */
	Tabs: {
		root: "flex flex-col gap-2",
		list: "inline-flex h-9 w-fit items-center justify-center rounded-lg bg-muted p-[3px] text-muted-foreground",
		trigger: "inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 rounded-md border border-transparent px-2 py-1 text-sm font-medium whitespace-nowrap text-foreground/60 transition-all hover:text-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-1 focus-visible:outline-ring aria-selected:bg-background aria-selected:text-foreground aria-selected:shadow-sm",
		panel: "flex flex-col gap-4"
	},
	/** shadcn DropdownMenu look-alike for the Preview, opened by preview/script.ts (exports use <DropdownMenu>). Its trigger uses Button. */
	Menu: {
		content: "absolute z-50 mt-1 w-max min-w-32 rounded-md bg-popover p-1 text-popover-foreground shadow-md ring-1 ring-foreground/10",
		item: "relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm select-none",
		default: "hover:bg-accent hover:text-accent-foreground",
		destructive: "text-destructive hover:bg-destructive/10",
		disabled: "pointer-events-none opacity-50"
	},
	Dialog: {
		backdrop: "fixed inset-0 isolate z-50 bg-black/10 supports-backdrop-filter:backdrop-blur-xs",
		content: "fixed top-1/2 left-1/2 z-50 grid w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 gap-6 rounded-xl bg-popover p-6 text-sm text-popover-foreground ring-1 ring-foreground/10 outline-none sm:max-w-md",
		header: "flex flex-col gap-2",
		title: "leading-none font-medium",
		desc: "text-sm text-muted-foreground",
		body: "grid gap-4",
		footer: "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
		/** The corner X, a ghost icon Button. */
		close: "absolute top-4 right-4"
	},
	Sheet: {
		backdrop: "fixed inset-0 z-50 bg-black/10 supports-backdrop-filter:backdrop-blur-xs",
		content: "fixed z-50 flex flex-col gap-4 bg-popover bg-clip-padding text-sm text-popover-foreground shadow-lg",
		right: "inset-y-0 right-0 h-full w-3/4 border-l sm:max-w-sm",
		left: "inset-y-0 left-0 h-full w-3/4 border-r sm:max-w-sm",
		header: "flex flex-col gap-1.5 p-4",
		title: "font-medium text-foreground",
		desc: "text-sm text-muted-foreground",
		body: "grid flex-1 auto-rows-min gap-4 px-4",
		footer: "mt-auto flex flex-col gap-2 p-4",
		close: "absolute top-4 right-4"
	},
	/** shadcn Button look-alike for the Preview (exports use <Button variant size>). Reuse it for any button-like trigger. */
	Button: {
		base: "inline-flex shrink-0 items-center justify-center rounded-md border border-transparent text-sm font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50",
		variant: {
			default: "bg-primary text-primary-foreground hover:bg-primary/80",
			secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
			outline: "border-border bg-background shadow-xs hover:bg-muted hover:text-foreground",
			ghost: "hover:bg-muted hover:text-foreground",
			destructive: "bg-destructive/10 text-destructive hover:bg-destructive/20",
			link: "text-primary underline-offset-4 hover:underline"
		},
		size: {
			sm: "h-8 gap-1 px-2.5",
			md: "h-9 gap-1.5 px-2.5",
			lg: "h-10 gap-1.5 px-2.5"
		},
		/** Square sizes for icon-only. */
		iconSize: {
			sm: "size-8",
			md: "size-9",
			lg: "size-10"
		},
		/** The loading spinner icon. */
		spinner: "animate-spin",
		/** An icon-only Label: hidden, still the accessible name. */
		hiddenLabel: "sr-only"
	},
	/** Shared by the form-control Element types: a Label above its control, error text below. */
	Field: {
		root: "grid gap-2",
		/** shadcn Label look-alike for the Preview (exports use <Label>). */
		label: "flex items-center gap-2 text-sm leading-none font-medium select-none peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
		error: "text-sm text-destructive",
		/** A small control beside its Label (Checkbox, Switch, a Radio option). */
		choice: "flex items-center gap-2"
	},
	Input: { control: "h-9 w-full min-w-0 rounded-md border border-input bg-transparent px-2.5 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm" },
	Textarea: { 
	/** shadcn's minus field-sizing-content, so the Preview honors rows=. */
control: "flex min-h-16 w-full rounded-md border border-input bg-transparent px-2.5 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm" },
	/** shadcn Select look-alike for the Preview, opened by preview/script.ts (exports use <Select>). */
	Select: {
		trigger: "flex h-9 w-fit items-center justify-between gap-1.5 rounded-md border border-input bg-transparent py-2 pr-2 pl-2.5 text-sm whitespace-nowrap shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
		placeholder: "text-muted-foreground",
		chevron: "pointer-events-none size-4 text-muted-foreground",
		content: "absolute z-50 mt-1 min-w-36 overflow-hidden rounded-md bg-popover p-1 text-popover-foreground shadow-md ring-1 ring-foreground/10",
		item: "relative flex w-full cursor-default items-center gap-2 rounded-sm py-1.5 pr-8 pl-2 text-sm select-none hover:bg-accent hover:text-accent-foreground aria-selected:[&_svg]:visible",
		check: "pointer-events-none invisible absolute right-2 size-4"
	},
	/** The Preview uses native inputs tinted with the primary color (exports use <Checkbox>, <RadioGroupItem>). */
	Checkbox: { control: "peer size-4 shrink-0 accent-primary disabled:cursor-not-allowed disabled:opacity-50" },
	Switch: {
		track: "peer inline-flex h-[18.4px] w-[32px] shrink-0 items-center rounded-full border border-transparent shadow-xs disabled:cursor-not-allowed disabled:opacity-50",
		trackOn: "bg-primary",
		trackOff: "bg-input",
		thumb: "pointer-events-none block size-4 rounded-full bg-background",
		thumbOn: "translate-x-[calc(100%-2px)]",
		thumbOff: "translate-x-0"
	},
	Radio: {
		group: "grid gap-3",
		control: "peer size-4 shrink-0 accent-primary disabled:cursor-not-allowed disabled:opacity-50"
	}
};
/** Joins the truthy class strings. */
const cx = (...classes) => classes.filter(Boolean).join(" ");
/** A checked Stack or Row's classes. */
function flexClasses(node) {
	const c = CLASSES[node.type];
	const p = node.props;
	return cx(c.root, c.gap[p.gap], c.align[p.align], c.justify[p.justify]);
}
/** A checked Grid's classes. */
function gridClasses(node) {
	const c = CLASSES.Grid;
	const p = node.props;
	return cx(c.root, c.cols[p.cols], c.gap[p.gap]);
}
/** The classes of the cell a Grid wraps around a child with span=N; undefined without span (no wrapper). */
function spanClasses(child) {
	const span = child.props.span;
	return span === void 0 ? void 0 : cx(CLASSES.Grid.cell, CLASSES.Grid.span[span]);
}
// src/preview/elements.ts
/** HTML-escapes text and attribute values. */
const esc = (s) => s.replace(/[&<>"']/g, (c) => ({
	"&": "&amp;",
	"<": "&lt;",
	">": "&gt;",
	"\"": "&quot;",
	"'": "&#39;"
})[c]);
/** ` name="value"` per attribute (escaped); true is a bare boolean attribute; undefined and false are skipped. */
const attrs = (pairs) => Object.entries(pairs).map(([name, v]) => v === void 0 || v === false ? "" : v === true ? ` ${name}` : ` ${name}="${esc(String(v))}"`).join("");
/** DOM id of a form control: from its source line, so unique within the page and stable between runs. */
const fieldId$1 = (node) => `field-${node.line}`;
/** Where `to=` goes in the Preview: the hash names the Screen to show (SCRIPTS.to). */
const screenHref$1 = (id) => `#${encodeURIComponent(id)}`;
/** A form control under its Label, with error text below. */
const field$1 = (node, control, error) => [
	`<div class="${CLASSES.Field.root}">`,
	`<label for="${fieldId$1(node)}" class="${CLASSES.Field.label}">${esc(node.label)}</label>`,
	control,
	typeof error === "string" && `<p class="${CLASSES.Field.error}">${esc(error)}</p>`,
	`</div>`
].filter(Boolean).join("\n");
/** A small control (Checkbox, Switch, Radio option) with its Label beside it. */
const choice$1 = (id, label, control) => `<div class="${CLASSES.Field.choice}">${control}<label for="${id}" class="${CLASSES.Field.label}">${esc(label)}</label></div>`;
/**
* The Preview Backend: one emitter per Element type, returning HTML.
* Props arrive checked, coerced and with enum defaults filled in.
*/
const EMITTERS$1 = {
	Screen: (node, ctx) => {
		const c = CLASSES.Screen;
		const subtitle = node.props.subtitle;
		const actions = node.slots?.actions;
		const { sidebar, body } = screenParts(node);
		const main = lines(`<header class="${cx(c.header, actions && c.headerWithActions)}">`, `<h1 class="${c.title}">${esc(node.label)}</h1>`, subtitle !== void 0 && `<p class="${c.subtitle}">${esc(subtitle)}</p>`, actions && div(c.actions, ctx.render(actions)), `</header>`, div(c.body, ctx.render(body)));
		return lines(`<section data-screen="${esc(node.props.id)}" class="${sidebar ? c.shell : c.root}">`, sidebar ? lines(ctx.render([sidebar]), div(c.main, main)) : main, `</section>`);
	},
	Sidebar: (node, ctx) => {
		const c = CLASSES.Sidebar;
		return lines(`<aside class="${c.root}">`, `<nav class="${c.nav}">`, ctx.render(node.children), "</nav>", "</aside>");
	},
	/** A Link without to= goes nowhere yet: no href. */
	Link: (node, ctx) => {
		const { icon, to, active } = node.props;
		if (to !== void 0) ctx.script("to");
		return `<a${attrs({
			href: to === void 0 ? void 0 : screenHref$1(to),
			"aria-current": active && "page"
		})} class="${CLASSES.Link.root}">${icon === void 0 ? "" : iconSvg(icon, CLASSES.Link.icon)}${esc(node.label)}</a>`;
	},
	Heading: (node) => {
		const level = node.props.level;
		return `<h${level} class="${CLASSES.Heading[level]}">${esc(node.label)}</h${level}>`;
	},
	Text: (node, ctx) => {
		const c = CLASSES.Text;
		return `<p class="${cx(c[node.props.size], node.props.muted === true && c.muted, node.props.bold === true && c.bold)}">${esc(node.label ?? lorem(ctx.path, node.props.lorem))}</p>`;
	},
	Stat: (node) => {
		const c = CLASSES.Stat;
		const trend = node.props.trend;
		const title = node.props.title;
		const hint = statHint(node);
		return lines(`<div class="${c.root}">`, title !== void 0 && `<p class="${c.title}">${esc(title)}</p>`, `<div class="${c.value}">${esc(node.label)}</div>`, hint && `<p class="${c[trend]}">${esc(hint)}</p>`, `</div>`);
	},
	Badge: (node) => {
		const c = CLASSES.Badge;
		return `<span class="${cx(c.root, c[node.props.variant])}">${esc(node.label)}</span>`;
	},
	Avatar: (node) => {
		const c = CLASSES.Avatar;
		const size = c[node.props.size];
		return `<span role="img" aria-label="${esc(node.label)}" class="${cx(c.root, size)}">${esc(initials(node.label))}</span>`;
	},
	Image: (node) => {
		const alt = esc(node.label);
		const ratio = node.props.ratio.replace(":", " / ");
		return `<div role="img" aria-label="${alt}" class="${CLASSES.Image.root}" style="aspect-ratio: ${ratio}">${alt}</div>`;
	},
	Alert: (node) => {
		const c = CLASSES.Alert;
		const variant = node.props.variant;
		const text = node.props.text;
		return [
			`<div role="alert" class="${cx(c.root, c[variant])}">`,
			`<div class="${c.title}">${esc(node.label)}</div>`,
			text !== void 0 && `<div class="${c.text[variant]}">${esc(text)}</div>`,
			`</div>`
		].filter(Boolean).join("\n");
	},
	Progress: (node) => {
		const c = CLASSES.Progress;
		const value = node.props.value ?? 0;
		return `<div role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${value}" class="${c.root}"><div class="${c.indicator}" style="width: ${value}%"></div></div>`;
	},
	Stack: (node, ctx) => div(flexClasses(node), ctx.render(node.children)),
	Row: (node, ctx) => div(flexClasses(node), ctx.render(node.children)),
	/** Wraps each child with span=N in a cell spanning N columns, so no other emitter handles span. */
	Grid: (node, ctx) => {
		const cells = node.children.map((child) => {
			const span = spanClasses(child);
			return span ? div(span, ctx.render([child])) : ctx.render([child]);
		});
		return div(gridClasses(node), lines(...cells));
	},
	Separator: () => `<div role="none" class="${CLASSES.Separator.root}"></div>`,
	Card: (node, ctx) => {
		const c = CLASSES.Card;
		const desc = node.props.desc;
		const { actions, footer } = node.slots ?? {};
		const header = lines(node.label !== void 0 && `<div class="${c.title}">${esc(node.label)}</div>`, desc !== void 0 && `<div class="${c.desc}">${esc(desc)}</div>`, actions && div(cx(c.action, c.actions), ctx.render(actions)));
		return div(c.root, lines(header && div(cx(c.header, actions && c.headerWithActions), header), node.children.length > 0 && div(c.content, ctx.render(node.children)), footer && div(cx(c.footer, c.footerItems), ctx.render(footer))));
	},
	Table: (node, ctx) => {
		const c = CLASSES.Table;
		const row = (tag, cells) => `<tr class="${c.row}">${cells.map((s) => `<${tag} class="${tag === "th" ? c.head : c.cell}">${esc(s)}</${tag}>`).join("")}</tr>`;
		return [
			`<div class="${c.container}">`,
			`<table class="${c.table}">`,
			`<thead class="${c.header}">`,
			row("th", node.props.cols),
			"</thead>",
			`<tbody class="${c.body}">`,
			...tableRows(node, ctx.path).map((cells) => row("td", cells)),
			"</tbody>",
			"</table>",
			"</div>"
		].join("\n");
	},
	List: (node) => [
		`<ul class="${CLASSES.List.root}">`,
		...listItems(node).map((item) => `<li>${esc(item)}</li>`),
		"</ul>"
	].join("\n"),
	Dialog: (node, ctx) => dialog$1(node, ctx, CLASSES.Dialog, CLASSES.Dialog.content),
	Sheet: (node, ctx) => dialog$1(node, ctx, CLASSES.Sheet, cx(CLASSES.Sheet.content, CLASSES.Sheet[node.props.side])),
	/** Renders its Tabs too: triggers and panels pair up by position. */
	Tabs: (node, ctx) => {
		const c = CLASSES.Tabs;
		ctx.script("tabs");
		const active = (tab) => tab.props.active === true;
		return [
			`<div class="${c.root}">`,
			`<div role="tablist" class="${c.list}">`,
			...node.children.map((tab) => `<button type="button" role="tab" aria-selected="${active(tab)}" class="${c.trigger}">${esc(tab.label)}</button>`),
			`</div>`,
			...node.children.map((tab) => [
				`<div role="tabpanel" class="${c.panel}"${active(tab) ? "" : " hidden"}>`,
				ctx.render(tab.children),
				`</div>`
			].filter(Boolean).join("\n")),
			`</div>`
		].join("\n");
	},
	/** Its trigger is the Button markup (size md, no Behavior) and it renders its Items; SCRIPTS.dropdown opens it. */
	Menu: (node, ctx) => {
		const c = CLASSES.Menu;
		ctx.script("dropdown");
		const open = node.props.open === true;
		const dropdown = attrs({
			"aria-haspopup": "menu",
			"aria-expanded": String(open),
			"data-dropdown-trigger": true
		});
		const trigger = button({
			...node,
			props: {
				...node.props,
				size: "md"
			}
		}, ctx, dropdown);
		const items = node.children.map((item) => {
			const disabled = item.props.disabled === true;
			const look = cx(c.item, item.props.destructive === true ? c.destructive : c.default, disabled && c.disabled);
			return `<div role="menuitem"${attrs({ "aria-disabled": disabled && "true" })} class="${look}">${esc(item.label)}</div>`;
		});
		return [
			`<div data-dropdown>`,
			trigger,
			`<div role="menu"${attrs({ "aria-label": node.label })} data-dropdown-content class="${c.content}"${open ? "" : " hidden"}>`,
			...items,
			`</div>`,
			`</div>`
		].join("\n");
	},
	Button: (node, ctx) => button(node, ctx),
	Input: (node) => {
		const { type, placeholder, value, disabled, error } = node.props;
		const a = attrs({
			id: fieldId$1(node),
			type,
			placeholder,
			value,
			disabled,
			"aria-invalid": error !== void 0 && "true"
		});
		return field$1(node, `<input${a} class="${CLASSES.Input.control}">`, error);
	},
	Textarea: (node) => {
		const { placeholder, value = "", rows } = node.props;
		const a = attrs({
			id: fieldId$1(node),
			placeholder,
			rows
		});
		return field$1(node, `<textarea${a} class="${CLASSES.Textarea.control}">${esc(String(value))}</textarea>`);
	},
	Select: (node, ctx) => {
		const c = CLASSES.Select;
		ctx.script("dropdown");
		const { value, placeholder = "", open } = node.props;
		const options = node.props.options ?? [];
		const shown = value === void 0 ? `<span class="${c.placeholder}">${esc(placeholder)}</span>` : `<span>${esc(value)}</span>`;
		const trigger = `<button type="button" role="combobox"${attrs({
			id: fieldId$1(node),
			"aria-expanded": String(open === true)
		})} aria-haspopup="listbox" data-dropdown-trigger class="${c.trigger}">${shown}${iconSvg("chevron-down", c.chevron)}</button>`;
		const check = iconSvg("check", c.check);
		const items = options.map((option) => `<div role="option" aria-selected="${option === value}" class="${c.item}">${esc(option)}${check}</div>`);
		return field$1(node, [
			`<div data-dropdown>`,
			trigger,
			`<div role="listbox" data-dropdown-content class="${c.content}"${open === true ? "" : " hidden"}>`,
			...items,
			`</div>`,
			`</div>`
		].join("\n"));
	},
	Checkbox: (node) => {
		const { checked, disabled } = node.props;
		const control = `<input type="checkbox"${attrs({
			id: fieldId$1(node),
			checked,
			disabled
		})} class="${CLASSES.Checkbox.control}">`;
		return choice$1(fieldId$1(node), node.label, control);
	},
	Switch: (node) => {
		const c = CLASSES.Switch;
		const on = node.props.checked === true;
		const a = attrs({
			id: fieldId$1(node),
			"aria-checked": String(on),
			disabled: node.props.disabled
		});
		const thumb = `<span class="${cx(c.thumb, on ? c.thumbOn : c.thumbOff)}"></span>`;
		const control = `<button type="button" role="switch"${a} class="${cx(c.track, on ? c.trackOn : c.trackOff)}">${thumb}</button>`;
		return choice$1(fieldId$1(node), node.label, control);
	},
	Radio: (node) => {
		const group = fieldId$1(node);
		const items = (node.props.options ?? []).map((option, i) => {
			const a = attrs({
				id: `${group}-${i + 1}`,
				name: group,
				value: option,
				checked: option === node.props.value
			});
			return choice$1(`${group}-${i + 1}`, option, `<input type="radio"${a} class="${CLASSES.Radio.control}">`);
		});
		return [
			`<div class="${CLASSES.Field.root}">`,
			`<span id="${group}" class="${CLASSES.Field.label}">${esc(node.label)}</span>`,
			`<div role="radiogroup" aria-labelledby="${group}" class="${CLASSES.Radio.group}">`,
			...items,
			`</div>`,
			`</div>`
		].join("\n");
	}
};
/**
* Dialog and Sheet: a backdrop and a panel, hidden until a Button's opens= shows them, or shown on load with `open`.
* The close button, the backdrop and footer Buttons without Behavior carry data-dialog-close (SCRIPTS.dialog).
*/
function dialog$1(node, ctx, c, panel) {
	ctx.script("dialog");
	const b = CLASSES.Button;
	const desc = node.props.desc;
	const title = `dialog-${node.line}`;
	const footer = node.slots?.footer?.map((n) => {
		return n.type === "Button" && !hasBehavior(n) ? `<div data-dialog-close class="contents">${ctx.render([n])}</div>` : ctx.render([n]);
	});
	return lines(`<div${attrs({
		"data-dialog": node.props.id ?? "",
		hidden: node.props.open !== true
	})}>`, `<div data-dialog-close class="${c.backdrop}"></div>`, `<div role="dialog" aria-modal="true" aria-labelledby="${title}" class="${panel}">`, div(c.header, lines(`<h2 id="${title}" class="${c.title}">${esc(node.label)}</h2>`, desc !== void 0 && `<p class="${c.desc}">${esc(desc)}</p>`)), node.children.length > 0 && div(c.body, ctx.render(node.children)), footer && div(c.footer, lines(...footer)), `<button type="button" data-dialog-close class="${cx(b.base, b.variant.ghost, b.iconSize.sm, c.close)}">${iconSvg("x")}<span class="${b.hiddenLabel}">Close</span></button>`, "</div>", "</div>");
}
/** A Button: a <button>, or a link styled as one with to=. `trigger` adds attributes to the <button>, for Menu's. */
function button(node, ctx, trigger = "") {
	const c = CLASSES.Button;
	const { variant, size, icon } = node.props;
	const iconOnly = node.props["icon-only"] === true;
	const loading = node.props.loading === true;
	const glyph = loading ? iconSvg("loader-circle", cx("size-4", c.spinner)) : icon !== void 0 ? iconSvg(icon) : "";
	const label = iconOnly ? `<span class="${c.hiddenLabel}">${esc(node.label)}</span>` : esc(node.label);
	const disabled = node.props.disabled === true || loading;
	const classes = cx(c.base, c.variant[variant], (iconOnly ? c.iconSize : c.size)[size]);
	const to = disabled ? void 0 : node.props.to;
	if (to !== void 0) {
		ctx.script("to");
		return `<a href="${esc(screenHref$1(to))}" class="${classes}">${glyph}${label}</a>`;
	}
	const opens = attrs({
		"data-opens": node.props.opens,
		"aria-haspopup": node.props.opens && "dialog"
	});
	return `<button type="button"${trigger} class="${classes}"${attrs({ disabled })}${opens}>${glyph}${label}</button>`;
}
/** A `<div>` holding `body`, which may be empty. */
const div = (classes, body) => lines(`<div class="${classes}">`, body, "</div>");
// src/preview/script.ts
/**
* The Preview's JS: one click handler per built-in interaction or Behavior, inlined in one <script>.
* An emitter asks for its handler with `ctx.script(name)`; a page carries only the handlers it uses, in this order.
* Handlers toggle attributes (aria-selected, hidden) or classes that appear literally in src/, so Tailwind builds them.
*/
const SCRIPTS = {
	tabs: `// Tabs: a click on a Tab selects it and shows the panel at the same position.
document.addEventListener("click", (event) => {
  const tab = event.target instanceof Element && event.target.closest('[role="tab"]');
  if (!tab) return;
  const panels = tab.parentElement.parentElement.querySelectorAll(':scope > [role="tabpanel"]');
  [...tab.parentElement.children].forEach((t, i) => {
    t.setAttribute("aria-selected", String(t === tab));
    panels[i].hidden = t !== tab;
  });
});`,
	dropdown: `// Dropdowns (Select, Menu): a [data-dropdown] holds a [data-dropdown-trigger] and a [data-dropdown-content].
// A click on a trigger toggles its dropdown; any other click closes every open dropdown.
// Picking a [role="option"] in a dropdown also shows it on the trigger.
// An open dropdown that would cross the window's right edge shifts left to fit, like shadcn's.
const fitDropdown = (content) => {
  content.style.translate = "";
  const overflow = content.getBoundingClientRect().right + 8 - document.documentElement.clientWidth;
  if (overflow > 0) content.style.translate = -overflow + "px";
};
document.querySelectorAll("[data-dropdown-content]:not([hidden])").forEach(fitDropdown);
document.addEventListener("click", (event) => {
  const target = event.target instanceof Element ? event.target : null;
  const dropdown = target && target.closest("[data-dropdown]");
  const toggled = dropdown && target.closest("[data-dropdown-trigger]") ? dropdown : null;
  const option = dropdown && target.closest('[role="option"]');
  if (option) {
    const shown = dropdown.querySelector("[data-dropdown-trigger] > span");
    shown.textContent = option.textContent;
    shown.removeAttribute("class");
    for (const o of dropdown.querySelectorAll('[role="option"]')) o.setAttribute("aria-selected", String(o === option));
  }
  for (const p of document.querySelectorAll("[data-dropdown]")) {
    const content = p.querySelector("[data-dropdown-content]");
    const open = p === toggled && content.hidden;
    content.hidden = !open;
    if (open) fitDropdown(content);
    p.querySelector("[data-dropdown-trigger]").setAttribute("aria-expanded", String(open));
  }
});
// Escape closes the open dropdowns, and only them: a Dialog under a dropdown stays open.
document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  const open = [...document.querySelectorAll("[data-dropdown-content]")].filter((c) => c.checkVisibility());
  for (const content of open) {
    content.hidden = true;
    content.closest("[data-dropdown]").querySelector("[data-dropdown-trigger]").setAttribute("aria-expanded", "false");
  }
  if (open.length) event.stopImmediatePropagation();
});`,
	dialog: `// Dialogs and Sheets: a [data-opens] Button shows the [data-dialog] with that id;
// a click on a [data-dialog-close] (close button, backdrop, footer Button without Behavior) hides its Dialog or Sheet.
document.addEventListener("click", (event) => {
  const target = event.target instanceof Element ? event.target : null;
  const opener = target && target.closest("[data-opens]");
  if (opener) {
    for (const o of document.querySelectorAll("[data-dialog]")) if (o.dataset.dialog === opener.dataset.opens) o.hidden = false;
    return;
  }
  const closer = target && target.closest("[data-dialog-close]");
  if (closer) closer.closest("[data-dialog]").hidden = true;
});
// Escape closes the topmost shown Dialog or Sheet (the last in the page).
document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  const top = [...document.querySelectorAll("[data-dialog]")].filter((o) => o.checkVisibility()).pop();
  if (top) top.hidden = true;
});`,
	to: `// Screens (to=): one shows at a time. A to= is a link to #<screen id>; the hash picks the Screen,
// so the back button works and a preview --watch reload stays on it. No hash: the first Screen.
const showScreen = () => {
  const screens = [...document.querySelectorAll("[data-screen]")];
  const id = decodeURIComponent(location.hash.slice(1));
  const shown = screens.find((s) => s.dataset.screen === id) || screens[0];
  for (const s of screens) s.hidden = s !== shown;
};
// A Screen shows as it loads, like a remounted page: Dialogs and Sheets opened since close, those flagged open show again.
const dialogs = [...document.querySelectorAll("[data-dialog]")].map((o) => [o, o.hidden]);
addEventListener("hashchange", () => {
  for (const [o, hidden] of dialogs) o.hidden = hidden;
  showScreen();
  scrollTo(0, 0);
});
showScreen();`
};
// src/preview/page.ts
/** The Preview: one self-contained HTML page holding every Screen. No network: CSS and JS are inlined. */
function renderPreview(document) {
	const scripts = /* @__PURE__ */ new Set();
	const paths = nodePaths(document);
	const ctx = (node) => ({
		path: paths.get(node),
		render: (nodes) => render(nodes, ctx),
		script: (name) => scripts.add(name)
	});
	const body = document.screens.map((screen) => render([screen], ctx)).map((html, i) => i > 0 && scripts.has("to") ? html.replace(/^<section/, "<section hidden") : html).join("\n");
	const handlers = Object.keys(SCRIPTS).filter((name) => scripts.has(name)).map((name) => SCRIPTS[name]);
	return [
		"<!doctype html>",
		"<html lang=\"en\">",
		"<head>",
		"<meta charset=\"utf-8\">",
		"<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">",
		`<title>${esc(document.screens[0].label)}</title>`,
		`<style>${readAsset("assets/preview.css")}</style>`,
		"</head>",
		"<body>",
		body,
		...handlers.length ? [
			"<script>",
			...handlers,
			"<\/script>"
		] : [],
		"</body>",
		"</html>",
		""
	].join("\n");
}
function render(nodes, ctx) {
	return nodes.map((node) => emitterFor(EMITTERS$1, node.type, "Preview")(node, ctx(node))).join("\n");
}
// src/preview/watch.ts
const EVENTS = "/__skizo/events";
/** Served pages only: the written Preview must make no requests. */
const RELOAD = `<script>new EventSource("${EVENTS}").onmessage=()=>location.reload()<\/script>`;
/**
* `preview --watch`: serves `html` on localhost and swaps in `rebuild()` whenever `source` is saved,
* until `io.signal` aborts (Ctrl-C); then it closes everything and resolves 0. A watch the OS fails resolves 1.
* `rebuild` returns the new Preview, or an exit code once it has printed why there is none.
*/
async function watchPreview(source, html, rebuild, io) {
	const pages = /* @__PURE__ */ new Set();
	let last = readFileSync(source, "utf8");
	const changed = () => {
		let text;
		try {
			text = readFileSync(source, "utf8");
		} catch (e) {
			const code = e.code;
			if (code !== "ENOENT") io.stderr(`skizo preview: cannot read ${relative(io.cwd, source)} (${code ?? e.message})\n`);
			return;
		}
		if (text === last) return;
		last = text;
		const next = rebuild();
		if (typeof next !== "string") return;
		html = next;
		for (const page of pages) page.write("data: reload\n\n");
	};
	let timer;
	const watcher = watch(dirname(source), (_event, name) => {
		if (name && name !== basename(source)) return;
		clearTimeout(timer);
		timer = setTimeout(changed, 50);
	});
	let hosts = [];
	const server = createServer((req, res) => {
		if (!hosts.includes(req.headers.host ?? "")) {
			res.writeHead(403).end();
			return;
		}
		if (req.url === EVENTS) {
			res.writeHead(200, {
				"content-type": "text/event-stream",
				"cache-control": "no-cache"
			});
			res.write(": connected\n\n");
			pages.add(res);
			req.on("close", () => pages.delete(res));
			return;
		}
		res.writeHead(200, {
			"content-type": "text/html; charset=utf-8",
			"cache-control": "no-store"
		});
		res.end(html.replace("</body>", `${RELOAD}\n</body>`));
	});
	await new Promise((listening) => server.listen(0, "127.0.0.1", listening));
	const { port } = server.address();
	hosts = [`127.0.0.1:${port}`, `localhost:${port}`];
	io.stdout(`Preview: http://127.0.0.1:${port}/\n`);
	const failed = await new Promise((stop) => {
		watcher.on("error", stop);
		if (io.signal?.aborted) stop(void 0);
		io.signal?.addEventListener("abort", () => stop(void 0), { once: true });
	});
	watcher.close();
	clearTimeout(timer);
	server.closeAllConnections();
	await new Promise((closed) => server.close(closed));
	if (!failed) return 0;
	io.stderr(`skizo preview: stopped watching ${relative(io.cwd, source)} (${failed.message})\n`);
	return 1;
}
// src/shadcn/elements.ts
/** Text as JSX children: verbatim, or as a string expression when it holds characters JSX reads as markup. */
const text = (s) => /[{}<>&]/.test(s) ? `{${JSON.stringify(s)}}` : s;
/** A string as a JSX attribute value: quoted, or a string expression when it holds `"` or `&`. */
const attr = (s) => /["&]/.test(s) ? `{${JSON.stringify(s)}}` : `"${s}"`;
/** `start`, then `body` indented two spaces, then `end`; one line when `body` is empty. */
const wrap = (start, body, end) => body ? `${start}\n${body.replace(/^/gm, "  ")}\n${end}` : `${start}${end}`;
/** JSX attributes from name → value: strings through `attr`, numbers in braces, true bare; undefined and false skipped. */
const jsxAttrs = (pairs) => Object.entries(pairs).map(([name, v]) => v === void 0 || v === false ? "" : v === true ? ` ${name}` : typeof v === "number" ? ` ${name}={${v}}` : ` ${name}=${attr(String(v))}`).join("");
/** A form control under its Label, with error text below. `id` ties the Label to the control. */
const field = (node, ctx, id, control, error) => {
	ctx.use("@/components/ui/label", "Label");
	return wrap(`<div className="${CLASSES.Field.root}">`, lines(`<Label${jsxAttrs({ htmlFor: id })}>${text(node.label)}</Label>`, control, typeof error === "string" && `<p className="${CLASSES.Field.error}">${text(error)}</p>`), "</div>");
};
/** A small control (Checkbox, Switch, RadioGroupItem) with its Label beside it. */
const choice = (ctx, id, label, control) => {
	ctx.use("@/components/ui/label", "Label");
	return wrap(`<div className="${CLASSES.Field.choice}">`, lines(control, `<Label${jsxAttrs({ htmlFor: id })}>${text(label)}</Label>`), "</div>");
};
/** A readable DOM id for a form control: its `id=`, else a slug of its Label. */
const fieldId = (node, ctx) => ctx.id(typeof node.props.id === "string" ? node.props.id : slugify(node.label) || "field");
/** `<HouseIcon />` for `icon=home`, importing it from lucide-react. */
const icon = (ctx, name, className) => {
	const component = iconComponent(name);
	ctx.use("lucide-react", component);
	return `<${component}${className ? ` className="${className}"` : ""} />`;
};
/** Where `to=` goes: the Screen's route. A plain path, so swapping in a router's link component is left to the user. */
const screenHref = (id) => `/${id}`;
/**
* The useState pair behind opens=, named after the id of the Dialog or Sheet: `new-order` → ["newOrderOpen", "setNewOrderOpen"].
* ponytail: ids that differ only in punctuation (new-order, new_order) collide; dedupe per Screen if it bites.
*/
const openState = (id) => {
	const name = pascalCase(id, "Overlay");
	return [`${name[0].toLowerCase()}${name.slice(1)}Open`, `set${name}Open`];
};
/** Dialog and Sheet: Content > Header(Title, Description) + body + Footer, with useState when an id lets opens= show it. */
function dialog(node, ctx, kind, content) {
	/** Imports a part and returns its name. */
	const ui = (part) => (ctx.use(`@/components/ui/${kind.toLowerCase()}`, `${kind}${part}`), `${kind}${part}`);
	const id = node.props.id;
	const desc = node.props.desc;
	let state = jsxAttrs({ defaultOpen: node.props.open === true });
	if (id !== void 0) {
		const [value, set] = openState(id);
		ctx.use("react", "useState");
		ctx.hook(`const [${value}, ${set}] = useState(${node.props.open === true})`);
		state = ` open={${value}} onOpenChange={${set}}`;
	}
	const footer = node.slots?.footer?.map((n) => n.type === "Button" && !hasBehavior(n) ? wrap(`<${ui("Close")} asChild>`, ctx.render([n]), `</${kind}Close>`) : ctx.render([n]));
	ctx.use(`@/components/ui/${kind.toLowerCase()}`, kind);
	return wrap(`<${kind}${state}>`, wrap(`<${ui("Content")}${content}${desc === void 0 ? " aria-describedby={undefined}" : ""}>`, lines(wrap(`<${ui("Header")}>`, lines(`<${ui("Title")}>${text(node.label)}</${kind}Title>`, desc !== void 0 && `<${ui("Description")}>${text(desc)}</${kind}Description>`), `</${kind}Header>`), node.children.length > 0 && wrap(`<div className="${CLASSES[kind].body}">`, ctx.render(node.children), "</div>"), footer && wrap(`<${ui("Footer")}>`, lines(...footer), `</${kind}Footer>`)), `</${kind}Content>`), `</${kind}>`);
}
/** Skizo `size` → shadcn Button `size`, for text Buttons and for icon-only ones. md is shadcn's default. */
const BUTTON_SIZE = {
	sm: "sm",
	md: void 0,
	lg: "lg"
};
const ICON_BUTTON_SIZE = {
	sm: "icon-sm",
	md: "icon",
	lg: "icon-lg"
};
/**
* The shadcn Export target: one emitter per Element type, returning TSX.
* Props arrive checked, coerced and with enum defaults filled in.
*/
const EMITTERS = {
	/** With a Sidebar first: a page shell, the sidebar column beside <main>. */
	Screen: (node, ctx) => {
		const c = CLASSES.Screen;
		const subtitle = node.props.subtitle;
		const actions = node.slots?.actions;
		const { sidebar, body } = screenParts(node);
		const header = lines(`<h1 className="${c.title}">${text(node.label)}</h1>`, subtitle !== void 0 && `<p className="${c.subtitle}">${text(subtitle)}</p>`, actions && wrap(`<div className="${c.actions}">`, ctx.render(actions), "</div>"));
		const main = wrap(`<main className="${sidebar ? c.main : c.root}">`, lines(wrap(`<header className="${cx(c.header, actions && c.headerWithActions)}">`, header, "</header>"), wrap(`<div className="${c.body}">`, ctx.render(body), "</div>")), "</main>");
		return sidebar ? wrap(`<div className="${c.shell}">`, lines(ctx.render([sidebar]), main), "</div>") : main;
	},
	Sidebar: (node, ctx) => {
		const c = CLASSES.Sidebar;
		return wrap(`<aside className="${c.root}">`, wrap(`<nav className="${c.nav}">`, ctx.render(node.children), "</nav>"), "</aside>");
	},
	/** A plain anchor, like every to=; a Link without to= goes nowhere yet: no href. */
	Link: (node, ctx) => {
		const { to, active } = node.props;
		const href = to === void 0 ? void 0 : screenHref(to);
		const tag = `<a${jsxAttrs({
			href,
			"aria-current": active && "page"
		})} className="${CLASSES.Link.root}">`;
		if (node.props.icon === void 0) return `${tag}${text(node.label)}</a>`;
		return wrap(tag, lines(icon(ctx, node.props.icon, CLASSES.Link.icon), text(node.label)), "</a>");
	},
	Heading: (node) => {
		const level = node.props.level;
		return `<h${level} className="${CLASSES.Heading[level]}">${text(node.label)}</h${level}>`;
	},
	Text: (node, ctx) => {
		const c = CLASSES.Text;
		return `<p className="${cx(c[node.props.size], node.props.muted === true && c.muted, node.props.bold === true && c.bold)}">${text(node.label ?? lorem(ctx.path, node.props.lorem))}</p>`;
	},
	Stat: (node) => {
		const c = CLASSES.Stat;
		const trend = node.props.trend;
		const title = node.props.title;
		const hint = statHint(node);
		return wrap(`<div className="${c.root}">`, lines(title !== void 0 && `<p className="${c.title}">${text(title)}</p>`, `<div className="${c.value}">${text(node.label)}</div>`, hint && `<p className="${c[trend]}">${text(hint)}</p>`), "</div>");
	},
	Badge: (node, ctx) => {
		ctx.use("@/components/ui/badge", "Badge");
		return `<Badge${node.props.variant === "default" ? "" : ` variant="${node.props.variant}"`}>${text(node.label)}</Badge>`;
	},
	Avatar: (node, ctx) => {
		ctx.use("@/components/ui/avatar", "Avatar", "AvatarFallback");
		const size = node.props.size === "md" ? "" : ` size="${node.props.size}"`;
		return wrap(`<Avatar${size} role="img" aria-label=${attr(node.label)}>`, `<AvatarFallback>${text(initials(node.label))}</AvatarFallback>`, "</Avatar>");
	},
	Image: (node) => {
		const style = `style={{ aspectRatio: "${node.props.ratio.replace(":", " / ")}" }}`;
		return `<div role="img" aria-label=${attr(node.label)} className="${CLASSES.Image.root}" ${style}>${text(node.label)}</div>`;
	},
	Alert: (node, ctx) => {
		const description = node.props.text;
		ctx.use("@/components/ui/alert", "Alert", "AlertTitle", ...description === void 0 ? [] : ["AlertDescription"]);
		const variant = node.props.variant === "default" ? "" : ` variant="${node.props.variant}"`;
		return wrap(`<Alert${variant}>`, lines(`<AlertTitle>${text(node.label)}</AlertTitle>`, description !== void 0 && `<AlertDescription>${text(description)}</AlertDescription>`), "</Alert>");
	},
	Progress: (node, ctx) => {
		ctx.use("@/components/ui/progress", "Progress");
		return `<Progress${node.props.value === void 0 ? "" : ` value={${node.props.value}}`} />`;
	},
	Stack: (node, ctx) => wrap(`<div className="${flexClasses(node)}">`, ctx.render(node.children), "</div>"),
	Row: (node, ctx) => wrap(`<div className="${flexClasses(node)}">`, ctx.render(node.children), "</div>"),
	/** Wraps each child with span=N in a cell spanning N columns, so no other emitter handles span. */
	Grid: (node, ctx) => {
		const cells = node.children.map((child) => {
			const span = spanClasses(child);
			return span ? wrap(`<div className="${span}">`, ctx.render([child]), "</div>") : ctx.render([child]);
		});
		return wrap(`<div className="${gridClasses(node)}">`, lines(...cells), "</div>");
	},
	Separator: (_node, ctx) => {
		ctx.use("@/components/ui/separator", "Separator");
		return "<Separator />";
	},
	Card: (node, ctx) => {
		const c = CLASSES.Card;
		/** Imports a Card part and returns its name, so each part is imported only when emitted. */
		const ui = (name) => (ctx.use("@/components/ui/card", name), name);
		const desc = node.props.desc;
		const { actions, footer } = node.slots ?? {};
		const header = lines(node.label !== void 0 && `<${ui("CardTitle")}>${text(node.label)}</CardTitle>`, desc !== void 0 && `<${ui("CardDescription")}>${text(desc)}</CardDescription>`, actions && wrap(`<${ui("CardAction")} className="${c.actions}">`, ctx.render(actions), "</CardAction>"));
		return wrap(`<${ui("Card")}>`, lines(header && wrap(`<${ui("CardHeader")}>`, header, "</CardHeader>"), node.children.length > 0 && wrap(`<${ui("CardContent")}>`, ctx.render(node.children), "</CardContent>"), footer && wrap(`<${ui("CardFooter")} className="${c.footerItems}">`, ctx.render(footer), "</CardFooter>")), "</Card>");
	},
	Table: (node, ctx) => {
		ctx.use("@/components/ui/table", "Table", "TableBody", "TableCell", "TableHead", "TableHeader", "TableRow");
		const row = (tag, cells) => wrap("<TableRow>", lines(...cells.map((s) => `<${tag}>${text(s)}</${tag}>`)), "</TableRow>");
		return wrap("<Table>", lines(wrap("<TableHeader>", row("TableHead", node.props.cols), "</TableHeader>"), wrap("<TableBody>", lines(...tableRows(node, ctx.path).map((cells) => row("TableCell", cells))), "</TableBody>")), "</Table>");
	},
	List: (node) => wrap(`<ul className="${CLASSES.List.root}">`, lines(...listItems(node).map((item) => `<li>${text(item)}</li>`)), "</ul>"),
	Dialog: (node, ctx) => dialog(node, ctx, "Dialog", ""),
	Sheet: (node, ctx) => dialog(node, ctx, "Sheet", node.props.side === "right" ? "" : ` side="${node.props.side}"`),
	/** Renders its Tabs too: each value pairs a TabsTrigger with its TabsContent. */
	Tabs: (node, ctx) => {
		ctx.use("@/components/ui/tabs", "Tabs", "TabsContent", "TabsList", "TabsTrigger");
		const tabs = node.children;
		const slugs = tabs.map((tab) => slugify(tab.label));
		const values = slugs.every(Boolean) && new Set(slugs).size === slugs.length ? slugs : slugs.map((_, i) => `tab-${i + 1}`);
		const active = values[tabs.findIndex((tab) => tab.props.active === true)];
		const triggers = tabs.map((tab, i) => `<TabsTrigger value="${values[i]}">${text(tab.label)}</TabsTrigger>`);
		return wrap(`<Tabs${active === void 0 ? "" : ` defaultValue="${active}"`}>`, lines(wrap("<TabsList>", lines(...triggers), "</TabsList>"), ...tabs.map((tab, i) => wrap(`<TabsContent value="${values[i]}" className="${CLASSES.Tabs.panel}">`, ctx.render(tab.children), "</TabsContent>"))), "</Tabs>");
	},
	/** Its trigger is the Button emitter's output (size md, no Behavior) under asChild; it renders its Items. */
	Menu: (node, ctx) => {
		ctx.use("@/components/ui/dropdown-menu", "DropdownMenu", "DropdownMenuContent", "DropdownMenuItem", "DropdownMenuTrigger");
		const trigger = EMITTERS.Button({
			...node,
			props: {
				...node.props,
				size: "md"
			}
		}, ctx);
		const items = node.children.map((item) => {
			return `<DropdownMenuItem${jsxAttrs({
				variant: item.props.destructive === true && "destructive",
				disabled: item.props.disabled
			})}>${text(item.label)}</DropdownMenuItem>`;
		});
		return wrap(`<DropdownMenu${jsxAttrs({ defaultOpen: node.props.open })}>`, lines(wrap("<DropdownMenuTrigger asChild>", trigger, "</DropdownMenuTrigger>"), wrap("<DropdownMenuContent>", lines(...items), "</DropdownMenuContent>")), "</DropdownMenu>");
	},
	Button: (node, ctx) => {
		const c = CLASSES.Button;
		const { variant, size } = node.props;
		const iconOnly = node.props["icon-only"] === true;
		const loading = node.props.loading === true;
		const shadcnSize = (iconOnly ? ICON_BUTTON_SIZE : BUTTON_SIZE)[size];
		const disabled = node.props.disabled === true || loading;
		const to = disabled ? void 0 : node.props.to;
		const opens = node.props.opens === void 0 ? "" : ` onClick={() => ${openState(node.props.opens)[1]}(true)}`;
		const tag = `<Button${jsxAttrs({
			variant: variant !== "default" && variant,
			size: shadcnSize,
			disabled,
			asChild: to !== void 0
		})}${opens}>`;
		ctx.use("@/components/ui/button", "Button");
		const glyph = loading ? icon(ctx, "loader-circle", c.spinner) : node.props.icon !== void 0 && icon(ctx, node.props.icon);
		const label = iconOnly ? `<span className="${c.hiddenLabel}">${text(node.label)}</span>` : text(node.label);
		const content = glyph ? lines(glyph, label) : label;
		if (to !== void 0) {
			const anchor = `<a href=${attr(screenHref(to))}>`;
			return wrap(tag, glyph ? wrap(anchor, content, "</a>") : `${anchor}${content}</a>`, "</Button>");
		}
		return glyph ? wrap(tag, content, "</Button>") : `${tag}${content}</Button>`;
	},
	Input: (node, ctx) => {
		const { type, placeholder, value, disabled, error } = node.props;
		const id = fieldId(node, ctx);
		ctx.use("@/components/ui/input", "Input");
		const a = jsxAttrs({
			id,
			type,
			placeholder,
			defaultValue: value,
			disabled,
			"aria-invalid": error !== void 0
		});
		return field(node, ctx, id, `<Input${a} />`, error);
	},
	Textarea: (node, ctx) => {
		const { placeholder, value, rows } = node.props;
		const id = fieldId(node, ctx);
		ctx.use("@/components/ui/textarea", "Textarea");
		return field(node, ctx, id, `<Textarea${jsxAttrs({
			id,
			placeholder,
			defaultValue: value,
			rows
		})} />`);
	},
	Select: (node, ctx) => {
		const { value, placeholder, open } = node.props;
		const id = fieldId(node, ctx);
		ctx.use("@/components/ui/select", "Select", "SelectContent", "SelectItem", "SelectTrigger", "SelectValue");
		const items = (node.props.options ?? []).map((option) => `<SelectItem${jsxAttrs({ value: option })}>${text(option)}</SelectItem>`);
		const select = wrap(`<Select${jsxAttrs({
			defaultValue: value,
			defaultOpen: open
		})}>`, lines(wrap(`<SelectTrigger${jsxAttrs({ id })}>`, `<SelectValue${jsxAttrs({ placeholder })} />`, "</SelectTrigger>"), wrap("<SelectContent>", lines(...items), "</SelectContent>")), "</Select>");
		return field(node, ctx, id, select);
	},
	Checkbox: (node, ctx) => {
		const id = fieldId(node, ctx);
		ctx.use("@/components/ui/checkbox", "Checkbox");
		const { checked, disabled } = node.props;
		return choice(ctx, id, node.label, `<Checkbox${jsxAttrs({
			id,
			defaultChecked: checked,
			disabled
		})} />`);
	},
	Switch: (node, ctx) => {
		const id = fieldId(node, ctx);
		ctx.use("@/components/ui/switch", "Switch");
		const { checked, disabled } = node.props;
		return choice(ctx, id, node.label, `<Switch${jsxAttrs({
			id,
			defaultChecked: checked,
			disabled
		})} />`);
	},
	Radio: (node, ctx) => {
		const group = fieldId(node, ctx);
		ctx.use("@/components/ui/label", "Label");
		ctx.use("@/components/ui/radio-group", "RadioGroup", "RadioGroupItem");
		const items = (node.props.options ?? []).map((option) => {
			const id = ctx.id(`${group}-${slugify(option) || "option"}`);
			return choice(ctx, id, option, `<RadioGroupItem${jsxAttrs({
				value: option,
				id
			})} />`);
		});
		const radios = wrap(`<RadioGroup${jsxAttrs({
			"aria-labelledby": group,
			defaultValue: node.props.value
		})}>`, lines(...items), "</RadioGroup>");
		return wrap(`<div className="${CLASSES.Field.root}">`, lines(`<Label${jsxAttrs({ id: group })}>${text(node.label)}</Label>`, radios), "</div>");
	}
};
// src/shadcn/export.ts
/** The shadcn Export target: file name → TSX, one file per Screen, named after its id. */
function exportShadcn(document) {
	const paths = nodePaths(document);
	return Object.fromEntries(document.screens.map((screen) => [`${screen.props.id}.tsx`, screenFile(screen, paths)]));
}
/** `order-details` → `OrderDetailsScreen`; `2026-report` → `Screen2026ReportScreen` (no identifier starts with a digit). */
const componentName = (id) => `${pascalCase(id, "Screen")}Screen`;
function screenFile(screen, paths) {
	const imports = /* @__PURE__ */ new Map();
	const use = (from, ...names) => {
		const set = imports.get(from) ?? /* @__PURE__ */ new Set();
		for (const name of names) set.add(name);
		imports.set(from, set);
	};
	const ids = /* @__PURE__ */ new Map();
	const id = (base) => {
		const n = (ids.get(base) ?? 0) + 1;
		ids.set(base, n);
		return n === 1 ? base : `${base}-${n}`;
	};
	const hooks = [];
	const hook = (line) => hooks.push(line);
	const ctx = (node) => ({
		path: paths.get(node),
		use,
		id,
		hook,
		render: (nodes) => nodes.map((n) => emitterFor(EMITTERS, n.type, "shadcn export")(n, ctx(n))).join("\n")
	});
	const jsx = ctx(screen).render([screen]);
	const head = [...imports.keys()].sort().map((from) => `import { ${[...imports.get(from)].sort().join(", ")} } from "${from}"\n`);
	const body = wrap(`export function ${componentName(screen.props.id)}() {`, lines(...hooks, wrap("return (", jsx, ")")), "}");
	return `${head.join("")}${head.length ? "\n" : ""}${body}\n`;
}
// src/run.ts
/** Export targets by `--target` name. Each turns a checked document into files: name → content. */
const TARGETS = /* @__PURE__ */ new Map([["shadcn", exportShadcn]]);
/** One entry per CLI command. Each takes one source file (unless noFile) plus its own options. */
const COMMANDS = {
	guide: {
		noFile: true,
		run(_file, _flags, io) {
			io.stdout(readAsset("GUIDE.md"));
			return 0;
		}
	},
	check: {
		options: { json: { type: "boolean" } },
		run(file, flags, io) {
			const result = load(file, io);
			if (!result) return 2;
			const { errors } = result;
			if (flags.json) io.stdout(`${JSON.stringify({ errors: errors.map((e) => ({
				file,
				...e
			})) }, null, 2)}\n`);
			else io.stdout(errors.length ? errorLines(file, errors) : `${file}: ok\n`);
			return errors.length ? 1 : 0;
		}
	},
	preview: {
		options: { watch: { type: "boolean" } },
		run(file, flags, io) {
			const out = `${file.replace(/\.skz$/, "")}.html`;
			const build = () => {
				const document = loadChecked(file, io);
				if (typeof document === "number") return document;
				const html = renderPreview(document);
				writeFileSync(resolve(io.cwd, out), html);
				io.stdout(`wrote ${out}\n`);
				return html;
			};
			const html = build();
			if (typeof html === "number") return html;
			return flags.watch ? watchPreview(resolve(io.cwd, file), html, build, io) : 0;
		}
	},
	export: {
		options: {
			target: { type: "string" },
			out: { type: "string" }
		},
		run(file, flags, io) {
			const target = flags.target;
			const exportTarget = TARGETS.get(target ?? "");
			if (!exportTarget) {
				const problem = target === void 0 ? "--target is required" : `unknown target "${target}"${didYouMean(target, TARGETS.keys())}`;
				io.stderr(`skizo export: ${problem} (expected: ${[...TARGETS.keys()].join(", ")})\n`);
				return 2;
			}
			const document = loadChecked(file, io);
			if (typeof document === "number") return document;
			const files = exportTarget(document);
			const unsafe = Object.keys(files).find((name) => basename(name) !== name);
			if (unsafe) {
				io.stderr(`skizo export: "${unsafe}" is not a plain file name (check the Screen id)\n`);
				return 1;
			}
			const out = flags.out ?? dirname(file);
			mkdirSync(resolve(io.cwd, out), { recursive: true });
			for (const [name, content] of Object.entries(files)) {
				writeFileSync(resolve(io.cwd, out, name), content);
				io.stdout(`wrote ${join(out, name)}\n`);
			}
			return 0;
		}
	}
};
const USAGE = `Usage: skizo <command>   (alias: skz)

  skizo guide                                          print the Guide to the Skizo language
  skizo check   <file.skz> [--json]                    report every error in a file
  skizo preview <file.skz> [--watch]                   write <file>.html; --watch serves it with live reload
  skizo export  <file.skz> --target shadcn [--out dir] write one React file per Screen

Agents: run \`skizo guide\` before writing Skizo.
`;
/** The whole CLI. Never touches process: argv in, exit code out, file paths resolved against io.cwd. */
async function run(argv, io) {
	const [name = "", ...rest] = argv;
	if (name === "--help" || name === "-h") {
		io.stdout(USAGE);
		return 0;
	}
	if (!name) {
		io.stderr(USAGE);
		return 2;
	}
	const command = Object.hasOwn(COMMANDS, name) ? COMMANDS[name] : void 0;
	if (!command) {
		io.stderr(`skizo: unknown command "${name}"${didYouMean(name, Object.keys(COMMANDS))}\n`);
		return 2;
	}
	let args;
	try {
		args = parseArgs({
			args: rest,
			options: command.options ?? {},
			allowPositionals: true
		});
	} catch (e) {
		io.stderr(`skizo ${name}: ${e.message}\n`);
		return 2;
	}
	const [file = "", ...extra] = args.positionals;
	if (command.noFile ? args.positionals.length : !file || extra.length) {
		io.stderr(`skizo ${name}: ${command.noFile ? "takes no arguments" : "expected one <file.skz>"}\n`);
		return 2;
	}
	return command.run(file, args.values, io);
}
function load(file, io) {
	let source;
	try {
		source = readFileSync(resolve(io.cwd, file), "utf8");
	} catch (e) {
		io.stderr(`skizo: cannot read ${file} (${e.code ?? e.message})\n`);
		return;
	}
	return check(source, { iconNames: iconNames() });
}
/**
* For Backends: the checked document, or the exit code after printing why there is none.
* A file that fails check gets the same error lines as `skizo check`, on stderr.
*/
function loadChecked(file, io) {
	const result = load(file, io);
	if (!result) return 2;
	if (!result.errors.length) return result.document;
	io.stderr(errorLines(file, result.errors));
	return 1;
}
const errorLines = (file, errors) => errors.map((e) => `${file}:${e.line}  ${e.type}  ${e.message}\n`).join("");
// src/cli.ts
const ac = new AbortController();
process.once("SIGINT", () => ac.abort());
process.exitCode = await run(process.argv.slice(2), {
	stdout: (s) => process.stdout.write(s),
	stderr: (s) => process.stderr.write(s),
	cwd: process.cwd(),
	signal: ac.signal
});
export {};
