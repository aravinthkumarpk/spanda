/**
 * daily-sanitize — prepare a standalone daily-review HTML document for clean
 * embedding inside the Spanda app shell (F5 / iteration 2.2).
 *
 * The daily is a full HTML page with its OWN chrome (the `spanda` lockup +
 * "Open setlist" / "Take a beat" top bar, and a page footer) plus its OWN
 * `<style>` block. Inlining it naively gave stacked top bars and let the
 * daily's global CSS (`body`, `.wrap`, `.card`) clash with the app. This module:
 *   1. strips the daily's standalone chrome wrappers (`div.topbar`,
 *      `footer.foot`) — and ONLY those,
 *   2. lifts its `<style>` out and SCOPES every rule under `.daily-content`,
 * so the result drops into one app bar and styles only itself.
 *
 * Why strip by specific wrapper, not by tag: the daily uses `<header>` for its
 * section TITLES (`header.lane-head` = REFLECT / PLAN / CLOSE) and `<footer>`
 * for per-section footers (`footer.lane-foot`). A blanket `header`/`footer`
 * strip eats that content while leaving the real chrome (a `<div>`). So we
 * target the chrome wrappers the daily pipeline emits and leave everything
 * else. Contract documented in ADR-0005; if the pipeline renames `.topbar` /
 * `footer.foot`, the chrome reappears (loud, visible) rather than silently
 * eating section content.
 *
 * Pure (no DOM, no fs). Both the element stripper and the CSS scoper are
 * depth-aware so nested `<div>`s / `@media` blocks are handled.
 */

/** True if the opening-tag string carries `cls` as a full class token. */
function hasClassToken(openTag: string, cls: string): boolean {
  const m = openTag.match(/class\s*=\s*["']([^"']*)["']/i);
  return m ? m[1].split(/\s+/).includes(cls) : false;
}

/**
 * Remove every `<tag class="...cls..."> … </tag>` block, matching the close by
 * tag depth so nested same-tag children don't end the block early.
 */
export function stripElement(
  html: string,
  tag: string,
  cls: string,
): string {
  const openRe = new RegExp(`<${tag}\\b[^>]*>`, "gi");
  const tagRe = new RegExp(`<(/?)${tag}\\b[^>]*>`, "gi");
  let result = html;
  for (;;) {
    openRe.lastIndex = 0;
    let start = -1;
    let m: RegExpExecArray | null;
    while ((m = openRe.exec(result)) !== null) {
      if (hasClassToken(m[0], cls)) {
        start = m.index;
        break;
      }
    }
    if (start === -1) break;
    tagRe.lastIndex = start;
    let depth = 0;
    let end = -1;
    let t: RegExpExecArray | null;
    while ((t = tagRe.exec(result)) !== null) {
      depth += t[1] === "/" ? -1 : 1;
      if (depth === 0) {
        end = tagRe.lastIndex;
        break;
      }
    }
    if (end === -1) break; // unbalanced — bail rather than over-cut
    result = result.slice(0, start) + result.slice(end);
  }
  return result;
}

/**
 * Remove the daily's standalone chrome (`div.topbar` + page `footer.foot`),
 * keeping section content (`header.lane-head`, `footer.lane-foot`).
 */
export function stripDailyChrome(html: string): string {
  return stripElement(stripElement(html, "div", "topbar"), "footer", "foot");
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
  /** Body content with the daily's chrome wrappers + <style> removed. */
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
