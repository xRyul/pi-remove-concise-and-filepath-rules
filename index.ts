import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

/**
 * pi-remove-concise-and-filepath-rules
 *
 * - Removes Pi's built-in "Be concise in your responses" and "Show file paths clearly when
 *   working with files" rules while keeping every other rule. Overrides only the `rules`
 *   section, so Pi keeps sending per-section prompt updates.
 * - On `openai-codex` models, raises the Responses API `text.verbosity` from Pi's default
 *   `low` to `medium`.
 */
const REMOVED_RULES = new Set([
	"- Be concise in your responses",
	"- Show file paths clearly when working with files",
]);

const strip = (text: string) =>
	text
		.split("\n")
		.filter((line) => !REMOVED_RULES.has(line.trim()))
		.join("\n");

type JsonObject = Record<string, unknown>;

function isRecord(value: unknown): value is JsonObject {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

export default function (pi: ExtensionAPI) {
	pi.on("before_agent_start", async (event) => {
		const options = event.systemPromptOptions;
		const rules = event.systemPrompt.match(/<rules>\n([\s\S]*?)\n<\/rules>/);
		if (rules) options.sections.rules = strip(rules[1]);
		// Another extension may have forced the whole prompt; strip the rule there too.
		if (options.forceSystemPrompt !== undefined) options.forceSystemPrompt = strip(options.forceSystemPrompt);
	});

	pi.on("before_provider_request", (event, ctx) => {
		if (ctx.model?.provider !== "openai-codex" || !isRecord(event.payload)) return undefined;
		const text = isRecord(event.payload.text) ? event.payload.text : {};
		if (text.verbosity !== undefined && text.verbosity !== "low") return undefined;
		return { ...event.payload, text: { ...text, verbosity: "medium" } };
	});
}
