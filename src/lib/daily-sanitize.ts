/**
 * daily-sanitize — prepare a standalone daily-review HTML document for clean
 * embedding inside the Spanda app shell (F5 / iteration 2.2).
 *
 * The daily is a full HTML page with its OWN chrome (a `spanda` lockup, a top
 * nav, a footer) and its OWN `<style>` block. Inlining it naively gave three
 * stacked top bars and let the daily's global CSS (`body`, `.wrap`, `.card`)
 * clash with the app. This module:
 *   1. strips the daily's standalone chrome (header / nav / footer),
 *   2. lifts its `<style>` out and SCOPES every rule under `.daily-content`,
 * so the result drops into one app bar and styles only itself.
 *
 * Pure (no DOM, no fs). The CSS scoper is brace-depth aware so nested `@media`
 * blocks scope correctly.
 */

const CHROME_TAGS = ["header", "nav", "footer"] as const;

/** Remove the daily's own page chrome (lockup/nav/footer) — keep the content. */
export function stripDailyChrome(html: string): string {
  let out = html;
  for (const tag of CHROME_TAGS) {
    out = out.replace(
      new RegExp(`<${tag}[\\s\\S]*?<\\/${tag}>`, "gi"),
      "",
    );
  }
  return out;
}

function prefixSelectorList(selectorList: string, scope: string): string {
  return selectorList
    .split(",")
    .map((sel) => {
      const s = sel.trim();
      if (!s) return s;
      // Map document-level selectors onto the scope container itself so the
      // daily's `body{...}` / `:root{...}` don't leak to the whole app.
      if (/^(html|body|:root)\b/i.test(s)) {
        return scope + s.replace(/^(html|body|:root)/i, "");
      }
      if (s === "*") return `${scope} *`;
      return `${scope} ${s}`;
    })
    .join(", ");
}

/** Prefix every rule's selectors with `scope`; recurse into @media/@supports. */
export function scopeCss(css: string, scope: string): string {
  const stripped = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const out: string[] = [];
  let i = 0;
  while (i < stripped.length) {
    const open = stripped.indexOf("{", i);
    if (open === -1) break;
    const prelude = stripped.slice(i, open).trim();
    let depth = 1;
    let j = open + 1;
    while (j < stripped.length && depth > 0) {
      if (stripped[j] === "{") depth += 1;
      else if (stripped[j] === "}") depth -= 1;
      j += 1;
    }
    const body = stripped.slice(open + 1, j - 1);
    if (prelude.startsWith("@")) {
      if (/^@(media|supports|document)/i.test(prelude)) {
        out.push(`${prelude} { ${scopeCss(body, scope)} }`);
      } else {
        // @keyframes / @font-face / @import — selectors aren't scopeable.
        out.push(`${prelude} { ${body} }`);
      }
    } else if (prelude.length > 0) {
      out.push(`${prefixSelectorList(prelude, scope)} { ${body} }`);
    }
    i = j;
  }
  return out.join("\n");
}

export interface SanitizedDaily {
  /** Body content with the daily's chrome + <style> removed. */
  content: string;
  /** The daily's CSS, scoped under the given container class. */
  css: string;
}

/**
 * Turn a full daily HTML document into `{ content, css }` ready to drop into
 * `<div class="daily-content">`. `scope` defaults to `.daily-content`.
 */
export function sanitizeDaily(
  html: string,
  scope = ".daily-content",
): SanitizedDaily {
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  const bodyInner = bodyMatch ? bodyMatch[1] : html;
  const rawCss = Array.from(
    html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi),
  )
    .map((m) => m[1])
    .join("\n");
  const bodyNoStyle = bodyInner.replace(
    /<style[^>]*>[\s\S]*?<\/style>/gi,
    "",
  );
  return {
    content: stripDailyChrome(bodyNoStyle).trim(),
    css: scopeCss(rawCss, scope),
  };
}
