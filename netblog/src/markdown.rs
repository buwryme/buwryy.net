use pulldown_cmark::{Options, Parser, html};

pub fn render(body: &str, dark: bool) -> String {
    if body.trim().is_empty() {
        return document(
            "<p class=\"empty\">Nothing to preview yet. Start writing on the left.</p>",
            dark,
        );
    }

    let mut options = Options::empty();
    options.insert(Options::ENABLE_TABLES);
    options.insert(Options::ENABLE_STRIKETHROUGH);
    options.insert(Options::ENABLE_TASKLISTS);
    options.insert(Options::ENABLE_FOOTNOTES);
    options.insert(Options::ENABLE_HEADING_ATTRIBUTES);

    let parser = Parser::new_ext(body, options);
    let mut rendered = String::new();
    html::push_html(&mut rendered, parser);

    let rendered = rendered
        .replace("src=\"/", "src=\"https://buwryy.net/")
        .replace("href=\"/", "href=\"https://buwryy.net/");

    document(&rendered, dark)
}

fn document(body: &str, dark: bool) -> String {
    let (background, foreground, muted, border, panel, accent) = if dark {
        (
            "#131313", "#e2e2e2", "#a7a7a7", "#3b3b3b", "#1f1f1f", "#ffb3c7",
        )
    } else {
        (
            "#f9f9f9", "#1b1b1b", "#5f5f5f", "#d4d4d4", "#ffffff", "#b0448f",
        )
    };

    format!(
        r#"<!doctype html>
<html lang="en" class="{theme}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  :root {{
    color-scheme: {scheme};
    --bg: {background};
    --fg: {foreground};
    --muted: {muted};
    --border: {border};
    --panel: {panel};
    --accent: {accent};
  }}
  * {{ box-sizing: border-box; }}
  html, body {{ margin: 0; padding: 0; background: var(--bg); }}
  body {{
    color: var(--fg);
    font-family: "Google Sans Flex", "Roboto Flex", system-ui, -apple-system, sans-serif;
    font-size: 16px;
    line-height: 1.72;
    padding: 30px 32px 80px;
    max-width: 820px;
    margin: 0 auto;
    overflow-wrap: break-word;
  }}
  h1, h2, h3, h4, h5, h6 {{
    line-height: 1.2;
    letter-spacing: -0.02em;
    margin: 1.5em 0 0.55em;
  }}
  h1 {{ font-size: 2.15em; margin-top: 0; }}
  h2 {{ font-size: 1.55em; }}
  h3 {{ font-size: 1.25em; }}
  p, ul, ol, blockquote, pre, table {{ margin: 0 0 1.15em; }}
  a {{ color: var(--accent); text-underline-offset: 2px; }}
  strong {{ font-weight: 700; }}
  blockquote {{
    margin-left: 0;
    padding: 2px 0 2px 18px;
    border-left: 3px solid var(--accent);
    color: var(--muted);
  }}
  code {{
    font-family: "Google Sans Code", "Roboto Mono", ui-monospace, monospace;
    font-size: 0.88em;
    background: var(--panel);
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 0.12em 0.36em;
  }}
  pre {{
    background: var(--panel);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 18px 20px;
    overflow-x: auto;
    line-height: 1.55;
  }}
  pre code {{ background: none; border: 0; padding: 0; font-size: 0.86em; }}
  hr {{ border: 0; border-top: 1px solid var(--border); margin: 2em 0; }}
  img {{ max-width: 100%; height: auto; border-radius: 12px; display: block; margin: 1.4em 0; }}
  table {{ width: 100%; border-collapse: collapse; font-size: 0.95em; }}
  th, td {{ border-bottom: 1px solid var(--border); padding: 8px 10px; text-align: left; }}
  th {{ color: var(--muted); font-weight: 600; }}
  li {{ margin: 0.25em 0; }}
  input[type="checkbox"] {{ margin-right: 0.5em; }}
  .empty {{ color: var(--muted); font-style: italic; }}
</style>
</head>
<body>
{body}
</body>
</html>"#,
        theme = if dark { "dark" } else { "light" },
        scheme = if dark { "dark" } else { "light" },
    )
}
